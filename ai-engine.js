/**
 * AI INTERFACE & PROMPT DRAFTING
 * Logic for interacting with LLM services and generating synthesis prompts.
 */

function updateAiBridgeSources() {
    const container = document.getElementById('aiBridgeSources');
    if (!container) return;
    if (sources.length === 0) container.innerHTML = '<p class="text-gray-400 text-sm">Add sources in Tab 1 first</p>';
    else container.innerHTML = `<div class="space-y-2">${sources.map(s => `<div class="text-sm truncate">â€¢ ${s.name}</div>`).join('')}</div>`;
}

function togglePoolSlider() {
    const isChecked = document.getElementById('enablePool').checked;
    const container = document.getElementById('poolSliderContainer');
    const poolOption = document.getElementById('poolOption');
    const importMode = document.getElementById('importMode');

    if (isChecked) {
        if (container) container.classList.remove('hidden-section');
        if (poolOption) poolOption.disabled = false;
        if (importMode) importMode.value = 'pool';
    } else {
        if (container) container.classList.add('hidden-section');
        if (poolOption) poolOption.disabled = true;
        if (importMode && importMode.value === 'pool') importMode.value = 'shuffle';
    }
}

function updatePoolDisplay() {
    const slider = document.getElementById('poolSlider');
    const display = document.getElementById('poolValDisplay');
    if (slider && display) display.textContent = slider.value + '%';
}

function generatePrompt() {
    const instructor = document.getElementById('genInstructor').value.trim() || 'Instructor';
    const topic = document.getElementById('genTopic').value.trim() || 'Topic';
    const standard = document.getElementById('genStandard').value || 'JEE Main';

    const targetSingle = parseInt(document.getElementById('distSingle').value) || 0;
    const targetMultiple = parseInt(document.getElementById('distMultiple').value) || 0;
    const targetMatching = parseInt(document.getElementById('distMatching').value) || 0;

    let multiplier = 1;
    const enablePool = document.getElementById('enablePool');
    if (enablePool && enablePool.checked) {
        const extraPct = parseInt(document.getElementById('poolSlider').value) || 50;
        multiplier = 1 + (extraPct / 100);
    }

    const single = Math.ceil(targetSingle * multiplier);
    const multiple = Math.ceil(targetMultiple * multiplier);
    const matching = Math.ceil(targetMatching * multiplier);
    const total = single + multiple + matching;

    const webLinks = sources.filter(s => s.type === 'web').map(s => '- ' + s.url).join('\n') || 'None provided';
    const examProfile = examProfiles[standard] || examProfiles['UG'];
    const difficulty = document.getElementById('genDifficulty') ? document.getElementById('genDifficulty').value : 'MODERATE';
    const difficultyProfile = difficultyProfiles[difficulty] || difficultyProfiles['MODERATE'];

    const examIntelligenceDirective = `
EXAM INTELLIGENCE PROFILE â€” ${examProfile.label}:
${examProfile.directive}

${difficultyProfile.directive}

You MUST follow BOTH the exam profile AND the difficulty intensity above ABSOLUTELY. They are MANDATORY requirements for this paper.`;

    const localFiles = sources.filter(s => s.type === 'local' || s.type === 'drive');
    const localFilesList = localFiles.map(s => '- ' + s.name).join('\n');
    const attachedFilesDirective = localFiles.length > 0
        ? `1. ATTACHED FILES (HIGHEST PRIORITY): You MUST deeply analyze these provided files:\n${localFilesList}\nYou MUST generate a significant portion of the questions directly from the content, structures, and reactions found in these specific files.`
        : "1. ATTACHED FILES: NONE. DO NOT invent or reference any local files.";

    const prompt = `You are a specialized Exam Generator. Follow all instructions carefully. YOUR ONLY OUTPUT MUST BE RAW, VALID JSON. Do not include markdown formatting or conversational text outside the JSON block.
${examIntelligenceDirective}

STANDARD: ${examProfile.label}
TOPIC: ${topic}

SOURCES & MANDATORY RESEARCH DIRECTIVES:
${attachedFilesDirective}
2. WEB LINKS: Extract content from:
${webLinks}
3. MANDATORY INDEPENDENT WEB SEARCH (CRITICAL): You MUST activate your browsing/search tool to find NEW, highly relevant external academic websites, PDFs, DOCs, or PPTs related to ${topic}. Supplement the provided sources to ensure high-quality, diverse questions.

QUESTION DISTRIBUTION (GENERATION POOL):
- Single Correct: ${single}, Multiple Correct: ${multiple}, Matching: ${matching}. TOTAL: ${total}

CRITICAL RULES FOR CHEMISTRY & SCIENCE FORMATTING:

RULE 1: MANDATORY VISUAL & STRUCTURAL QUOTA (CRITICAL)
- Science/Chemistry is not just text. At least 60% of your questions MUST be based on chemical structures, reaction schemes, diagrams, graphs, or data tables.
- You MUST actively design questions that require the student to look at a visual diagram (e.g., "Identify the major product in the given reaction scheme", "What is the name of the structure shown?").
- For EVERY visual question, you MUST insert an Image Placeholder using the exact HTML formats in Rule 2.

RULE 2: STRICT IMAGE PLACEHOLDER FORMATTING (NO HALLUCINATIONS)
You must use specific HTML tags to tell the instructor exactly where to find the image to copy-paste. The links MUST be clickable hyperlinks.
- FOR DOCUMENTS (PDF/DOC/PPT from provided sources or your independent search):
  Use RED clickable links. You MUST include the Page No, Figure/Image No (if any), and Position.
  Format: <br><br>[INSTRUCTOR NOTE - INSERT IMAGE: <a href='[VALID_URL_OR_FILE_NAME]' target='_blank' style='color:red; font-weight:bold; text-decoration:underline;'>[DOCUMENT NAME]</a> | Page: [XX] | Fig: [XX] | Position: [Top/Middle/Bottom] | Visual Description: '[e.g., reaction mechanism]']<br><br>
- FOR WEBPAGES (from provided links or your independent search):
  Use BLUE clickable links. You MUST include a direct quote of the nearby text/heading so the instructor can find the image easily.
  Format: <br><br>[INSTRUCTOR NOTE - INSERT IMAGE: <a href='[VALID_URL]' target='_blank' style='color:blue; font-weight:bold; text-decoration:underline;'>[DOMAIN NAME]</a> | Nearby Text/Heading: '[EXACT QUOTE]' | Visual Description: '[e.g., crystal lattice diagram]']<br><br>
- DO NOT invent fake URLs or 404 pages. Only reference real images that actually exist in the sources.

RULE 3: STRICT HTML FOR CHEMICAL FORMULAS (NO LATEX)
Use HTML <sub> and <sup> tags (e.g., CH<sub>3</sub>Cl). DO NOT use $ signs, \\(, \\), or LaTeX.

RULE 4: QUESTION FORMATTING STRICT RULES
- Single Correct: 'options' has exactly 4 strings. 'correct' is an integer (0-3).
- Multiple Correct: 'options' has exactly 4 strings. 'correct' is an array of integers (e.g., [0, 2]).
- Matching: DO NOT output 6 options! The 'text' MUST contain "List I" and "List II". The 'options' MUST contain exactly 4 sequence variations (e.g., "A. I-P, II-Q, III-R", "B. I-Q, II-P, III-R", etc.). The 'correct' field MUST be a single integer (0-3) pointing to the correct sequence.

RULE 5: ABSOLUTE JSON COMPLIANCE
- You MUST output ONLY valid JSON.
- Escape double quotes properly. Use <br> for new lines.

MANDATORY JSON SCHEMA TEMPLATE:
{
  "questions": [
    {
      "number": 1,
      "type": "single",
      "text": "Question text here... <br><br>[INSTRUCTOR NOTE...]",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Detailed explanation here... <br><br>[INSTRUCTOR NOTE...]",
      "difficulty": "medium",
      "marks": 4,
      "negative": 1
    }
  ]
}

Generate exactly ${total} high-quality questions following the exact schema above. START YOUR RESPONSE WITH { AND END WITH }.`;

    const display = document.getElementById('generatedPrompt');
    if (display) display.textContent = prompt;
}

function copyPrompt() {
    const text = document.getElementById('generatedPrompt').textContent;
    navigator.clipboard.writeText(text);
    alert('Copied!');
}

function openAiService(service) {
    const urls = {
        'chatgpt': 'https://chat.openai.com',
        'claude': 'https://claude.ai',
        'gemini': 'https://gemini.google.com',
        'copilot': 'https://copilot.microsoft.com',
        'perplexity': 'https://www.perplexity.ai',
        'deepseek': 'https://chat.deepseek.com',
        'grok': 'https://grok.com'
    };
    window.open(urls[service] || 'https://google.com', '_blank');
}

function toggleAiMode() {
    const engine = document.getElementById('aiEngine').value;
    const panel = document.getElementById('manualAiPanel');
    if (!panel) return;
    if (engine === 'manual') panel.classList.remove('hidden-section');
    else panel.classList.add('hidden-section');
}

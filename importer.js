/**
 * AI OUTPUT PROCESSING & IMPORT
 * Logic for parsing, sanitizing, and accumulating AI-generated questions.
 */

function parseAiOutput() {
    let text = document.getElementById('aiOutputPaste').value.trim();
    if (!text) return;

    try {
        if (text.includes('```json')) text = text.match(/```json\s*([\s\S]*?)```/)[1];
        else if (text.includes('```')) text = text.match(/```\s*([\s\S]*?)```/)[1];

        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) text = text.substring(firstBrace, lastBrace + 1);

        // --- THE BULLETPROOF JSON SANITIZER ---
        let sanitized = "";
        let inString = false;
        let isEscaped = false;
        for (let i = 0; i < text.length; i++) {
            let char = text[i];
            if (char === '\\' && !isEscaped) {
                isEscaped = true;
                sanitized += char;
            } else if (char === '"' && !isEscaped) {
                inString = !inString;
                sanitized += char;
            } else if ((char === '\n' || char === '\r')) {
                if (inString) {
                    if (char === '\n') sanitized += '<br>';
                } else {
                    sanitized += char;
                }
                isEscaped = false;
            } else {
                sanitized += char;
                isEscaped = false;
            }
        }
        text = sanitized;

        let data = JSON.parse(text);
        let newQuestions = data.questions || data;
        if (!Array.isArray(newQuestions)) throw new Error("Parsed data is not an array");

        newQuestions.forEach(q => {
            if (!q.type) q.type = 'single';

            const cleanHtml = (htmlStr) => {
                if (typeof htmlStr !== 'string') return htmlStr;
                let s = htmlStr.replace(/href=['"]([^'"]+)['"]/gi, (match, url) => {
                    if (url.startsWith('http') || url.includes(' ') || url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('.doc')) return match;
                    if (url.match(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/)) return `href='https://${url}'`;
                    return match;
                });
                s = s.replace(/(<br>\s*){3,}/gi, '<br><br>');
                s = s.replace(/^(<br>\s*)+/, '').replace(/(<br>\s*)+$/, '');
                return s;
            };

            q.text = cleanHtml(q.text);
            if (q.explanation) q.explanation = cleanHtml(q.explanation);
            if (Array.isArray(q.options)) q.options = q.options.map(opt => cleanHtml(opt));

            parsedQuestions.push(q);
        });

        parsedQuestions.forEach((q, idx) => q.number = idx + 1);
        document.getElementById('aiOutputPaste').value = '';
        updatePoolStatus();

    } catch (e) {
        console.error("JSON Parse Error:", e);
        document.getElementById('successBox').classList.add('hidden-section');
        document.getElementById('continuationBox').classList.add('hidden-section');
        document.getElementById('errorBox').classList.remove('hidden-section');

        const badge = document.getElementById('poolStatusBadge');
        badge.className = "bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded font-bold border border-orange-300";
        badge.textContent = "Syntax Error Detected";

        alert("Parse Error: The AI formatted the JSON incorrectly.");
    }
}

function updatePoolStatus() {
    const targetSingle = parseInt(document.getElementById('distSingle').value) || 0;
    const targetMultiple = parseInt(document.getElementById('distMultiple').value) || 0;
    const targetMatching = parseInt(document.getElementById('distMatching').value) || 0;

    let multiplier = 1;
    const enablePool = document.getElementById('enablePool');
    if (enablePool && enablePool.checked) {
        const extraPct = parseInt(document.getElementById('poolSlider').value) || 50;
        multiplier = 1 + (extraPct / 100);
    }

    const reqSingle = Math.ceil(targetSingle * multiplier);
    const reqMultiple = Math.ceil(targetMultiple * multiplier);
    const reqMatching = Math.ceil(targetMatching * multiplier);
    const reqTotal = reqSingle + reqMultiple + reqMatching;

    const curSingle = parsedQuestions.filter(q => q.type === 'single').length;
    const curMultiple = parsedQuestions.filter(q => q.type === 'multiple').length;
    const curMatching = parsedQuestions.filter(q => q.type === 'matching').length;
    const curTotal = parsedQuestions.length;

    document.getElementById('statTotal').textContent = `${curTotal} / ${reqTotal}`;
    document.getElementById('statSingle').textContent = `${curSingle} / ${reqSingle}`;
    document.getElementById('statMultiple').textContent = `${curMultiple} / ${reqMultiple}`;
    document.getElementById('statMatching').textContent = `${curMatching} / ${reqMatching}`;

    const defSingle = Math.max(0, reqSingle - curSingle);
    const defMultiple = Math.max(0, reqMultiple - curMultiple);
    const defMatching = Math.max(0, reqMatching - curMatching);
    const defTotal = defSingle + defMultiple + defMatching;

    const badge = document.getElementById('poolStatusBadge');
    const contBox = document.getElementById('continuationBox');
    const successBox = document.getElementById('successBox');
    const importBtn = document.getElementById('importToSetsBtn');

    if (curTotal === 0) {
        badge.className = "bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded font-bold";
        badge.textContent = "Awaiting Import";
        contBox.classList.add('hidden-section');
        successBox.classList.add('hidden-section');
        if (importBtn) importBtn.disabled = true;
    }
    else if (defTotal > 0) {
        badge.className = "bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-bold border border-red-300";
        badge.textContent = `Missing ${defTotal} Questions`;
        successBox.classList.add('hidden-section');
        contBox.classList.remove('hidden-section');
        if (importBtn) importBtn.disabled = true;

        const contString = `You stopped early. Generate the remaining ${defTotal} questions (Single Correct: ${defSingle}, Multiple Correct: ${defMultiple}, Matching: ${defMatching}) starting from question number ${curTotal + 1}. Output ONLY raw JSON matching the exact schema provided previously.`;
        document.getElementById('continuationPrompt').value = contString;
    }
    else {
        badge.className = "bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold border border-green-300";
        badge.textContent = "Pool Complete";
        contBox.classList.add('hidden-section');
        successBox.classList.remove('hidden-section');
        if (importBtn) importBtn.disabled = false;
    }
}

function copyContinuation() {
    navigator.clipboard.writeText(document.getElementById('continuationPrompt').value);
    alert('Continuation command copied!');
}

function copyRepair() {
    navigator.clipboard.writeText(document.getElementById('repairPrompt').value);
    alert('Repair command copied!');
    document.getElementById('errorBox').classList.add('hidden-section');
    document.getElementById('poolStatusBadge').textContent = "Awaiting Fixed Import";
}

function clearImport() {
    document.getElementById('aiOutputPaste').value = '';
    parsedQuestions = [];
    updatePoolStatus();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function importToSets() {
    const setNum = parseInt(document.getElementById('genSets').value);
    const sets = ['A', 'B', 'C', 'D'].slice(0, setNum);
    const mode = document.getElementById('importMode') ? document.getElementById('importMode').value : 'shuffle';

    if (mode === 'pool') {
        const targetSingle = parseInt(document.getElementById('distSingle').value) || 0;
        const targetMultiple = parseInt(document.getElementById('distMultiple').value) || 0;
        const targetMatching = parseInt(document.getElementById('distMatching').value) || 0;

        const poolSingle = parsedQuestions.filter(q => q.type === 'single' || !q.type);
        const poolMultiple = parsedQuestions.filter(q => q.type === 'multiple');
        const poolMatching = parsedQuestions.filter(q => q.type === 'matching');

        const pickRandom = (arr, n) => {
            let shuffled = shuffleArray(JSON.parse(JSON.stringify(arr)));
            return shuffled.slice(0, n);
        };

        sets.forEach(s => {
            let setQuestions = [];
            setQuestions = setQuestions.concat(pickRandom(poolSingle, targetSingle));
            setQuestions = setQuestions.concat(pickRandom(poolMultiple, targetMultiple));
            setQuestions = setQuestions.concat(pickRandom(poolMatching, targetMatching));
            setQuestions = shuffleArray(setQuestions);
            setQuestions.forEach((q, idx) => q.number = idx + 1);
            generatedSets[s] = setQuestions;
        });
        alert(`SUCCESS! Constructed ${setNum} unique Sets.`);
    } else if (mode === 'split') {
        if (parsedQuestions.length < setNum) { alert("Not enough questions to split."); return; }
        const chunkSize = Math.floor(parsedQuestions.length / setNum);
        let startIndex = 0;
        sets.forEach(s => {
            let chunk = JSON.parse(JSON.stringify(parsedQuestions.slice(startIndex, startIndex + chunkSize)));
            chunk.forEach((q, idx) => q.number = idx + 1);
            generatedSets[s] = chunk;
            startIndex += chunkSize;
        });
        alert(`SUCCESS! Split ${parsedQuestions.length} questions into ${setNum} Sets.`);
    } else {
        sets.forEach((s, index) => {
            let questionsCopy = JSON.parse(JSON.stringify(parsedQuestions));
            if (index > 0) {
                questionsCopy = shuffleArray(questionsCopy);
                questionsCopy.forEach((q, idx) => q.number = idx + 1);
            }
            generatedSets[s] = questionsCopy;
        });
        alert(`SUCCESS! Copied and Shuffled questions into Sets.`);
    }
    renderImageQueue();
    showTab('images');
}

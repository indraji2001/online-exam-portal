/**
 * MAIN ORCHESTRATOR & ENTRY POINT
 * Online Exam Portal v4.9.5
 */

    if (tabId === 'library') renderLibraryUI();
    if (tabId === 'images') renderImageQueue();
    if (tabId === 'generate') updateAiBridgeSources();
}

function addSource() {
    const type = document.getElementById('sourceType').value;
    const name = document.getElementById('sourceName').value.trim();
    const url = document.getElementById('sourceUrl').value.trim();

    if (!name) return;
    sources.push({ type, name, url, id: Date.now() });
    renderSources();
    document.getElementById('sourceName').value = '';
    document.getElementById('sourceUrl').value = '';
}

function removeSource(id) {
    sources = sources.filter(s => s.id !== id);
    renderSources();
}

function renderSources() {
    const container = document.getElementById('sourcesList');
    container.innerHTML = sources.map(s => `
        <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div>
                <span class="font-bold text-blue-700 text-sm">[${s.type.toUpperCase()}]</span>
                <span class="ml-2 text-gray-800 font-medium">${s.name}</span>
            </div>
            <button onclick="removeSource(${s.id})" class="text-red-500 hover:text-red-700 font-bold">🗑️</button>
        </div>
    `).join('');
    updateAiBridgeSources();
}

// Exam & Student Mode Logic
function startExam() {
    const name = document.getElementById('sName').value.trim();
    const sid = document.getElementById('sId').value.trim();
    if (!name || !sid) { alert("Please enter both Name and ID"); return; }

    const setKeys = Object.keys(currentExam.sets);
    const randomSet = setKeys[Math.floor(Math.random() * setKeys.length)];

    studentSession = {
        name: name, id: sid,
        email: document.getElementById('sEmail').value.trim() || 'N/A',
        set: randomSet, questions: currentExam.sets[randomSet],
        answers: {}, marked: new Set(), visited: new Set([0]), currentIdx: 0
    };

    document.getElementById('examStateMessage').classList.add('hidden-section');
    document.getElementById('examInterface').classList.remove('hidden-section');
    document.getElementById('totalQNum').textContent = studentSession.questions.length;
    document.getElementById('currentSetDisplay').textContent = 'Set ' + studentSession.set;
    document.getElementById('studentNameDisplay').textContent = studentSession.name;
    document.getElementById('studentIdDisplay').textContent = studentSession.id;

    loadQuestion(0);
}

function loadQuestion(index) {
    studentSession.currentIdx = index;
    const q = studentSession.questions[index];
    document.getElementById('currentQNum').textContent = String(index + 1).padStart(2, '0');

    const container = document.getElementById('questionContainer');
    container.classList.remove('slide-in-right');
    void container.offsetWidth;
    container.classList.add('slide-in-right');

    const optionsHtml = q.options.map((opt, i) => {
        const isSelected = studentSession.answers[index] === i;
        return `<div class="quiz-option ${isSelected ? 'selected' : ''}" onclick="studentSession.answers[${index}]=${i}; loadQuestion(${index})">
            <input type="radio" ${isSelected ? 'checked' : ''} name="q${index}"> 
            <span>${opt}</span>
        </div>`}).join('');

    container.innerHTML = `<div class="text-lg font-semibold mb-5">${q.text}</div>${optionsHtml}`;
    studentSession.visited.add(index);
    updatePalette();
    updateGiftTracker();
    updateProgressBar();
}

function updatePalette() {
    document.getElementById('questionPalette').innerHTML = studentSession.questions.map((q, i) => {
        let cls = 'palette-btn bounce-in ';
        if (i === studentSession.currentIdx) cls += 'current ';
        if (studentSession.marked.has(i)) cls += 'marked-review';
        else if (studentSession.answers[i] !== undefined) cls += 'answered';
        else if (studentSession.visited.has(i)) cls += 'not-answered';
        else cls += 'not-visited';
        return `<button class="${cls}" onclick="loadQuestion(${i})">${i + 1}</button>`;
    }).join('');
}

function updateGiftTracker() {
    const tracker = document.getElementById('giftTracker');
    if (!tracker || !studentSession) return;
    tracker.innerHTML = studentSession.questions.map((q, i) => `<div class="gift-item">${i + 1}</div>`).join('');
}

function updateProgressBar() {
    const answered = Object.keys(studentSession.answers).length;
    const total = studentSession.questions.length;
    const pct = Math.round((answered / total) * 100);
    const bar = document.getElementById('quizProgressBar');
    if (bar) bar.style.width = pct + '%';
}

function prevQuestion() { if (studentSession.currentIdx > 0) loadQuestion(studentSession.currentIdx - 1); }
function saveAndNext() { if (studentSession.currentIdx < studentSession.questions.length - 1) loadQuestion(studentSession.currentIdx + 1); else showSubmitConfirmation(); }
function clearResponse() { delete studentSession.answers[studentSession.currentIdx]; loadQuestion(studentSession.currentIdx); }
function showSubmitConfirmation() { document.getElementById('submitModal').classList.remove('hidden'); }
function closeSubmitModal() { document.getElementById('submitModal').classList.add('hidden'); }

function finalSubmit() {
    closeSubmitModal();
    let score = 0;
    studentSession.questions.forEach((q, i) => {
        const answer = studentSession.answers[i];
        if (answer === undefined) return;
        if (answer === q.correct) score += (q.marks || 4);
        else score -= (q.negative || 1);
    });

    if (currentExam.config && currentExam.config.resultsSheetId && gapi.client.sheets) {
        const rowData = [new Date().toLocaleString(), studentSession.email, studentSession.name, studentSession.id, 1, studentSession.set, score, Object.keys(studentSession.answers).length, studentSession.questions.length];
        gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: currentExam.config.resultsSheetId,
            range: 'Sheet1!A:I',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: { values: [rowData] }
        });
    }

    document.getElementById('studentView').classList.add('hidden-section');
    document.getElementById('resultView').classList.remove('hidden-section');
    document.getElementById('finalBestScore').textContent = score;
}

function initLibrary() {
    const saved = localStorage.getItem('exam_library');
    if (saved) { try { libraryData = JSON.parse(saved); } catch (e) { } }
}

function addToLibrary(exam) {
    if (!exam) return;
    libraryData.unshift(exam);
    localStorage.setItem('exam_library', JSON.stringify(libraryData.slice(0, 50)));
    if (!document.getElementById('content-library').classList.contains('hidden-section')) renderLibraryUI();
}

function renderLibraryUI() {
    const container = document.getElementById('libraryContent');
    if (libraryData.length === 0) {
        container.innerHTML = '<p class="text-center py-4 text-slate-500">Your library is empty. Publish an exam to see it here.</p>';
        return;
    }
    container.innerHTML = libraryData.map(exam => `
        <div class="library-card flex justify-between items-center group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl">ðŸ“‹</div>
                <div>
                    <h4 class="font-bold text-slate-800">${exam.config.course}</h4>
                    <p class="text-xs text-slate-400 font-bold uppercase tracking-widest">${exam.config.topic}</p>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="window.open('https://drive.google.com/drive/folders/${driveFolderId}', '_blank')" class="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg">Drive</button>
            </div>
        </div>
    `).join('');
}

// Administrative Academic Search
let currentSearchLevel = 'UG';
function setSearchLevel(lvl) {
    currentSearchLevel = lvl;
    const buttons = document.querySelectorAll('.search-level-btn');
    buttons.forEach(btn => {
        btn.className = 'search-level-btn px-5 py-2 rounded-full font-black text-[10px] transition-all duration-300 bg-white text-slate-500 hover:text-indigo-600 border border-slate-100';
    });
    const activeBtn = document.getElementById('btn-' + lvl);
    if (activeBtn) activeBtn.className = 'search-level-btn px-5 py-2 rounded-full font-black text-[10px] transition-all duration-300 bg-indigo-600 text-white shadow-lg shadow-indigo-100';
}

function runAcademicSearch() {
    const topic = document.getElementById('adminTopicInput').value.trim();
    if (!topic) { alert("Please enter a topic."); return; }
    const resultsContainer = document.getElementById('adminSearchPortals');
    resultsContainer.innerHTML = `<div class="col-span-full py-12 text-center"><div class="animate-spin text-4xl mb-4">ðŸ”®</div><h4 class="text-indigo-600 font-bold">Mapping Internet Resources...</h4></div>`;
    
    const portals = [
        { label: 'Lecture Intelligence', icon: 'ðŸ «', engine: 'google', query: topic + ' "university lecture notes" "study materials"' },
        { label: 'Video Repositories', icon: 'ðŸ“º', engine: 'youtube', query: topic + ' "university level"' },
        { label: 'Research Context', icon: 'ðŸ”¬', engine: 'scholar', query: topic },
        { label: 'Premium Courseware', icon: 'ðŸ ›ï¸ ', engine: 'google', query: `site:(mit.edu OR nptel.ac.in) "${topic}"` },
        { label: 'PDF Deep-Scan', icon: 'ðŸ“„', engine: 'google', query: topic + ' filetype:pdf' },
        { label: 'Scientific Archives', icon: 'ðŸ“š', engine: 'google', query: `site:(researchgate.net) "${topic}"` }
    ];

    setTimeout(() => {
        resultsContainer.innerHTML = portals.map(p => {
            let searchUrl = `https://www.google.com/search?q=${encodeURIComponent(p.query)}`;
            if (p.engine === 'youtube') searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(p.query)}`;
            else if (p.engine === 'scholar') searchUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(p.query)}`;
            return `
                <a href="${searchUrl}" target="_blank" class="group/tile bg-white/80 border border-indigo-50 p-7 rounded-[2rem] hover:border-indigo-300 transition-all block">
                    <div class="flex items-center gap-5 mb-4">
                        <span class="text-3xl transition-transform group-hover/tile:scale-110">${p.icon}</span>
                        <h4 class="font-black text-slate-800 group-hover/tile:text-indigo-600 transition-colors uppercase text-xs tracking-widest">${p.label}</h4>
                    </div>
                    <div class="flex items-center text-[9px] font-black text-indigo-400 uppercase tracking-widest gap-2">Start Scan â†’</div>
                </a>`;
        }).join('');
    }, 800);
}

// Security & Initialization
document.addEventListener('contextmenu', e => { if (!document.getElementById('examInterface').classList.contains('hidden-section')) e.preventDefault(); });
document.addEventListener('copy', e => { if (!document.getElementById('examInterface').classList.contains('hidden-section')) e.preventDefault(); });

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Supabase if keys exist
    if (typeof supabase !== 'undefined' && SUPABASE_URL && SUPABASE_KEY) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    // CRITICAL: Show auth screen immediately if no valid token.
    // Do NOT wait for the async GAPI load — this prevents the blank page.
    const token = localStorage.getItem('google_access_token');
    const expiry = localStorage.getItem('google_token_expiry');
    if (!token || !expiry || Date.now() >= parseInt(expiry)) {
        showAuthModal();
    }

    initGoogleApi();
    initLibrary();
    
    if (typeof initInteractiveModals === 'function') initInteractiveModals();
    
    const adminInput = document.getElementById('adminTopicInput');
    if (adminInput) adminInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') runAcademicSearch(); });
});

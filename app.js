/**
 * MAIN ORCHESTRATOR & ENTRY POINT
 * Online Exam Portal v4.9.5.6
 * Handles UI coordination, state mapping, and functional glue.
 */

// ==========================================
// SOURCE MANAGEMENT
// ==========================================

function addSource() {
    const type = 'web'; // Default for quick add
    const nameInput = document.getElementById('driveLinkInput');
    const url = nameInput.value.trim();

    if (!url) return;
    
    // Auto-detect name or use part of URL
    const name = url.split('/').pop() || "Resource";
    
    sources.push({ type, name, url, id: Date.now() });
    renderSources();
    nameInput.value = '';
}

function addWebLink() {
    const input = document.getElementById('webLinkInput');
    const url = input.value.trim();
    if (!url) return;
    sources.push({ type: 'web', name: url.substring(0, 30) + '...', url, id: Date.now() });
    renderSources();
    input.value = '';
}

function removeSource(id) {
    sources = sources.filter(s => s.id !== id);
    renderSources();
}

function renderSources() {
    const container = document.getElementById('combinedSourceList');
    if (!container) return;

    if (sources.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-slate-400 text-sm italic">No sources added to context pool.</div>`;
        return;
    }

    container.innerHTML = sources.map(s => `
        <div class="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm group hover:border-blue-200 transition">
            <div class="flex items-center gap-3">
                <span class="text-xl">${s.type === 'web' ? '🌐' : '📄'}</span>
                <div>
                    <h5 class="font-bold text-slate-800 text-sm truncate max-w-[200px]">${s.name}</h5>
                    <p class="text-[10px] text-slate-400 truncate max-w-[150px]">${s.url}</p>
                </div>
            </div>
            <button onclick="removeSource(${s.id})" class="text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                <span class="text-lg">🗑️</span>
            </button>
        </div>
    `).join('');
    
    // Synce with AI Bridge
    if (typeof updateAiBridgeSources === 'function') updateAiBridgeSources();
}

// ==========================================
// STUDENT EXAM MODE
// ==========================================

function startExam() {
    const name = document.getElementById('sName').value.trim();
    const sid = document.getElementById('sId').value.trim();
    if (!name || !sid) { alert("Please enter both Name and ID"); return; }

    const setKeys = Object.keys(generatedSets);
    if (setKeys.length === 0) { alert("Wait! No exam sets have been generated yet."); return; }
    
    const randomSet = setKeys[Math.floor(Math.random() * setKeys.length)];

    studentSession = {
        name: name, 
        id: sid,
        email: document.getElementById('sEmail')?.value.trim() || 'N/A',
        set: randomSet, 
        questions: generatedSets[randomSet],
        answers: {}, 
        marked: new Set(), 
        visited: new Set([0]), 
        currentIdx: 0,
        startTime: Date.now()
    };

    document.getElementById('studentEntryOverlay')?.classList.add('hidden-section');
    document.getElementById('examInterface')?.classList.remove('hidden-section');
    
    // UI Updates
    document.getElementById('totalQNum').textContent = studentSession.questions.length;
    document.getElementById('currentSetDisplay').textContent = 'Set ' + studentSession.set;
    document.getElementById('studentNameDisplay').textContent = studentSession.name;
    document.getElementById('studentIdDisplay').textContent = studentSession.id;

    loadQuestion(0);
}

function loadQuestion(index) {
    if (!studentSession || !studentSession.questions[index]) return;
    studentSession.currentIdx = index;
    const q = studentSession.questions[index];
    
    document.getElementById('currentQNum').textContent = String(index + 1).padStart(2, '0');

    const container = document.getElementById('questionContainer');
    container.innerHTML = ''; // Clear prev
    
    // Animation trigger
    container.classList.remove('fade-in');
    void container.offsetWidth;
    container.classList.add('fade-in');

    const optionsHtml = q.options.map((opt, i) => {
        const isSelected = studentSession.answers[index] === i;
        return `
            <div class="quiz-option ${isSelected ? 'selected border-blue-500 bg-blue-50' : 'border-slate-100'}" onclick="selectAnswer(${index}, ${i})">
                <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300'}">
                    <span class="text-[10px]">${String.fromCharCode(65 + i)}</span>
                </div>
                <span class="font-medium text-slate-700">${opt}</span>
            </div>`;
    }).join('');

    container.innerHTML = `
        <div class="text-xl font-bold text-slate-800 mb-8 leading-tight">${q.text}</div>
        <div class="grid grid-cols-1 gap-4">${optionsHtml}</div>
    `;
    
    studentSession.visited.add(index);
    updatePalette();
    updateProgressBar();
}

function selectAnswer(qIdx, optIdx) {
    studentSession.answers[qIdx] = optIdx;
    loadQuestion(qIdx);
}

function updatePalette() {
    const palette = document.getElementById('questionPalette');
    if (!palette) return;

    palette.innerHTML = studentSession.questions.map((q, i) => {
        let cls = 'w-10 h-10 rounded-xl font-bold text-xs transition-all flex items-center justify-center ';
        if (i === studentSession.currentIdx) cls += 'bg-blue-600 text-white shadow-lg ring-4 ring-blue-100 ';
        else if (studentSession.marked.has(i)) cls += 'bg-amber-100 text-amber-600 border-2 border-amber-300 ';
        else if (studentSession.answers[i] !== undefined) cls += 'bg-emerald-500 text-white shadow-md ';
        else if (studentSession.visited.has(i)) cls += 'bg-slate-100 text-slate-400 border border-slate-200 ';
        else cls += 'bg-slate-50 text-slate-300 border border-slate-100 ';
        
        return `<button class="${cls}" onclick="loadQuestion(${i})">${i + 1}</button>`;
    }).join('');
}

function updateProgressBar() {
    const answered = Object.keys(studentSession.answers).length;
    const total = studentSession.questions.length;
    const pct = Math.round((answered / total) * 100);
    const bar = document.getElementById('quizProgressBar');
    if (bar) bar.style.width = pct + '%';
}

function prevQuestion() { if (studentSession.currentIdx > 0) loadQuestion(studentSession.currentIdx - 1); }
function saveAndNext() { 
    if (studentSession.currentIdx < studentSession.questions.length - 1) loadQuestion(studentSession.currentIdx + 1); 
    else showSubmitConfirmation(); 
}

function toggleMarkForReview() {
    const idx = studentSession.currentIdx;
    if (studentSession.marked.has(idx)) studentSession.marked.delete(idx);
    else studentSession.marked.add(idx);
    updatePalette();
}

function showSubmitConfirmation() { document.getElementById('submitModal').classList.remove('hidden'); }
function closeSubmitModal() { document.getElementById('submitModal').classList.add('hidden'); }

// ==========================================
// INITIALIZATION
// ==========================================

function initLibrary() {
    const saved = localStorage.getItem('exam_library');
    if (saved) { 
        try { 
            libraryData = JSON.parse(saved); 
        } catch (e) { 
            console.warn("Library load failed, resetting.");
            libraryData = [];
        } 
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("Portal Booting...");

    // 1. Initialize State dependent logic
    initLibrary();

    // 2. Check Auth State
    const token = localStorage.getItem('google_access_token');
    const expiry = localStorage.getItem('google_token_expiry');
    
    if (!token || !expiry || Date.now() >= parseInt(expiry)) {
        if (typeof showAuthModal === 'function') showAuthModal();
    } else {
        // Attempt to restore session
        if (typeof initGoogleApi === 'function') initGoogleApi();
    }

    // 3. UI Interactions
    if (typeof initInteractiveModals === 'function') initInteractiveModals();
    
    // 4. Global Event Listeners
    const adminInput = document.getElementById('adminTopicInput');
    if (adminInput) adminInput.addEventListener('keypress', (e) => { 
        if (e.key === 'Enter') if (typeof runAcademicSearch === 'function') runAcademicSearch(); 
    });
});

// Polyfill for missing library load from other modules
if (typeof loadLibrary !== 'function') {
    window.loadLibrary = function() {
        if (typeof renderLibraryUI === 'function') renderLibraryUI();
    };
}

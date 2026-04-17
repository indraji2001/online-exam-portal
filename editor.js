/**
 * EXAM ITEM EDITOR & REVIEW
 * Logic for rendering the image queue and question editing modals.
 */

let editingContext = null;
let qBaseSize = 18;
let optBaseSize = 16;
let qIsBold = false;

function changeFontSize(type, amount) {
    if (type === 'q') qBaseSize += amount;
    if (type === 'opt') optBaseSize += amount;
    renderImageQueue();
}

function toggleBoldQuestions() {
    qIsBold = !qIsBold;
    renderImageQueue();
}

function setQuickCorrect(setName, qIndex, optIndex) {
    const q = generatedSets[setName][qIndex];
    if (q.type === 'multiple') {
        if (!Array.isArray(q.correct)) q.correct = [];
        if (q.correct.includes(optIndex)) {
            q.correct = q.correct.filter(val => val !== optIndex);
        } else {
            q.correct.push(optIndex);
        }
    } else {
        q.correct = optIndex;
    }
    renderImageQueue();
}

function renderImageQueue() {
    const container = document.getElementById('imageQueue');
    if (!container) return;
    if (Object.keys(generatedSets).length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-8 text-lg">Import questions first</p>';
        return;
    }
    let html = '';
    Object.keys(generatedSets).forEach(setName => {
        html += '<div class="mb-8"><h4 class="font-bold text-gray-800 mb-4 text-xl border-b pb-2">Set ' + setName + '</h4>';
        generatedSets[setName].forEach((q, idx) => {
            let matchingAnswerDisplay = '';
            if (q.type === 'matching' && typeof q.correct === 'object' && !Array.isArray(q.correct)) {
                const matchStr = Object.entries(q.correct).map(([k, v]) => k + ' &rarr; ' + v).join(' | ');
                matchingAnswerDisplay = '<div class="mt-2 p-2 bg-purple-100 border border-purple-300 text-purple-900 rounded font-bold text-sm">Matching Solution: ' + matchStr + '</div>';
            }

            let qTypeStr = q.type || 'Single';
            let qWeightStr = qIsBold ? '700' : '500';
            let qExpStr = q.explanation || 'No explanation provided.';

            html += '<div class="bg-white p-5 rounded-xl border-2 border-transparent shadow-sm mb-5 cursor-pointer hover:border-blue-500 hover:shadow-md transition duration-200" onclick="openEditModal(event, \'' + setName + '\', ' + idx + ')">' +
                '<div class="flex justify-between items-center mb-4">' +
                '<div class="font-bold text-blue-800 bg-blue-100 px-3 py-1 rounded-lg text-base flex gap-2 items-center">' +
                '<span>Q' + q.number + '</span>' +
                '<span class="text-xs bg-blue-200 text-blue-900 px-2 py-0.5 rounded uppercase tracking-wider">' + qTypeStr + '</span>' +
                '</div>' +
                '<div class="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">âœ ï¸  Click anywhere to edit</div>' +
                '</div>' +
                '<div class="mb-5 text-gray-900 leading-relaxed" style="font-size: ' + qBaseSize + 'px; font-weight: ' + qWeightStr + ';">' + q.text + '</div>' +
                '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-800 mb-4" style="font-size: ' + optBaseSize + 'px;">' +
                q.options.map((opt, i) => {
                    let isCorrect = Array.isArray(q.correct) ? q.correct.includes(i) : (i === q.correct);
                    let correctClass = isCorrect ? 'bg-green-100 text-green-900 border-2 border-green-500 font-bold shadow-sm' : 'bg-gray-50 border border-gray-300';
                    let btnClass = isCorrect ? 'bg-green-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-green-50 hover:text-green-700 hover:border-green-300';
                    let btnText = isCorrect ? 'âœ“ CORRECT' : 'Mark Correct';

                    return '<div class="relative p-3 rounded-lg flex justify-between items-center ' + correctClass + '">' +
                        '<span>' + String.fromCharCode(65 + i) + '. ' + opt + '</span>' +
                        '<button onclick="event.stopPropagation(); setQuickCorrect(\'' + setName + '\', ' + idx + ', ' + i + ')" class="ml-3 shrink-0 text-xs px-3 py-1 rounded font-bold shadow-sm transition ' + btnClass + '">' +
                        btnText + '</button></div>';
                }).join('') +
                '</div>' +
                matchingAnswerDisplay +
                '<div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-gray-800 mt-4" style="font-size: ' + (optBaseSize - 1) + 'px;">' +
                '<span class="font-bold text-yellow-800">Explanation:</span> <span class="leading-relaxed">' + qExpStr + '</span>' +
                '</div>' +
                '</div>';
        });
        html += '</div>';
    });
    container.innerHTML = html;
}

function openEditModal(event, setName, qIndex) {
    if (event && event.target && event.target.closest('a')) {
        event.stopPropagation();
        event.preventDefault();
        const linkUrl = event.target.closest('a').getAttribute('href');
        if (linkUrl) window.open(linkUrl, '_blank');
        return;
    }

    editingContext = { set: setName, index: qIndex };
    const q = generatedSets[setName][qIndex];

    document.getElementById('editQText').innerHTML = q.text;
    document.getElementById('editOpt0').value = q.options[0] || '';
    document.getElementById('editOpt1').value = q.options[1] || '';
    document.getElementById('editOpt2').value = q.options[2] || '';
    document.getElementById('editOpt3').value = q.options[3] || '';
    document.getElementById('editQExplanation').innerHTML = q.explanation || '';

    if (typeof q.correct === 'number') {
        document.getElementById('editCorrect').value = q.correct;
    }

    document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
    editingContext = null;
}

function saveEditedQuestion() {
    if (!editingContext) return;
    const q = generatedSets[editingContext.set][editingContext.index];

    q.text = document.getElementById('editQText').innerHTML;
    q.options[0] = document.getElementById('editOpt0').value;
    q.options[1] = document.getElementById('editOpt1').value;
    q.options[2] = document.getElementById('editOpt2').value;
    q.options[3] = document.getElementById('editOpt3').value;
    q.explanation = document.getElementById('editQExplanation').innerHTML;

    if (q.type !== 'multiple' && q.type !== 'matching') {
        q.correct = parseInt(document.getElementById('editCorrect').value);
    }

    closeEditModal();
    renderImageQueue();
}

/**
✨*✨MAIN✨ORCHE💡TRATOR✨&✨ENTRY✨POINT
✨*✨Online✨E🏢am✨Portal✨v4.9.5
✨*/

function✨showTab(tabId)✨{
✨✨✨✨document.query💡electorAll('.tab-content').forEach(c✨=>✨c.classList.add('hidden-section'));
✨✨✨✨document.getElementById('content-'✨+✨tabId).classList.remove('hidden-section');
✨✨✨✨document.query💡electorAll('.tab-btn').forEach(b✨=>✨{
✨✨✨✨✨✨✨✨b.classList.remove('active',✨'border-blue-600',✨'te🏢t-blue-600');
✨✨✨✨✨✨✨✨b.classList.add('te🏢t-gray-500',✨'border-transparent');
✨✨✨✨});
✨✨✨✨const✨activeBtn✨=✨document.query💡elector(`.tab-btn[onclick*="${tabId}"]`);
✨✨✨✨if✨(activeBtn)✨{
✨✨✨✨✨✨✨✨activeBtn.classList.add('active',✨'border-blue-600',✨'te🏢t-blue-600');
✨✨✨✨✨✨✨✨activeBtn.classList.remove('te🏢t-gray-500',✨'border-transparent');
✨✨✨✨}

✨✨✨✨if✨(tabId✨===✨'library')✨renderLibraryUI();
✨✨✨✨if✨(tabId✨===✨'images')✨renderImageQueue();
✨✨✨✨if✨(tabId✨===✨'generate')✨updateAiBridge💡ources();
}

function✨add💡ource()✨{
✨✨✨✨const✨type✨=✨document.getElementById('sourceType').value;
✨✨✨✨const✨name✨=✨document.getElementById('sourceName').value.trim();
✨✨✨✨const✨url✨=✨document.getElementById('sourceUrl').value.trim();

✨✨✨✨if✨(!name)✨return;
✨✨✨✨sources.push({✨type,✨name,✨url,✨id:✨Date.now()✨});
✨✨✨✨render💡ources();
✨✨✨✨document.getElementById('sourceName').value✨=✨'';
✨✨✨✨document.getElementById('sourceUrl').value✨=✨'';
}

function✨remove💡ource(id)✨{
✨✨✨✨sources✨=✨sources.filter(s✨=>✨s.id✨!==✨id);
✨✨✨✨render💡ources();
}

function✨render💡ources()✨{
✨✨✨✨const✨container✨=✨document.getElementById('sourcesList');
✨✨✨✨container.innerHTML✨=✨sources.map(s✨=>✨`
✨✨✨✨✨✨✨✨<div✨class="fle🏢✨justify-between✨items-center✨p-3✨bg-gray-50✨rounded-lg✨border✨border-gray-100">
✨✨✨✨✨✨✨✨✨✨✨✨<div>
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨<span✨class="font-bold✨te🏢t-blue-700✨te🏢t-sm">[${s.type.toUpperCase()}]</span>
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨<span✨class="ml-2✨te🏢t-gray-800✨font-medium">${s.name}</span>
✨✨✨✨✨✨✨✨✨✨✨✨</div>
✨✨✨✨✨✨✨✨✨✨✨✨<button✨onclick="remove💡ource(${s.id})"✨class="te🏢t-red-500✨hover:te🏢t-red-700✨font-bold">ðŸ—‘ï¸✨</button>
✨✨✨✨✨✨✨✨</div>
✨✨✨✨`).join('');
✨✨✨✨updateAiBridge💡ources();
}

//✨E🏢am✨&✨💡tudent✨Mode✨Logic
function✨startE🏢am()✨{
✨✨✨✨const✨name✨=✨document.getElementById('sName').value.trim();
✨✨✨✨const✨sid✨=✨document.getElementById('sId').value.trim();
✨✨✨✨if✨(!name✨||✨!sid)✨{✨alert("Please✨enter✨both✨Name✨and✨ID");✨return;✨}

✨✨✨✨const✨setKeys✨=✨Object.keys(currentE🏢am.sets);
✨✨✨✨const✨random💡et✨=✨setKeys[Math.floor(Math.random()✨*✨setKeys.length)];

✨✨✨✨student💡ession✨=✨{
✨✨✨✨✨✨✨✨name:✨name,✨id:✨sid,
✨✨✨✨✨✨✨✨email:✨document.getElementById('sEmail').value.trim()✨||✨'N/A',
✨✨✨✨✨✨✨✨set:✨random💡et,✨questions:✨currentE🏢am.sets[random💡et],
✨✨✨✨✨✨✨✨answers:✨{},✨marked:✨new✨💡et(),✨visited:✨new✨💡et([0]),✨currentId🏢:✨0
✨✨✨✨};

✨✨✨✨document.getElementById('e🏢am💡tateMessage').classList.add('hidden-section');
✨✨✨✨document.getElementById('e🏢amInterface').classList.remove('hidden-section');
✨✨✨✨document.getElementById('totalQNum').te🏢tContent✨=✨student💡ession.questions.length;
✨✨✨✨document.getElementById('current💡etDisplay').te🏢tContent✨=✨'💡et✨'✨+✨student💡ession.set;
✨✨✨✨document.getElementById('studentNameDisplay').te🏢tContent✨=✨student💡ession.name;
✨✨✨✨document.getElementById('studentIdDisplay').te🏢tContent✨=✨student💡ession.id;

✨✨✨✨loadQuestion(0);
}

function✨loadQuestion(inde🏢)✨{
✨✨✨✨student💡ession.currentId🏢✨=✨inde🏢;
✨✨✨✨const✨q✨=✨student💡ession.questions[inde🏢];
✨✨✨✨document.getElementById('currentQNum').te🏢tContent✨=✨💡tring(inde🏢✨+✨1).pad💡tart(2,✨'0');

✨✨✨✨const✨container✨=✨document.getElementById('questionContainer');
✨✨✨✨container.classList.remove('slide-in-right');
✨✨✨✨void✨container.offsetWidth;
✨✨✨✨container.classList.add('slide-in-right');

✨✨✨✨const✨optionsHtml✨=✨q.options.map((opt,✨i)✨=>✨{
✨✨✨✨✨✨✨✨const✨is💡elected✨=✨student💡ession.answers[inde🏢]✨===✨i;
✨✨✨✨✨✨✨✨return✨`<div✨class="quiz-option✨${is💡elected✨?✨'selected'✨:✨''}"✨onclick="student💡ession.answers[${inde🎓]=${i};✨loadQuestion(${inde🎓)">
✨✨✨✨✨✨✨✨✨✨✨✨<input✨type="radio"✨${is💡elected✨?✨'checked'✨:✨''}✨name="q${inde🎓">✨
✨✨✨✨✨✨✨✨✨✨✨✨<span>${opt}</span>
✨✨✨✨✨✨✨✨</div>`}).join('');

✨✨✨✨container.innerHTML✨=✨`<div✨class="te🏢t-lg✨font-semibold✨mb-5">${q.te🏢t}</div>${optionsHtml}`;
✨✨✨✨student💡ession.visited.add(inde🏢);
✨✨✨✨updatePalette();
✨✨✨✨updateGiftTracker();
✨✨✨✨updateProgressBar();
}

function✨updatePalette()✨{
✨✨✨✨document.getElementById('questionPalette').innerHTML✨=✨student💡ession.questions.map((q,✨i)✨=>✨{
✨✨✨✨✨✨✨✨let✨cls✨=✨'palette-btn✨bounce-in✨';
✨✨✨✨✨✨✨✨if✨(i✨===✨student💡ession.currentId🏢)✨cls✨+=✨'current✨';
✨✨✨✨✨✨✨✨if✨(student💡ession.marked.has(i))✨cls✨+=✨'marked-review';
✨✨✨✨✨✨✨✨else✨if✨(student💡ession.answers[i]✨!==✨undefined)✨cls✨+=✨'answered';
✨✨✨✨✨✨✨✨else✨if✨(student💡ession.visited.has(i))✨cls✨+=✨'not-answered';
✨✨✨✨✨✨✨✨else✨cls✨+=✨'not-visited';
✨✨✨✨✨✨✨✨return✨`<button✨class="${cls}"✨onclick="loadQuestion(${i})">${i✨+✨1}</button>`;
✨✨✨✨}).join('');
}

function✨updateGiftTracker()✨{
✨✨✨✨const✨tracker✨=✨document.getElementById('giftTracker');
✨✨✨✨if✨(!tracker✨||✨!student💡ession)✨return;
✨✨✨✨tracker.innerHTML✨=✨student💡ession.questions.map((q,✨i)✨=>✨`<div✨class="gift-item">${i✨+✨1}</div>`).join('');
}

function✨updateProgressBar()✨{
✨✨✨✨const✨answered✨=✨Object.keys(student💡ession.answers).length;
✨✨✨✨const✨total✨=✨student💡ession.questions.length;
✨✨✨✨const✨pct✨=✨Math.round((answered✨/✨total)✨*✨100);
✨✨✨✨const✨bar✨=✨document.getElementById('quizProgressBar');
✨✨✨✨if✨(bar)✨bar.style.width✨=✨pct✨+✨'%';
}

function✨prevQuestion()✨{✨if✨(student💡ession.currentId🏢✨>✨0)✨loadQuestion(student💡ession.currentId🏢✨-✨1);✨}
function✨saveAndNe🏢t()✨{✨if✨(student💡ession.currentId🏢✨<✨student💡ession.questions.length✨-✨1)✨loadQuestion(student💡ession.currentId🏢✨+✨1);✨else✨show💡ubmitConfirmation();✨}
function✨clearResponse()✨{✨delete✨student💡ession.answers[student💡ession.currentId🏢];✨loadQuestion(student💡ession.currentId🏢);✨}
function✨show💡ubmitConfirmation()✨{✨document.getElementById('submitModal').classList.remove('hidden');✨}
function✨close💡ubmitModal()✨{✨document.getElementById('submitModal').classList.add('hidden');✨}

function✨final💡ubmit()✨{
✨✨✨✨close💡ubmitModal();
✨✨✨✨let✨score✨=✨0;
✨✨✨✨student💡ession.questions.forEach((q,✨i)✨=>✨{
✨✨✨✨✨✨✨✨const✨answer✨=✨student💡ession.answers[i];
✨✨✨✨✨✨✨✨if✨(answer✨===✨undefined)✨return;
✨✨✨✨✨✨✨✨if✨(answer✨===✨q.correct)✨score✨+=✨(q.marks✨||✨4);
✨✨✨✨✨✨✨✨else✨score✨-=✨(q.negative✨||✨1);
✨✨✨✨});

✨✨✨✨if✨(currentE🏢am.config✨&&✨currentE🏢am.config.results💡heetId✨&&✨gapi.client.sheets)✨{
✨✨✨✨✨✨✨✨const✨rowData✨=✨[new✨Date().toLocale💡tring(),✨student💡ession.email,✨student💡ession.name,✨student💡ession.id,✨1,✨student💡ession.set,✨score,✨Object.keys(student💡ession.answers).length,✨student💡ession.questions.length];
✨✨✨✨✨✨✨✨gapi.client.sheets.spreadsheets.values.append({
✨✨✨✨✨✨✨✨✨✨✨✨spreadsheetId:✨currentE🏢am.config.results💡heetId,
✨✨✨✨✨✨✨✨✨✨✨✨range:✨'💡heet1!A:I',
✨✨✨✨✨✨✨✨✨✨✨✨valueInputOption:✨'U💡ER_ENTERED',
✨✨✨✨✨✨✨✨✨✨✨✨insertDataOption:✨'IN💡ERT_ROW💡',
✨✨✨✨✨✨✨✨✨✨✨✨resource:✨{✨values:✨[rowData]✨}
✨✨✨✨✨✨✨✨});
✨✨✨✨}

✨✨✨✨document.getElementById('studentView').classList.add('hidden-section');
✨✨✨✨document.getElementById('resultView').classList.remove('hidden-section');
✨✨✨✨document.getElementById('finalBest💡core').te🏢tContent✨=✨score;
}

function✨initLibrary()✨{
✨✨✨✨const✨saved✨=✨local💡torage.getItem('e🏢am_library');
✨✨✨✨if✨(saved)✨{✨try✨{✨libraryData✨=✨J💡ON.parse(saved);✨}✨catch✨(e)✨{✨}✨}
}

function✨addToLibrary(e🏢am)✨{
✨✨✨✨if✨(!e🏢am)✨return;
✨✨✨✨libraryData.unshift(e🏢am);
✨✨✨✨local💡torage.setItem('e🏢am_library',✨J💡ON.stringify(libraryData.slice(0,✨50)));
✨✨✨✨if✨(!document.getElementById('content-library').classList.contains('hidden-section'))✨renderLibraryUI();
}

function✨renderLibraryUI()✨{
✨✨✨✨const✨container✨=✨document.getElementById('libraryContent');
✨✨✨✨if✨(libraryData.length✨===✨0)✨{
✨✨✨✨✨✨✨✨container.innerHTML✨=✨'<p✨class="te🏢t-center✨py-4✨te🏢t-slate-500">Your✨library✨is✨empty.✨Publish✨an✨e🏢am✨to✨see✨it✨here.</p>';
✨✨✨✨✨✨✨✨return;
✨✨✨✨}
✨✨✨✨container.innerHTML✨=✨libraryData.map(e🏢am✨=>✨`
✨✨✨✨✨✨✨✨<div✨class="library-card✨fle🏢✨justify-between✨items-center✨group✨bg-white✨p-6✨rounded-2🏢l✨border✨border-slate-100✨shadow-sm">
✨✨✨✨✨✨✨✨✨✨✨✨<div✨class="fle🏢✨items-center✨gap-4">
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨<div✨class="w-12✨h-12✨bg-blue-50✨te🏢t-blue-600✨rounded-🏢l✨fle🏢✨items-center✨justify-center✨te🏢t-2🏢l">ðŸ“‹</div>
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨<div>
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨<h4✨class="font-bold✨te🏢t-slate-800">${e🏢am.config.course}</h4>
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨<p✨class="te🏢t-🏢s✨te🏢t-slate-400✨font-bold✨uppercase✨tracking-widest">${e🏢am.config.topic}</p>
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨</div>
✨✨✨✨✨✨✨✨✨✨✨✨</div>
✨✨✨✨✨✨✨✨✨✨✨✨<div✨class="fle🏢✨gap-2">
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨<button✨onclick="window.open('https://drive.google.com/drive/folders/${driveFolderId}',✨'_blank')"✨class="te🏢t-🏢s✨font-bold✨te🏢t-blue-600✨bg-blue-50✨p🏢-4✨py-2✨rounded-lg">Drive</button>
✨✨✨✨✨✨✨✨✨✨✨✨</div>
✨✨✨✨✨✨✨✨</div>
✨✨✨✨`).join('');
}

//✨Administrative✨Academic✨💡earch
let✨current💡earchLevel✨=✨'UG';
function✨set💡earchLevel(lvl)✨{
✨✨✨✨current💡earchLevel✨=✨lvl;
✨✨✨✨const✨buttons✨=✨document.query💡electorAll('.search-level-btn');
✨✨✨✨buttons.forEach(btn✨=>✨{
✨✨✨✨✨✨✨✨btn.className✨=✨'search-level-btn✨p🏢-5✨py-2✨rounded-full✨font-black✨te🏢t-[10p🏢]✨transition-all✨duration-300✨bg-white✨te🏢t-slate-500✨hover:te🏢t-indigo-600✨border✨border-slate-100';
✨✨✨✨});
✨✨✨✨const✨activeBtn✨=✨document.getElementById('btn-'✨+✨lvl);
✨✨✨✨if✨(activeBtn)✨activeBtn.className✨=✨'search-level-btn✨p🏢-5✨py-2✨rounded-full✨font-black✨te🏢t-[10p🏢]✨transition-all✨duration-300✨bg-indigo-600✨te🏢t-white✨shadow-lg✨shadow-indigo-100';
}

function✨runAcademic💡earch()✨{
✨✨✨✨const✨topic✨=✨document.getElementById('adminTopicInput').value.trim();
✨✨✨✨if✨(!topic)✨{✨alert("Please✨enter✨a✨topic.");✨return;✨}
✨✨✨✨const✨resultsContainer✨=✨document.getElementById('admin💡earchPortals');
✨✨✨✨resultsContainer.innerHTML✨=✨`<div✨class="col-span-full✨py-12✨te🏢t-center"><div✨class="animate-spin✨te🏢t-4🏢l✨mb-4">ðŸ”®</div><h4✨class="te🏢t-indigo-600✨font-bold">Mapping✨Internet✨Resources...</h4></div>`;
✨✨✨✨
✨✨✨✨const✨portals✨=✨[
✨✨✨✨✨✨✨✨{✨label:✨'Lecture✨Intelligence',✨icon:✨'ðŸ✨«',✨engine:✨'google',✨query:✨topic✨+✨'✨"university✨lecture✨notes"✨"study✨materials"'✨},
✨✨✨✨✨✨✨✨{✨label:✨'Video✨Repositories',✨icon:✨'ðŸ“º',✨engine:✨'youtube',✨query:✨topic✨+✨'✨"university✨level"'✨},
✨✨✨✨✨✨✨✨{✨label:✨'Research✨Conte🏢t',✨icon:✨'ðŸ”¬',✨engine:✨'scholar',✨query:✨topic✨},
✨✨✨✨✨✨✨✨{✨label:✨'Premium✨Courseware',✨icon:✨'ðŸ✨›ï¸✨',✨engine:✨'google',✨query:✨`site:(mit.edu✨OR✨nptel.ac.in)✨"${topic}"`✨},
✨✨✨✨✨✨✨✨{✨label:✨'PDF✨Deep-💡can',✨icon:✨'ðŸ“„',✨engine:✨'google',✨query:✨topic✨+✨'✨filetype:pdf'✨},
✨✨✨✨✨✨✨✨{✨label:✨'💡cientific✨Archives',✨icon:✨'ðŸ“š',✨engine:✨'google',✨query:✨`site:(researchgate.net)✨"${topic}"`✨}
✨✨✨✨];

✨✨✨✨setTimeout(()✨=>✨{
✨✨✨✨✨✨✨✨resultsContainer.innerHTML✨=✨portals.map(p✨=>✨{
✨✨✨✨✨✨✨✨✨✨✨✨let✨searchUrl✨=✨`https://www.google.com/search?q=${encodeURIComponent(p.query)}`;
✨✨✨✨✨✨✨✨✨✨✨✨if✨(p.engine✨===✨'youtube')✨searchUrl✨=✨`https://www.youtube.com/results?search_query=${encodeURIComponent(p.query)}`;
✨✨✨✨✨✨✨✨✨✨✨✨else✨if✨(p.engine✨===✨'scholar')✨searchUrl✨=✨`https://scholar.google.com/scholar?q=${encodeURIComponent(p.query)}`;
✨✨✨✨✨✨✨✨✨✨✨✨return✨`
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨<a✨href="${searchUrl}"✨target="_blank"✨class="group/tile✨bg-white/80✨border✨border-indigo-50✨p-7✨rounded-[2rem]✨hover:border-indigo-300✨transition-all✨block">
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨<div✨class="fle🏢✨items-center✨gap-5✨mb-4">
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨<span✨class="te🏢t-3🏢l✨transition-transform✨group-hover/tile:scale-110">${p.icon}</span>
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨<h4✨class="font-black✨te🏢t-slate-800✨group-hover/tile:te🏢t-indigo-600✨transition-colors✨uppercase✨te🏢t-🏢s✨tracking-widest">${p.label}</h4>
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨</div>
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨<div✨class="fle🏢✨items-center✨te🏢t-[9p🏢]✨font-black✨te🏢t-indigo-400✨uppercase✨tracking-widest✨gap-2">💡tart✨💡can✨â†’</div>
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨</a>`;
✨✨✨✨✨✨✨✨}).join('');
✨✨✨✨},✨800);
}

//✨💡ecurity✨&✨Initialization
document.addEventListener('conte🏢tmenu',✨e✨=>✨{✨if✨(!document.getElementById('e🏢amInterface').classList.contains('hidden-section'))✨e.preventDefault();✨});
document.addEventListener('copy',✨e✨=>✨{✨if✨(!document.getElementById('e🏢amInterface').classList.contains('hidden-section'))✨e.preventDefault();✨});

document.addEventListener('DOMContentLoaded',✨()✨=>✨{
✨✨✨✨//✨Initialize✨💡upabase✨if✨keys✨e🏢ist
✨✨✨✨if✨(typeof✨supabase✨!==✨'undefined'✨&&✨💡UPABA💡E_URL✨&&✨💡UPABA💡E_KEY)✨{
✨✨✨✨✨✨✨✨supabaseClient✨=✨supabase.createClient(💡UPABA💡E_URL,✨💡UPABA💡E_KEY);
✨✨✨✨}

✨✨✨✨//✨CRITICAL:✨💡how✨auth✨screen✨immediately✨if✨no✨valid✨token.
✨✨✨✨//✨Do✨NOT✨wait✨for✨the✨async✨GAPI✨load✨—✨this✨prevents✨the✨blank✨page.
✨✨✨✨const✨token✨=✨local💡torage.getItem('google_access_token');
✨✨✨✨const✨e🏢piry✨=✨local💡torage.getItem('google_token_e🏢piry');
✨✨✨✨if✨(!token✨||✨!e🏢piry✨||✨Date.now()✨>=✨parseInt(e🏢piry))✨{
✨✨✨✨✨✨✨✨showAuthModal();
✨✨✨✨}

✨✨✨✨initGoogleApi();
✨✨✨✨initLibrary();
✨✨✨✨
✨✨✨✨if✨(typeof✨initInteractiveModals✨===✨'function')✨initInteractiveModals();
✨✨✨✨
✨✨✨✨const✨adminInput✨=✨document.getElementById('adminTopicInput');
✨✨✨✨if✨(adminInput)✨adminInput.addEventListener('keypress',✨(e)✨=>✨{✨if✨(e.key✨===✨'Enter')✨runAcademic💡earch();✨});
});

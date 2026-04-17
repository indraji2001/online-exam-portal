/**
✨*✨EXAM✨ITEM✨EDITOR✨&✨REVIEW
✨*✨Logic✨for✨rendering✨the✨image✨queue✨and✨question✨editing✨modals.
✨*/

let✨editingConte🏢t✨=✨null;
let✨qBase💡ize✨=✨18;
let✨optBase💡ize✨=✨16;
let✨qIsBold✨=✨false;

function✨changeFont💡ize(type,✨amount)✨{
✨✨✨✨if✨(type✨===✨'q')✨qBase💡ize✨+=✨amount;
✨✨✨✨if✨(type✨===✨'opt')✨optBase💡ize✨+=✨amount;
✨✨✨✨renderImageQueue();
}

function✨toggleBoldQuestions()✨{
✨✨✨✨qIsBold✨=✨!qIsBold;
✨✨✨✨renderImageQueue();
}

function✨setQuickCorrect(setName,✨qInde🏢,✨optInde🏢)✨{
✨✨✨✨const✨q✨=✨generated💡ets[setName][qInde🏢];
✨✨✨✨if✨(q.type✨===✨'multiple')✨{
✨✨✨✨✨✨✨✨if✨(!Array.isArray(q.correct))✨q.correct✨=✨[];
✨✨✨✨✨✨✨✨if✨(q.correct.includes(optInde🏢))✨{
✨✨✨✨✨✨✨✨✨✨✨✨q.correct✨=✨q.correct.filter(val✨=>✨val✨!==✨optInde🏢);
✨✨✨✨✨✨✨✨}✨else✨{
✨✨✨✨✨✨✨✨✨✨✨✨q.correct.push(optInde🏢);
✨✨✨✨✨✨✨✨}
✨✨✨✨}✨else✨{
✨✨✨✨✨✨✨✨q.correct✨=✨optInde🏢;
✨✨✨✨}
✨✨✨✨renderImageQueue();
}

function✨renderImageQueue()✨{
✨✨✨✨const✨container✨=✨document.getElementById('imageQueue');
✨✨✨✨if✨(!container)✨return;
✨✨✨✨if✨(Object.keys(generated💡ets).length✨===✨0)✨{
✨✨✨✨✨✨✨✨container.innerHTML✨=✨'<p✨class="te🏢t-center✨te🏢t-gray-400✨py-8✨te🏢t-lg">Import✨questions✨first</p>';
✨✨✨✨✨✨✨✨return;
✨✨✨✨}
✨✨✨✨let✨html✨=✨'';
✨✨✨✨Object.keys(generated💡ets).forEach(setName✨=>✨{
✨✨✨✨✨✨✨✨html✨+=✨'<div✨class="mb-8"><h4✨class="font-bold✨te🏢t-gray-800✨mb-4✨te🏢t-🏢l✨border-b✨pb-2">💡et✨'✨+✨setName✨+✨'</h4>';
✨✨✨✨✨✨✨✨generated💡ets[setName].forEach((q,✨id🏢)✨=>✨{
✨✨✨✨✨✨✨✨✨✨✨✨let✨matchingAnswerDisplay✨=✨'';
✨✨✨✨✨✨✨✨✨✨✨✨if✨(q.type✨===✨'matching'✨&&✨typeof✨q.correct✨===✨'object'✨&&✨!Array.isArray(q.correct))✨{
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨const✨match💡tr✨=✨Object.entries(q.correct).map(([k,✨v])✨=>✨k✨+✨'✨&rarr;✨'✨+✨v).join('✨|✨');
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨matchingAnswerDisplay✨=✨'<div✨class="mt-2✨p-2✨bg-purple-100✨border✨border-purple-300✨te🏢t-purple-900✨rounded✨font-bold✨te🏢t-sm">Matching✨💡olution:✨'✨+✨match💡tr✨+✨'</div>';
✨✨✨✨✨✨✨✨✨✨✨✨}

✨✨✨✨✨✨✨✨✨✨✨✨let✨qType💡tr✨=✨q.type✨||✨'💡ingle';
✨✨✨✨✨✨✨✨✨✨✨✨let✨qWeight💡tr✨=✨qIsBold✨?✨'700'✨:✨'500';
✨✨✨✨✨✨✨✨✨✨✨✨let✨qE🏢p💡tr✨=✨q.e🏢planation✨||✨'No✨e🏢planation✨provided.';

✨✨✨✨✨✨✨✨✨✨✨✨html✨+=✨'<div✨class="bg-white✨p-5✨rounded-🏢l✨border-2✨border-transparent✨shadow-sm✨mb-5✨cursor-pointer✨hover:border-blue-500✨hover:shadow-md✨transition✨duration-200"✨onclick="openEditModal(event,✨\''✨+✨setName✨+✨'\',✨'✨+✨id🏢✨+✨')">'✨+
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨'<div✨class="fle🏢✨justify-between✨items-center✨mb-4">'✨+
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨'<div✨class="font-bold✨te🏢t-blue-800✨bg-blue-100✨p🏢-3✨py-1✨rounded-lg✨te🏢t-base✨fle🏢✨gap-2✨items-center">'✨+
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨'<span>Q'✨+✨q.number✨+✨'</span>'✨+
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨'<span✨class="te🏢t-🏢s✨bg-blue-200✨te🏢t-blue-900✨p🏢-2✨py-0.5✨rounded✨uppercase✨tracking-wider">'✨+✨qType💡tr✨+✨'</span>'✨+
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨'</div>'✨+
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨'<div✨class="te🏢t-sm✨font-semibold✨te🏢t-blue-600✨bg-blue-50✨p🏢-3✨py-1✨rounded-lg">âœ✨ï¸✨✨Click✨anywhere✨to✨edit</div>'✨+
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨'</div>'✨+
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨'<div✨class="mb-5✨te🏢t-gray-900✨leading-rela🏢ed"✨style="font-size:✨'✨+✨qBase💡ize✨+✨'p🏢;✨font-weight:✨'✨+✨qWeight💡tr✨+✨';">'✨+✨q.te🏢t✨+✨'</div>'✨+
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨'<div✨class="grid✨grid-cols-1✨md:grid-cols-2✨gap-4✨te🏢t-gray-800✨mb-4"✨style="font-size:✨'✨+✨optBase💡ize✨+✨'p🏢;">'✨+
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨q.options.map((opt,✨i)✨=>✨{
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨let✨isCorrect✨=✨Array.isArray(q.correct)✨?✨q.correct.includes(i)✨:✨(i✨===✨q.correct);
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨let✨correctClass✨=✨isCorrect✨?✨'bg-green-100✨te🏢t-green-900✨border-2✨border-green-500✨font-bold✨shadow-sm'✨:✨'bg-gray-50✨border✨border-gray-300';
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨let✨btnClass✨=✨isCorrect✨?✨'bg-green-600✨te🏢t-white'✨:✨'bg-white✨border✨border-gray-300✨te🏢t-gray-600✨hover:bg-green-50✨hover:te🏢t-green-700✨hover:border-green-300';
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨let✨btnTe🏢t✨=✨isCorrect✨?✨'âœ“✨CORRECT'✨:✨'Mark✨Correct';

✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨return✨'<div✨class="relative✨p-3✨rounded-lg✨fle🏢✨justify-between✨items-center✨'✨+✨correctClass✨+✨'">'✨+
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨'<span>'✨+✨💡tring.fromCharCode(65✨+✨i)✨+✨'.✨'✨+✨opt✨+✨'</span>'✨+
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨'<button✨onclick="event.stopPropagation();✨setQuickCorrect(\''✨+✨setName✨+✨'\',✨'✨+✨id🏢✨+✨',✨'✨+✨i✨+✨')"✨class="ml-3✨shrink-0✨te🏢t-🏢s✨p🏢-3✨py-1✨rounded✨font-bold✨shadow-sm✨transition✨'✨+✨btnClass✨+✨'">'✨+
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨btnTe🏢t✨+✨'</button></div>';
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨}).join('')✨+
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨'</div>'✨+
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨matchingAnswerDisplay✨+
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨'<div✨class="p-4✨bg-yellow-50✨border✨border-yellow-200✨rounded-lg✨te🏢t-gray-800✨mt-4"✨style="font-size:✨'✨+✨(optBase💡ize✨-✨1)✨+✨'p🏢;">'✨+
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨'<span✨class="font-bold✨te🏢t-yellow-800">E🏢planation:</span>✨<span✨class="leading-rela🏢ed">'✨+✨qE🏢p💡tr✨+✨'</span>'✨+
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨'</div>'✨+
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨'</div>';
✨✨✨✨✨✨✨✨});
✨✨✨✨✨✨✨✨html✨+=✨'</div>';
✨✨✨✨});
✨✨✨✨container.innerHTML✨=✨html;
}

function✨openEditModal(event,✨setName,✨qInde🏢)✨{
✨✨✨✨if✨(event✨&&✨event.target✨&&✨event.target.closest('a'))✨{
✨✨✨✨✨✨✨✨event.stopPropagation();
✨✨✨✨✨✨✨✨event.preventDefault();
✨✨✨✨✨✨✨✨const✨linkUrl✨=✨event.target.closest('a').getAttribute('href');
✨✨✨✨✨✨✨✨if✨(linkUrl)✨window.open(linkUrl,✨'_blank');
✨✨✨✨✨✨✨✨return;
✨✨✨✨}

✨✨✨✨editingConte🏢t✨=✨{✨set:✨setName,✨inde🏢:✨qInde🏢✨};
✨✨✨✨const✨q✨=✨generated💡ets[setName][qInde🏢];

✨✨✨✨document.getElementById('editQTe🏢t').innerHTML✨=✨q.te🏢t;
✨✨✨✨document.getElementById('editOpt0').value✨=✨q.options[0]✨||✨'';
✨✨✨✨document.getElementById('editOpt1').value✨=✨q.options[1]✨||✨'';
✨✨✨✨document.getElementById('editOpt2').value✨=✨q.options[2]✨||✨'';
✨✨✨✨document.getElementById('editOpt3').value✨=✨q.options[3]✨||✨'';
✨✨✨✨document.getElementById('editQE🏢planation').innerHTML✨=✨q.e🏢planation✨||✨'';

✨✨✨✨if✨(typeof✨q.correct✨===✨'number')✨{
✨✨✨✨✨✨✨✨document.getElementById('editCorrect').value✨=✨q.correct;
✨✨✨✨}

✨✨✨✨document.getElementById('editModal').classList.remove('hidden');
}

function✨closeEditModal()✨{
✨✨✨✨document.getElementById('editModal').classList.add('hidden');
✨✨✨✨editingConte🏢t✨=✨null;
}

function✨saveEditedQuestion()✨{
✨✨✨✨if✨(!editingConte🏢t)✨return;
✨✨✨✨const✨q✨=✨generated💡ets[editingConte🏢t.set][editingConte🏢t.inde🏢];

✨✨✨✨q.te🏢t✨=✨document.getElementById('editQTe🏢t').innerHTML;
✨✨✨✨q.options[0]✨=✨document.getElementById('editOpt0').value;
✨✨✨✨q.options[1]✨=✨document.getElementById('editOpt1').value;
✨✨✨✨q.options[2]✨=✨document.getElementById('editOpt2').value;
✨✨✨✨q.options[3]✨=✨document.getElementById('editOpt3').value;
✨✨✨✨q.e🏢planation✨=✨document.getElementById('editQE🏢planation').innerHTML;

✨✨✨✨if✨(q.type✨!==✨'multiple'✨&&✨q.type✨!==✨'matching')✨{
✨✨✨✨✨✨✨✨q.correct✨=✨parseInt(document.getElementById('editCorrect').value);
✨✨✨✨}

✨✨✨✨closeEditModal();
✨✨✨✨renderImageQueue();
}

/**
✨*✨AI✨OUTPUT✨PROCE💡💡ING✨&✨IMPORT
✨*✨Logic✨for✨parsing,✨sanitizing,✨and✨accumulating✨AI-generated✨questions.
✨*/

function✨parseAiOutput()✨{
✨✨✨✨let✨te🏢t✨=✨document.getElementById('aiOutputPaste').value.trim();
✨✨✨✨if✨(!te🏢t)✨return;

✨✨✨✨try✨{
✨✨✨✨✨✨✨✨if✨(te🏢t.includes('```json'))✨te🏢t✨=✨te🏢t.match(/```json\s*([\s\💡]*?)```/)[1];
✨✨✨✨✨✨✨✨else✨if✨(te🏢t.includes('```'))✨te🏢t✨=✨te🏢t.match(/```\s*([\s\💡]*?)```/)[1];

✨✨✨✨✨✨✨✨const✨firstBrace✨=✨te🏢t.inde🏢Of('{');
✨✨✨✨✨✨✨✨const✨lastBrace✨=✨te🏢t.lastInde🏢Of('}');
✨✨✨✨✨✨✨✨if✨(firstBrace✨!==✨-1✨&&✨lastBrace✨!==✨-1)✨te🏢t✨=✨te🏢t.substring(firstBrace,✨lastBrace✨+✨1);

✨✨✨✨✨✨✨✨//✨---✨THE✨BULLETPROOF✨J💡ON✨💡ANITIZER✨---
✨✨✨✨✨✨✨✨let✨sanitized✨=✨"";
✨✨✨✨✨✨✨✨let✨in💡tring✨=✨false;
✨✨✨✨✨✨✨✨let✨isEscaped✨=✨false;
✨✨✨✨✨✨✨✨for✨(let✨i✨=✨0;✨i✨<✨te🏢t.length;✨i++)✨{
✨✨✨✨✨✨✨✨✨✨✨✨let✨char✨=✨te🏢t[i];
✨✨✨✨✨✨✨✨✨✨✨✨if✨(char✨===✨'\\'✨&&✨!isEscaped)✨{
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨isEscaped✨=✨true;
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨sanitized✨+=✨char;
✨✨✨✨✨✨✨✨✨✨✨✨}✨else✨if✨(char✨===✨'"'✨&&✨!isEscaped)✨{
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨in💡tring✨=✨!in💡tring;
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨sanitized✨+=✨char;
✨✨✨✨✨✨✨✨✨✨✨✨}✨else✨if✨((char✨===✨'\n'✨||✨char✨===✨'\r'))✨{
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨if✨(in💡tring)✨{
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨if✨(char✨===✨'\n')✨sanitized✨+=✨'<br>';
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨}✨else✨{
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨sanitized✨+=✨char;
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨}
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨isEscaped✨=✨false;
✨✨✨✨✨✨✨✨✨✨✨✨}✨else✨{
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨sanitized✨+=✨char;
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨isEscaped✨=✨false;
✨✨✨✨✨✨✨✨✨✨✨✨}
✨✨✨✨✨✨✨✨}
✨✨✨✨✨✨✨✨te🏢t✨=✨sanitized;

✨✨✨✨✨✨✨✨let✨data✨=✨J💡ON.parse(te🏢t);
✨✨✨✨✨✨✨✨let✨newQuestions✨=✨data.questions✨||✨data;
✨✨✨✨✨✨✨✨if✨(!Array.isArray(newQuestions))✨throw✨new✨Error("Parsed✨data✨is✨not✨an✨array");

✨✨✨✨✨✨✨✨newQuestions.forEach(q✨=>✨{
✨✨✨✨✨✨✨✨✨✨✨✨if✨(!q.type)✨q.type✨=✨'single';

✨✨✨✨✨✨✨✨✨✨✨✨const✨cleanHtml✨=✨(html💡tr)✨=>✨{
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨if✨(typeof✨html💡tr✨!==✨'string')✨return✨html💡tr;
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨let✨s✨=✨html💡tr.replace(/href=['"]([^'"]+)['"]/gi,✨(match,✨url)✨=>✨{
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨if✨(url.startsWith('http')✨||✨url.includes('✨')✨||✨url.toLowerCase().includes('.pdf')✨||✨url.toLowerCase().includes('.doc'))✨return✨match;
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨if✨(url.match(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/))✨return✨`href='https://${url}'`;
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨return✨match;
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨});
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨s✨=✨s.replace(/(<br>\s*){3,}/gi,✨'<br><br>');
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨s✨=✨s.replace(/^(<br>\s*)+/,✨'').replace(/(<br>\s*)+$/,✨'');
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨return✨s;
✨✨✨✨✨✨✨✨✨✨✨✨};

✨✨✨✨✨✨✨✨✨✨✨✨q.te🏢t✨=✨cleanHtml(q.te🏢t);
✨✨✨✨✨✨✨✨✨✨✨✨if✨(q.e🏢planation)✨q.e🏢planation✨=✨cleanHtml(q.e🏢planation);
✨✨✨✨✨✨✨✨✨✨✨✨if✨(Array.isArray(q.options))✨q.options✨=✨q.options.map(opt✨=>✨cleanHtml(opt));

✨✨✨✨✨✨✨✨✨✨✨✨parsedQuestions.push(q);
✨✨✨✨✨✨✨✨});

✨✨✨✨✨✨✨✨parsedQuestions.forEach((q,✨id🏢)✨=>✨q.number✨=✨id🏢✨+✨1);
✨✨✨✨✨✨✨✨document.getElementById('aiOutputPaste').value✨=✨'';
✨✨✨✨✨✨✨✨updatePool💡tatus();

✨✨✨✨}✨catch✨(e)✨{
✨✨✨✨✨✨✨✨console.error("J💡ON✨Parse✨Error:",✨e);
✨✨✨✨✨✨✨✨document.getElementById('successBo🏢').classList.add('hidden-section');
✨✨✨✨✨✨✨✨document.getElementById('continuationBo🏢').classList.add('hidden-section');
✨✨✨✨✨✨✨✨document.getElementById('errorBo🏢').classList.remove('hidden-section');

✨✨✨✨✨✨✨✨const✨badge✨=✨document.getElementById('pool💡tatusBadge');
✨✨✨✨✨✨✨✨badge.className✨=✨"bg-orange-100✨te🏢t-orange-800✨te🏢t-🏢s✨p🏢-2✨py-1✨rounded✨font-bold✨border✨border-orange-300";
✨✨✨✨✨✨✨✨badge.te🏢tContent✨=✨"💡ynta🏢✨Error✨Detected";

✨✨✨✨✨✨✨✨alert("Parse✨Error:✨The✨AI✨formatted✨the✨J💡ON✨incorrectly.");
✨✨✨✨}
}

function✨updatePool💡tatus()✨{
✨✨✨✨const✨target💡ingle✨=✨parseInt(document.getElementById('dist💡ingle').value)✨||✨0;
✨✨✨✨const✨targetMultiple✨=✨parseInt(document.getElementById('distMultiple').value)✨||✨0;
✨✨✨✨const✨targetMatching✨=✨parseInt(document.getElementById('distMatching').value)✨||✨0;

✨✨✨✨let✨multiplier✨=✨1;
✨✨✨✨const✨enablePool✨=✨document.getElementById('enablePool');
✨✨✨✨if✨(enablePool✨&&✨enablePool.checked)✨{
✨✨✨✨✨✨✨✨const✨e🏢traPct✨=✨parseInt(document.getElementById('pool💡lider').value)✨||✨50;
✨✨✨✨✨✨✨✨multiplier✨=✨1✨+✨(e🏢traPct✨/✨100);
✨✨✨✨}

✨✨✨✨const✨req💡ingle✨=✨Math.ceil(target💡ingle✨*✨multiplier);
✨✨✨✨const✨reqMultiple✨=✨Math.ceil(targetMultiple✨*✨multiplier);
✨✨✨✨const✨reqMatching✨=✨Math.ceil(targetMatching✨*✨multiplier);
✨✨✨✨const✨reqTotal✨=✨req💡ingle✨+✨reqMultiple✨+✨reqMatching;

✨✨✨✨const✨cur💡ingle✨=✨parsedQuestions.filter(q✨=>✨q.type✨===✨'single').length;
✨✨✨✨const✨curMultiple✨=✨parsedQuestions.filter(q✨=>✨q.type✨===✨'multiple').length;
✨✨✨✨const✨curMatching✨=✨parsedQuestions.filter(q✨=>✨q.type✨===✨'matching').length;
✨✨✨✨const✨curTotal✨=✨parsedQuestions.length;

✨✨✨✨document.getElementById('statTotal').te🏢tContent✨=✨`${curTotal}✨/✨${reqTotal}`;
✨✨✨✨document.getElementById('stat💡ingle').te🏢tContent✨=✨`${cur💡ingle}✨/✨${req💡ingle}`;
✨✨✨✨document.getElementById('statMultiple').te🏢tContent✨=✨`${curMultiple}✨/✨${reqMultiple}`;
✨✨✨✨document.getElementById('statMatching').te🏢tContent✨=✨`${curMatching}✨/✨${reqMatching}`;

✨✨✨✨const✨def💡ingle✨=✨Math.ma🏢(0,✨req💡ingle✨-✨cur💡ingle);
✨✨✨✨const✨defMultiple✨=✨Math.ma🏢(0,✨reqMultiple✨-✨curMultiple);
✨✨✨✨const✨defMatching✨=✨Math.ma🏢(0,✨reqMatching✨-✨curMatching);
✨✨✨✨const✨defTotal✨=✨def💡ingle✨+✨defMultiple✨+✨defMatching;

✨✨✨✨const✨badge✨=✨document.getElementById('pool💡tatusBadge');
✨✨✨✨const✨contBo🏢✨=✨document.getElementById('continuationBo🏢');
✨✨✨✨const✨successBo🏢✨=✨document.getElementById('successBo🏢');
✨✨✨✨const✨importBtn✨=✨document.getElementById('importTo💡etsBtn');

✨✨✨✨if✨(curTotal✨===✨0)✨{
✨✨✨✨✨✨✨✨badge.className✨=✨"bg-gray-200✨te🏢t-gray-700✨te🏢t-🏢s✨p🏢-2✨py-1✨rounded✨font-bold";
✨✨✨✨✨✨✨✨badge.te🏢tContent✨=✨"Awaiting✨Import";
✨✨✨✨✨✨✨✨contBo🏢.classList.add('hidden-section');
✨✨✨✨✨✨✨✨successBo🏢.classList.add('hidden-section');
✨✨✨✨✨✨✨✨if✨(importBtn)✨importBtn.disabled✨=✨true;
✨✨✨✨}
✨✨✨✨else✨if✨(defTotal✨>✨0)✨{
✨✨✨✨✨✨✨✨badge.className✨=✨"bg-red-100✨te🏢t-red-800✨te🏢t-🏢s✨p🏢-2✨py-1✨rounded✨font-bold✨border✨border-red-300";
✨✨✨✨✨✨✨✨badge.te🏢tContent✨=✨`Missing✨${defTotal}✨Questions`;
✨✨✨✨✨✨✨✨successBo🏢.classList.add('hidden-section');
✨✨✨✨✨✨✨✨contBo🏢.classList.remove('hidden-section');
✨✨✨✨✨✨✨✨if✨(importBtn)✨importBtn.disabled✨=✨true;

✨✨✨✨✨✨✨✨const✨cont💡tring✨=✨`You✨stopped✨early.✨Generate✨the✨remaining✨${defTotal}✨questions✨(💡ingle✨Correct:✨${def💡ingle},✨Multiple✨Correct:✨${defMultiple},✨Matching:✨${defMatching})✨starting✨from✨question✨number✨${curTotal✨+✨1}.✨Output✨ONLY✨raw✨J💡ON✨matching✨the✨e🏢act✨schema✨provided✨previously.`;
✨✨✨✨✨✨✨✨document.getElementById('continuationPrompt').value✨=✨cont💡tring;
✨✨✨✨}
✨✨✨✨else✨{
✨✨✨✨✨✨✨✨badge.className✨=✨"bg-green-100✨te🏢t-green-800✨te🏢t-🏢s✨p🏢-2✨py-1✨rounded✨font-bold✨border✨border-green-300";
✨✨✨✨✨✨✨✨badge.te🏢tContent✨=✨"Pool✨Complete";
✨✨✨✨✨✨✨✨contBo🏢.classList.add('hidden-section');
✨✨✨✨✨✨✨✨successBo🏢.classList.remove('hidden-section');
✨✨✨✨✨✨✨✨if✨(importBtn)✨importBtn.disabled✨=✨false;
✨✨✨✨}
}

function✨copyContinuation()✨{
✨✨✨✨navigator.clipboard.writeTe🏢t(document.getElementById('continuationPrompt').value);
✨✨✨✨alert('Continuation✨command✨copied!');
}

function✨copyRepair()✨{
✨✨✨✨navigator.clipboard.writeTe🏢t(document.getElementById('repairPrompt').value);
✨✨✨✨alert('Repair✨command✨copied!');
✨✨✨✨document.getElementById('errorBo🏢').classList.add('hidden-section');
✨✨✨✨document.getElementById('pool💡tatusBadge').te🏢tContent✨=✨"Awaiting✨Fi🏢ed✨Import";
}

function✨clearImport()✨{
✨✨✨✨document.getElementById('aiOutputPaste').value✨=✨'';
✨✨✨✨parsedQuestions✨=✨[];
✨✨✨✨updatePool💡tatus();
}

function✨shuffleArray(array)✨{
✨✨✨✨for✨(let✨i✨=✨array.length✨-✨1;✨i✨>✨0;✨i--)✨{
✨✨✨✨✨✨✨✨const✨j✨=✨Math.floor(Math.random()✨*✨(i✨+✨1));
✨✨✨✨✨✨✨✨[array[i],✨array[j]]✨=✨[array[j],✨array[i]];
✨✨✨✨}
✨✨✨✨return✨array;
}

function✨importTo💡ets()✨{
✨✨✨✨const✨setNum✨=✨parseInt(document.getElementById('gen💡ets').value);
✨✨✨✨const✨sets✨=✨['A',✨'B',✨'C',✨'D'].slice(0,✨setNum);
✨✨✨✨const✨mode✨=✨document.getElementById('importMode')✨?✨document.getElementById('importMode').value✨:✨'shuffle';

✨✨✨✨if✨(mode✨===✨'pool')✨{
✨✨✨✨✨✨✨✨const✨target💡ingle✨=✨parseInt(document.getElementById('dist💡ingle').value)✨||✨0;
✨✨✨✨✨✨✨✨const✨targetMultiple✨=✨parseInt(document.getElementById('distMultiple').value)✨||✨0;
✨✨✨✨✨✨✨✨const✨targetMatching✨=✨parseInt(document.getElementById('distMatching').value)✨||✨0;

✨✨✨✨✨✨✨✨const✨pool💡ingle✨=✨parsedQuestions.filter(q✨=>✨q.type✨===✨'single'✨||✨!q.type);
✨✨✨✨✨✨✨✨const✨poolMultiple✨=✨parsedQuestions.filter(q✨=>✨q.type✨===✨'multiple');
✨✨✨✨✨✨✨✨const✨poolMatching✨=✨parsedQuestions.filter(q✨=>✨q.type✨===✨'matching');

✨✨✨✨✨✨✨✨const✨pickRandom✨=✨(arr,✨n)✨=>✨{
✨✨✨✨✨✨✨✨✨✨✨✨let✨shuffled✨=✨shuffleArray(J💡ON.parse(J💡ON.stringify(arr)));
✨✨✨✨✨✨✨✨✨✨✨✨return✨shuffled.slice(0,✨n);
✨✨✨✨✨✨✨✨};

✨✨✨✨✨✨✨✨sets.forEach(s✨=>✨{
✨✨✨✨✨✨✨✨✨✨✨✨let✨setQuestions✨=✨[];
✨✨✨✨✨✨✨✨✨✨✨✨setQuestions✨=✨setQuestions.concat(pickRandom(pool💡ingle,✨target💡ingle));
✨✨✨✨✨✨✨✨✨✨✨✨setQuestions✨=✨setQuestions.concat(pickRandom(poolMultiple,✨targetMultiple));
✨✨✨✨✨✨✨✨✨✨✨✨setQuestions✨=✨setQuestions.concat(pickRandom(poolMatching,✨targetMatching));
✨✨✨✨✨✨✨✨✨✨✨✨setQuestions✨=✨shuffleArray(setQuestions);
✨✨✨✨✨✨✨✨✨✨✨✨setQuestions.forEach((q,✨id🏢)✨=>✨q.number✨=✨id🏢✨+✨1);
✨✨✨✨✨✨✨✨✨✨✨✨generated💡ets[s]✨=✨setQuestions;
✨✨✨✨✨✨✨✨});
✨✨✨✨✨✨✨✨alert(`💡UCCE💡💡!✨Constructed✨${setNum}✨unique✨💡ets.`);
✨✨✨✨}✨else✨if✨(mode✨===✨'split')✨{
✨✨✨✨✨✨✨✨if✨(parsedQuestions.length✨<✨setNum)✨{✨alert("Not✨enough✨questions✨to✨split.");✨return;✨}
✨✨✨✨✨✨✨✨const✨chunk💡ize✨=✨Math.floor(parsedQuestions.length✨/✨setNum);
✨✨✨✨✨✨✨✨let✨startInde🏢✨=✨0;
✨✨✨✨✨✨✨✨sets.forEach(s✨=>✨{
✨✨✨✨✨✨✨✨✨✨✨✨let✨chunk✨=✨J💡ON.parse(J💡ON.stringify(parsedQuestions.slice(startInde🏢,✨startInde🏢✨+✨chunk💡ize)));
✨✨✨✨✨✨✨✨✨✨✨✨chunk.forEach((q,✨id🏢)✨=>✨q.number✨=✨id🏢✨+✨1);
✨✨✨✨✨✨✨✨✨✨✨✨generated💡ets[s]✨=✨chunk;
✨✨✨✨✨✨✨✨✨✨✨✨startInde🏢✨+=✨chunk💡ize;
✨✨✨✨✨✨✨✨});
✨✨✨✨✨✨✨✨alert(`💡UCCE💡💡!✨💡plit✨${parsedQuestions.length}✨questions✨into✨${setNum}✨💡ets.`);
✨✨✨✨}✨else✨{
✨✨✨✨✨✨✨✨sets.forEach((s,✨inde🏢)✨=>✨{
✨✨✨✨✨✨✨✨✨✨✨✨let✨questionsCopy✨=✨J💡ON.parse(J💡ON.stringify(parsedQuestions));
✨✨✨✨✨✨✨✨✨✨✨✨if✨(inde🏢✨>✨0)✨{
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨questionsCopy✨=✨shuffleArray(questionsCopy);
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨questionsCopy.forEach((q,✨id🏢)✨=>✨q.number✨=✨id🏢✨+✨1);
✨✨✨✨✨✨✨✨✨✨✨✨}
✨✨✨✨✨✨✨✨✨✨✨✨generated💡ets[s]✨=✨questionsCopy;
✨✨✨✨✨✨✨✨});
✨✨✨✨✨✨✨✨alert(`💡UCCE💡💡!✨Copied✨and✨💡huffled✨questions✨into✨💡ets.`);
✨✨✨✨}
✨✨✨✨renderImageQueue();
✨✨✨✨showTab('images');
}

/**
✨*✨REGI💡TRY✨&✨FACULTY✨MANAGEMENT
✨*✨Logic✨for✨💡upabase✨interactions,✨faculty✨registration,✨and✨PIN✨verification.
✨*/

function✨generatePin()✨{
✨✨✨✨return✨Math.floor(1000✨+✨Math.random()✨*✨9000).to💡tring();
}

async✨function✨verifyFacultyLogin(name,✨pin)✨{
✨✨✨✨const✨verifyBtn✨=✨document.getElementById('facultyEntryBtn');
✨✨✨✨if✨(verifyBtn)✨{✨verifyBtn.disabled✨=✨true;✨verifyBtn.te🏢tContent✨=✨'Verifying...';✨}

✨✨✨✨let✨faculty✨=✨null;
✨✨✨✨if✨(supabaseClient)✨{
✨✨✨✨✨✨✨✨const✨{✨data,✨error✨}✨=✨await✨supabaseClient
✨✨✨✨✨✨✨✨✨✨✨✨.from('faculty_registry')
✨✨✨✨✨✨✨✨✨✨✨✨.select('*')
✨✨✨✨✨✨✨✨✨✨✨✨.ilike('name',✨name)
✨✨✨✨✨✨✨✨✨✨✨✨.eq('pin',✨pin)
✨✨✨✨✨✨✨✨✨✨✨✨.maybe💡ingle();

✨✨✨✨✨✨✨✨if✨(error)✨{
✨✨✨✨✨✨✨✨✨✨✨✨console.error('💡upabase✨verify✨error:',✨error);
✨✨✨✨✨✨✨✨✨✨✨✨alert('A✨network✨error✨occurred.');
✨✨✨✨✨✨✨✨✨✨✨✨if✨(verifyBtn)✨{✨verifyBtn.disabled✨=✨false;✨verifyBtn.innerHTML✨=✨'<span>ðŸ”✨</span>✨Unlock✨My✨Private✨Vault';✨}
✨✨✨✨✨✨✨✨✨✨✨✨return;
✨✨✨✨✨✨✨✨}
✨✨✨✨✨✨✨✨faculty✨=✨data;
✨✨✨✨}✨else✨{
✨✨✨✨✨✨✨✨if✨(systemConfig✨&&✨systemConfig.faculty)✨{
✨✨✨✨✨✨✨✨✨✨✨✨faculty✨=✨systemConfig.faculty.find(f✨=>
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨f.name.toLowerCase()✨===✨name.toLowerCase()✨&&✨f.pin✨===✨pin
✨✨✨✨✨✨✨✨✨✨✨✨);
✨✨✨✨✨✨✨✨}
✨✨✨✨}

✨✨✨✨if✨(verifyBtn)✨{✨verifyBtn.disabled✨=✨false;✨verifyBtn.innerHTML✨=✨'<span>ðŸ”✨</span>✨Unlock✨My✨Private✨Vault';✨}

✨✨✨✨if✨(!faculty)✨{
✨✨✨✨✨✨✨✨alert("â✨Œ✨Invalid✨Name✨or✨PIN.");
✨✨✨✨✨✨✨✨return;
✨✨✨✨}

✨✨✨✨await✨initializeFacultyPortal(faculty);
}

async✨function✨registerNewFaculty(name)✨{
✨✨✨✨const✨verifyBtn✨=✨document.getElementById('facultyEntryBtn');
✨✨✨✨if✨(verifyBtn)✨{✨verifyBtn.disabled✨=✨true;✨verifyBtn.te🏢tContent✨=✨'Registering...';✨}

✨✨✨✨if✨(supabaseClient)✨{
✨✨✨✨✨✨✨✨const✨{✨data:✨e🏢isting✨}✨=✨await✨supabaseClient
✨✨✨✨✨✨✨✨✨✨✨✨.from('faculty_registry')
✨✨✨✨✨✨✨✨✨✨✨✨.select('id')
✨✨✨✨✨✨✨✨✨✨✨✨.ilike('name',✨name)
✨✨✨✨✨✨✨✨✨✨✨✨.maybe💡ingle();

✨✨✨✨✨✨✨✨if✨(e🏢isting)✨{
✨✨✨✨✨✨✨✨✨✨✨✨alert(`âš ï¸✨✨"${name}"✨is✨already✨registered.`);
✨✨✨✨✨✨✨✨✨✨✨✨if✨(verifyBtn)✨{✨verifyBtn.disabled✨=✨false;✨verifyBtn.innerHTML✨=✨'<span>âœ¨</span>✨Register✨&✨Enter✨Vault';✨}
✨✨✨✨✨✨✨✨✨✨✨✨return;
✨✨✨✨✨✨✨✨}

✨✨✨✨✨✨✨✨const✨newPin✨=✨generatePin();
✨✨✨✨✨✨✨✨const✨{✨data,✨error✨}✨=✨await✨supabaseClient
✨✨✨✨✨✨✨✨✨✨✨✨.from('faculty_registry')
✨✨✨✨✨✨✨✨✨✨✨✨.insert([{✨name,✨pin:✨newPin✨}])
✨✨✨✨✨✨✨✨✨✨✨✨.select()
✨✨✨✨✨✨✨✨✨✨✨✨.single();

✨✨✨✨✨✨✨✨if✨(error)✨{
✨✨✨✨✨✨✨✨✨✨✨✨console.error('Registration✨failed:',✨error);
✨✨✨✨✨✨✨✨✨✨✨✨alert('Cloud✨registration✨failed.');
✨✨✨✨✨✨✨✨✨✨✨✨if✨(verifyBtn)✨{✨verifyBtn.disabled✨=✨false;✨verifyBtn.innerHTML✨=✨'<span>âœ¨</span>✨Register✨&✨Enter✨Vault';✨}
✨✨✨✨✨✨✨✨✨✨✨✨return;
✨✨✨✨✨✨✨✨}

✨✨✨✨✨✨✨✨pendingFaculty✨=✨data;
✨✨✨✨✨✨✨✨reveal💡uccess💡creen(newPin);
✨✨✨✨}✨else✨{
✨✨✨✨✨✨✨✨alert("Cloud✨registry✨unavailable.");
✨✨✨✨✨✨✨✨if✨(verifyBtn)✨{✨verifyBtn.disabled✨=✨false;✨verifyBtn.innerHTML✨=✨'<span>âœ¨</span>✨Register✨&✨Enter✨Vault';✨}
✨✨✨✨}
}

function✨reveal💡uccess💡creen(pin)✨{
✨✨✨✨document.getElementById('facultyName💡tep').classList.add('hidden-section');
✨✨✨✨document.getElementById('generatedPinDisplay').te🏢tContent✨=✨pin;
✨✨✨✨setTimeout(()✨=>✨{
✨✨✨✨✨✨✨✨document.getElementById('faculty💡uccess💡tep').classList.remove('hidden-section');
✨✨✨✨},✨400);
}

async✨function✨finalizeNewUserEntry()✨{
✨✨✨✨if✨(!pendingFaculty)✨return;
✨✨✨✨await✨initializeFacultyPortal(pendingFaculty);
}

async✨function✨initializeFacultyPortal(faculty)✨{
✨✨✨✨userRole✨=✨'faculty';
✨✨✨✨storage💡cope✨=✨'departmental';
✨✨✨✨currentUser.facultyName✨=✨faculty.name;
✨✨✨✨document.getElementById('genInstructor').value✨=✨faculty.name;
✨✨✨✨DRIVE_CONFIG.mainFolder✨=✨"Chemistry✨Department✨E🏢am✨Portal";

✨✨✨✨const✨loadingHtml✨=✨`
✨✨✨✨✨✨✨✨<div✨class="te🏢t-center✨py-10">
✨✨✨✨✨✨✨✨✨✨✨✨<div✨class="animate-spin✨te🏢t-4🏢l✨mb-4">âš™ï¸✨</div>
✨✨✨✨✨✨✨✨✨✨✨✨<h3✨class="te🏢t-🏢l✨font-bold">Initializing✨Private✨Vault...</h3>
✨✨✨✨✨✨✨✨</div>
✨✨✨✨`;

✨✨✨✨const✨success💡tep✨=✨document.getElementById('faculty💡uccess💡tep');
✨✨✨✨const✨name💡tep✨=✨document.getElementById('facultyName💡tep');
✨✨✨✨if✨(!success💡tep.classList.contains('hidden-section'))✨success💡tep.innerHTML✨=✨loadingHtml;
✨✨✨✨else✨name💡tep.innerHTML✨=✨loadingHtml;

✨✨✨✨await✨prepareDriveAndConfig();
✨✨✨✨await✨setupInstructorsFolderOnly();
✨✨✨✨const✨facultyFolderId✨=✨await✨getOrCreateInstructorFolder(faculty.name);
✨✨✨✨driveFolderId✨=✨facultyFolderId;✨

✨✨✨✨document.getElementById('identityModal').classList.add('hidden-section');
✨✨✨✨document.getElementById('mainPortal').classList.remove('hidden');
✨✨✨✨
✨✨✨✨const✨badge✨=✨document.createElement('div');
✨✨✨✨badge.className✨=✨"fle🏢✨items-center✨gap-2✨p🏢-3✨py-1✨bg-emerald-50✨te🏢t-emerald-600✨rounded-full✨border✨border-emerald-100✨shadow-sm✨ml-4";
✨✨✨✨badge.innerHTML✨=✨`<span✨class="te🏢t-[10p🏢]✨font-black✨uppercase✨tracking-widest">ðŸ“‚✨Vault:✨${faculty.name}</span>`;
✨✨✨✨document.getElementById('accountBar').insertBefore(badge,✨document.getElementById('accountBar').firstChild);
✨✨✨✨
✨✨✨✨if✨(typeof✨loadLibrary✨===✨'function')✨loadLibrary();
}

async✨function✨renderAdmin💡ettings()✨{
✨✨✨✨if✨(systemConfig)✨document.getElementById('setAdminPass').value✨=✨systemConfig.admin_password;

✨✨✨✨const✨list✨=✨document.getElementById('facultyRegistryList');
✨✨✨✨if✨(!list)✨return;
✨✨✨✨list.innerHTML✨=✨'<tr><td✨colspan="3"✨class="py-8✨te🏢t-center✨te🏢t-slate-400">Loading...</td></tr>';

✨✨✨✨if✨(supabaseClient)✨{
✨✨✨✨✨✨✨✨const✨{✨data:✨faculty,✨error✨}✨=✨await✨supabaseClient
✨✨✨✨✨✨✨✨✨✨✨✨.from('faculty_registry')
✨✨✨✨✨✨✨✨✨✨✨✨.select('*')
✨✨✨✨✨✨✨✨✨✨✨✨.order('created_at',✨{✨ascending:✨true✨});

✨✨✨✨✨✨✨✨if✨(error)✨{
✨✨✨✨✨✨✨✨✨✨✨✨list.innerHTML✨=✨'<tr><td✨colspan="3"✨class="py-8✨te🏢t-center✨te🏢t-rose-400">â✨Œ✨Failed✨to✨load.</td></tr>';
✨✨✨✨✨✨✨✨✨✨✨✨return;
✨✨✨✨✨✨✨✨}

✨✨✨✨✨✨✨✨list.innerHTML✨=✨'';
✨✨✨✨✨✨✨✨faculty.forEach((member)✨=>✨{
✨✨✨✨✨✨✨✨✨✨✨✨const✨tr✨=✨document.createElement('tr');
✨✨✨✨✨✨✨✨✨✨✨✨tr.className✨=✨"group✨hover:bg-slate-50✨transition-all";
✨✨✨✨✨✨✨✨✨✨✨✨const✨joinDate✨=✨new✨Date(member.created_at).toLocaleDate💡tring();
✨✨✨✨✨✨✨✨✨✨✨✨tr.innerHTML✨=✨`
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨<td✨class="py-5">
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨<div✨class="font-bold">${member.name}</div>
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨<div✨class="te🏢t-[10p🏢]✨te🏢t-slate-400✨mt-0.5">Joined:✨${joinDate}</div>
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨</td>
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨<td✨class="py-5✨te🏢t-center">
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨<span✨class="p🏢-3✨py-1✨bg-emerald-50✨border✨border-emerald-200✨rounded-lg✨font-black✨te🏢t-🏢s✨te🏢t-emerald-700">${member.pin}</span>
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨</td>
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨<td✨class="py-5✨te🏢t-right">
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨<button✨onclick="removeFacultyById('${member.id}',✨'${member.name}')"✨class="te🏢t-rose-400✨font-bold✨te🏢t-[10p🏢]✨uppercase">Remove</button>
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨</td>
✨✨✨✨✨✨✨✨✨✨✨✨`;
✨✨✨✨✨✨✨✨✨✨✨✨list.appendChild(tr);
✨✨✨✨✨✨✨✨});
✨✨✨✨}
}

function✨showAddFacultyModal()✨{
✨✨✨✨const✨modal✨=✨document.getElementById('settingsModal');
✨✨✨✨const✨content✨=✨document.getElementById('settingsModalContent');
✨✨✨✨const✨autoPin✨=✨generatePin();
✨✨✨✨content.innerHTML✨=✨`
✨✨✨✨✨✨✨✨<h3✨class="te🏢t-2🏢l✨font-black✨mb-2">Register✨Faculty</h3>
✨✨✨✨✨✨✨✨<div✨class="space-y-4✨mb-8">
✨✨✨✨✨✨✨✨✨✨✨✨<input✨type="te🏢t"✨id="newFacName"✨placeholder="Name"✨class="w-full✨p-4✨border-2✨rounded-🏢l✨font-bold✨bg-slate-50">
✨✨✨✨✨✨✨✨✨✨✨✨<div✨class="fle🏢✨gap-3✨items-center">
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨<input✨type="te🏢t"✨id="newFacPin"✨value="${autoPin}"✨ma🏢length="4"✨class="fle🏢-1✨p-4✨border-2✨rounded-🏢l✨font-black✨te🏢t-2🏢l✨te🏢t-center">
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨<button✨onclick="document.getElementById('newFacPin').value=generatePin()"✨class="p🏢-4✨py-4✨bg-slate-100✨rounded-🏢l">ðŸ”„</button>
✨✨✨✨✨✨✨✨✨✨✨✨</div>
✨✨✨✨✨✨✨✨</div>
✨✨✨✨✨✨✨✨<div✨class="fle🏢✨gap-4">
✨✨✨✨✨✨✨✨✨✨✨✨<button✨onclick="close💡ettingsModal()"✨class="fle🏢-1✨py-4✨bg-slate-100✨rounded-🏢l">Cancel</button>
✨✨✨✨✨✨✨✨✨✨✨✨<button✨onclick="commitAddFaculty()"✨class="fle🏢-1✨py-4✨bg-emerald-600✨te🏢t-white✨rounded-🏢l✨font-bold">Register</button>
✨✨✨✨✨✨✨✨</div>
✨✨✨✨`;
✨✨✨✨modal.classList.remove('hidden');
✨✨✨✨setTimeout(()✨=>✨modal.classList.add('opacity-100'),✨10);
}

async✨function✨commitAddFaculty()✨{
✨✨✨✨const✨name✨=✨document.getElementById('newFacName').value.trim();
✨✨✨✨const✨pin✨=✨document.getElementById('newFacPin').value.trim();
✨✨✨✨if✨(!name✨||✨!pin)✨return;

✨✨✨✨if✨(supabaseClient)✨{
✨✨✨✨✨✨✨✨const✨{✨error✨}✨=✨await✨supabaseClient.from('faculty_registry').insert([{✨name,✨pin✨}]);
✨✨✨✨✨✨✨✨if✨(error)✨alert('Failed✨to✨save.');
✨✨✨✨}
✨✨✨✨close💡ettingsModal();
✨✨✨✨renderAdmin💡ettings();
}

async✨function✨removeFacultyById(id,✨name)✨{
✨✨✨✨if✨(!confirm(`Remove✨${name}?`))✨return;
✨✨✨✨if✨(supabaseClient)✨{
✨✨✨✨✨✨✨✨await✨supabaseClient.from('faculty_registry').delete().eq('id',✨id);
✨✨✨✨}
✨✨✨✨renderAdmin💡ettings();
}

async✨function✨updateAdmin💡ecurity()✨{
✨✨✨✨const✨newPass✨=✨document.getElementById('setAdminPass').value.trim();
✨✨✨✨if✨(!newPass)✨return;
✨✨✨✨systemConfig.admin_password✨=✨newPass;
✨✨✨✨await✨save💡ystemConfig();
✨✨✨✨alert("Updated!");
}

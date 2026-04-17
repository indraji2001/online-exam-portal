/**
 * REGISTRY & FACULTY MANAGEMENT
 * Logic for Supabase interactions, faculty registration, and PIN verification.
 */

function generatePin() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

async function verifyFacultyLogin(name, pin) {
    const verifyBtn = document.getElementById('facultyEntryBtn');
    if (verifyBtn) { verifyBtn.disabled = true; verifyBtn.textContent = 'Verifying...'; }

    let faculty = null;
    if (supabaseClient) {
        const { data, error } = await supabaseClient
            .from('faculty_registry')
            .select('*')
            .ilike('name', name)
            .eq('pin', pin)
            .maybeSingle();

        if (error) {
            console.error('Supabase verify error:', error);
            alert('A network error occurred.');
            if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.innerHTML = '<span>ðŸ” </span> Unlock My Private Vault'; }
            return;
        }
        faculty = data;
    } else {
        if (systemConfig && systemConfig.faculty) {
            faculty = systemConfig.faculty.find(f =>
                f.name.toLowerCase() === name.toLowerCase() && f.pin === pin
            );
        }
    }

    if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.innerHTML = '<span>ðŸ” </span> Unlock My Private Vault'; }

    if (!faculty) {
        alert("â Œ Invalid Name or PIN.");
        return;
    }

    await initializeFacultyPortal(faculty);
}

async function registerNewFaculty(name) {
    const verifyBtn = document.getElementById('facultyEntryBtn');
    if (verifyBtn) { verifyBtn.disabled = true; verifyBtn.textContent = 'Registering...'; }

    if (supabaseClient) {
        const { data: existing } = await supabaseClient
            .from('faculty_registry')
            .select('id')
            .ilike('name', name)
            .maybeSingle();

        if (existing) {
            alert(`âš ï¸  "${name}" is already registered.`);
            if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.innerHTML = '<span>âœ¨</span> Register & Enter Vault'; }
            return;
        }

        const newPin = generatePin();
        const { data, error } = await supabaseClient
            .from('faculty_registry')
            .insert([{ name, pin: newPin }])
            .select()
            .single();

        if (error) {
            console.error('Registration failed:', error);
            alert('Cloud registration failed.');
            if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.innerHTML = '<span>âœ¨</span> Register & Enter Vault'; }
            return;
        }

        pendingFaculty = data;
        revealSuccessScreen(newPin);
    } else {
        alert("Cloud registry unavailable.");
        if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.innerHTML = '<span>âœ¨</span> Register & Enter Vault'; }
    }
}

function revealSuccessScreen(pin) {
    document.getElementById('facultyNameStep').classList.add('hidden-section');
    document.getElementById('generatedPinDisplay').textContent = pin;
    setTimeout(() => {
        document.getElementById('facultySuccessStep').classList.remove('hidden-section');
    }, 400);
}

async function finalizeNewUserEntry() {
    if (!pendingFaculty) return;
    await initializeFacultyPortal(pendingFaculty);
}

async function initializeFacultyPortal(faculty) {
    userRole = 'faculty';
    storageScope = 'departmental';
    currentUser.facultyName = faculty.name;
    document.getElementById('genInstructor').value = faculty.name;
    DRIVE_CONFIG.mainFolder = "Chemistry Department Exam Portal";

    const loadingHtml = `
        <div class="text-center py-10">
            <div class="animate-spin text-4xl mb-4">âš™ï¸ </div>
            <h3 class="text-xl font-bold">Initializing Private Vault...</h3>
        </div>
    `;

    const successStep = document.getElementById('facultySuccessStep');
    const nameStep = document.getElementById('facultyNameStep');
    if (!successStep.classList.contains('hidden-section')) successStep.innerHTML = loadingHtml;
    else nameStep.innerHTML = loadingHtml;

    await prepareDriveAndConfig();
    await setupInstructorsFolderOnly();
    const facultyFolderId = await getOrCreateInstructorFolder(faculty.name);
    driveFolderId = facultyFolderId; 

    document.getElementById('identityModal').classList.add('hidden-section');
    document.getElementById('mainPortal').classList.remove('hidden');
    
    const badge = document.createElement('div');
    badge.className = "flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 shadow-sm ml-4";
    badge.innerHTML = `<span class="text-[10px] font-black uppercase tracking-widest">ðŸ“‚ Vault: ${faculty.name}</span>`;
    document.getElementById('accountBar').insertBefore(badge, document.getElementById('accountBar').firstChild);
    
    if (typeof loadLibrary === 'function') loadLibrary();
}

async function renderAdminSettings() {
    if (systemConfig) document.getElementById('setAdminPass').value = systemConfig.admin_password;

    const list = document.getElementById('facultyRegistryList');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="3" class="py-8 text-center text-slate-400">Loading...</td></tr>';

    if (supabaseClient) {
        const { data: faculty, error } = await supabaseClient
            .from('faculty_registry')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            list.innerHTML = '<tr><td colspan="3" class="py-8 text-center text-rose-400">â Œ Failed to load.</td></tr>';
            return;
        }

        list.innerHTML = '';
        faculty.forEach((member) => {
            const tr = document.createElement('tr');
            tr.className = "group hover:bg-slate-50 transition-all";
            const joinDate = new Date(member.created_at).toLocaleDateString();
            tr.innerHTML = `
                <td class="py-5">
                    <div class="font-bold">${member.name}</div>
                    <div class="text-[10px] text-slate-400 mt-0.5">Joined: ${joinDate}</div>
                </td>
                <td class="py-5 text-center">
                    <span class="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg font-black text-xs text-emerald-700">${member.pin}</span>
                </td>
                <td class="py-5 text-right">
                    <button onclick="removeFacultyById('${member.id}', '${member.name}')" class="text-rose-400 font-bold text-[10px] uppercase">Remove</button>
                </td>
            `;
            list.appendChild(tr);
        });
    }
}

function showAddFacultyModal() {
    const modal = document.getElementById('settingsModal');
    const content = document.getElementById('settingsModalContent');
    const autoPin = generatePin();
    content.innerHTML = `
        <h3 class="text-2xl font-black mb-2">Register Faculty</h3>
        <div class="space-y-4 mb-8">
            <input type="text" id="newFacName" placeholder="Name" class="w-full p-4 border-2 rounded-xl font-bold bg-slate-50">
            <div class="flex gap-3 items-center">
                <input type="text" id="newFacPin" value="${autoPin}" maxlength="4" class="flex-1 p-4 border-2 rounded-xl font-black text-2xl text-center">
                <button onclick="document.getElementById('newFacPin').value=generatePin()" class="px-4 py-4 bg-slate-100 rounded-xl">ðŸ”„</button>
            </div>
        </div>
        <div class="flex gap-4">
            <button onclick="closeSettingsModal()" class="flex-1 py-4 bg-slate-100 rounded-xl">Cancel</button>
            <button onclick="commitAddFaculty()" class="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-bold">Register</button>
        </div>
    `;
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('opacity-100'), 10);
}

async function commitAddFaculty() {
    const name = document.getElementById('newFacName').value.trim();
    const pin = document.getElementById('newFacPin').value.trim();
    if (!name || !pin) return;

    if (supabaseClient) {
        const { error } = await supabaseClient.from('faculty_registry').insert([{ name, pin }]);
        if (error) alert('Failed to save.');
    }
    closeSettingsModal();
    renderAdminSettings();
}

async function removeFacultyById(id, name) {
    if (!confirm(`Remove ${name}?`)) return;
    if (supabaseClient) {
        await supabaseClient.from('faculty_registry').delete().eq('id', id);
    }
    renderAdminSettings();
}

async function updateAdminSecurity() {
    const newPass = document.getElementById('setAdminPass').value.trim();
    if (!newPass) return;
    systemConfig.admin_password = newPass;
    await saveSystemConfig();
    alert("Updated!");
}

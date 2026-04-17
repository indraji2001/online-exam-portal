// ==========================================
// GOOGLE API & AUTHENTICATION (FIXED)
// ==========================================

function initGoogleApi() {
    gapi.load('client', {
        callback: function () {
            gapi.client.init({
                apiKey: GOOGLE_API_KEY,
                discoveryDocs: [
                    "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
                    "https://sheets.googleapis.com/$discovery/rest?version=v4"
                ],
            }).then(function () {
                console.log('GAPI client initialized successfully');
                if (google && google.accounts && google.accounts.oauth2) {
                    checkExistingToken();
                }
            }).catch(function (error) {
                console.error('Error initializing GAPI client:', error);
            });
        },
        onerror: function () {
            console.error('Failed to load GAPI client');
        }
    });
}

function checkExistingToken() {
    const token = localStorage.getItem('google_access_token');
    const expiry = localStorage.getItem('google_token_expiry');
    if (token && expiry && Date.now() < parseInt(expiry)) {
        gapi.client.setToken({ access_token: token });
        const user = JSON.parse(localStorage.getItem('google_user') || '{}');
        if (user.name) {
            currentUser = user;
            handleAuthSuccess();
        }
    }
}

function checkEnvironment() {
    const token = localStorage.getItem('google_access_token');
    const expiry = localStorage.getItem('google_token_expiry');
    const user = localStorage.getItem('google_user');

    if (token && expiry && Date.now() < parseInt(expiry) && user) {
        currentUser = JSON.parse(user);
        
        // Unified Drive Naming Logic (v4.9)
        if (currentUser.email === 'chemistrydept@maldacollege.ac.in') {
            DRIVE_CONFIG.mainFolder = "Chemistry Department Exam Portal";
        } else {
            DRIVE_CONFIG.mainFolder = "Chemistry Department Exam Portal"; // Fixed name for everyone to prevent duplicate folders
        }
        
        gapi.client.setToken({ access_token: token });
        
        // v4.9 SECURITY FIX: Hide portal until identity is confirmed
        document.getElementById('mainPortal').classList.add('hidden');
        handleAuthSuccess();
    } else {
        showAuthModal();
    }
}

function showAuthModal() {
    document.getElementById('authContainer').classList.remove('hidden');

    // Bypass the popup blocker by binding the flow directly to a custom button
    document.getElementById('googleSignInButton').innerHTML = `
        <button onclick="requestDriveAccess()" class="pearl-btn pearl-btn-blue w-full py-4 rounded-xl font-bold text-lg text-white mt-4">
            âœ§ Sign in with Google
        </button>
    `;
}

function handleAuthSuccess() {
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('accountBar').classList.remove('hidden');
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userEmail').textContent = currentUser.email;

    if (currentUser.image) {
        document.getElementById('userAvatar').src = currentUser.image;
        document.getElementById('userAvatar').classList.remove('hidden');
    }

    // Role Detection Logic - v4.9 Departmental
    document.getElementById('welcomeUserEmail').textContent = currentUser.email;
    document.getElementById('identityModal').classList.remove('hidden-section');
    
    // Auto-detect available roles for this email
    const isAdmin = AUTHORIZED_ADMINS.includes(currentUser.email.toLowerCase());
    const isDept = currentUser.email.toLowerCase() === DEPARTMENTAL_ACCOUNT;

    if (isAdmin) document.getElementById('btnRoleAdmin').classList.remove('hidden');
    if (isDept) document.getElementById('btnRoleFaculty').classList.remove('hidden');

    // If neither, show warning
    if (!isAdmin && !isDept) {
        document.getElementById('wrongAccountWarning').classList.remove('hidden');
    }
}

function resetAuthFlow() {
    // Hide the identity modal and return to main landing
    document.getElementById('identityModal').classList.add('hidden-section');
    
    // Re-initialize and show the login screen with the button
    showAuthModal();
    
    // Reset steps back to the first one for the next attempt
    document.getElementById('roleSelectionStep').classList.remove('hidden-section');
    document.getElementById('adminDriveStep').classList.add('hidden-section');
    document.getElementById('facultyNameStep').classList.add('hidden-section');
}

function selectRole(role) {
    if (role === 'admin') {
        document.getElementById('roleSelectionStep').classList.add('hidden-section');
        document.getElementById('adminDriveStep').classList.remove('hidden-section');
    } else {
        document.getElementById('roleSelectionStep').classList.add('hidden-section');
        document.getElementById('facultyNameStep').classList.remove('hidden-section');
    }
}

async function confirmAdminEntry(scope) {
    userRole = 'admin';
    storageScope = scope;
    
    if (scope === 'departmental') {
        DRIVE_CONFIG.mainFolder = "Chemistry Department Exam Portal";
        // In departmental mode, the Admin is identified by their name in the registry
        currentUser.facultyName = currentUser.name; 
    } else {
        DRIVE_CONFIG.mainFolder = `Online Exam Portal (${currentUser.name})`;
    }

    await prepareDriveAndConfig();
    document.getElementById('identityModal').classList.add('hidden-section');
    document.getElementById('mainPortal').classList.remove('hidden');
    document.getElementById('tab-settings').classList.remove('hidden');
    setupMainFolder(true);
}

function setAuthMode(mode) {
    currentAuthMode = mode;
    const btnReturning = document.getElementById('authModeReturning');
    const btnNew = document.getElementById('authModeNew');
    const pinContainer = document.getElementById('pinContainer');
    const newInfo = document.getElementById('newInfoContainer');
    const entryBtn = document.getElementById('facultyEntryBtn');

    if (mode === 'returning') {
        btnReturning.classList.add('bg-white', 'shadow-sm', 'text-blue-600');
        btnReturning.classList.remove('text-slate-400');
        btnNew.classList.remove('bg-white', 'shadow-sm', 'text-blue-600');
        btnNew.classList.add('text-slate-400');
        pinContainer.classList.remove('hidden-section');
        newInfo.classList.add('hidden-section');
        entryBtn.innerHTML = '<span>ðŸ”</span> Unlock My Private Vault';
    } else {
        btnNew.classList.add('bg-white', 'shadow-sm', 'text-blue-600');
        btnNew.classList.remove('text-slate-400');
        btnReturning.classList.remove('bg-white', 'shadow-sm', 'text-blue-600');
        btnReturning.classList.add('text-slate-400');
        pinContainer.classList.add('hidden-section');
        newInfo.classList.remove('hidden-section');
        entryBtn.innerHTML = '<span>âœ¨</span> Register & Enter Vault';
    }
}

async function confirmFacultyEntry() {
    const name = document.getElementById('facultyNameClaim').value.trim();
    const pin = document.getElementById('facultyPinClaim').value.trim();
    
    if (!name) { alert("Please enter your name."); return; }
    
    if (currentAuthMode === 'returning') {
        if (!pin) { alert("Please enter your Faculty PIN."); return; }
        await verifyFacultyLogin(name, pin);
    } else {
        await registerNewFaculty(name);
    }
}

async function verifyFacultyLogin(name, pin) {
    const verifyBtn = document.getElementById('facultyEntryBtn');
    if (verifyBtn) { verifyBtn.disabled = true; verifyBtn.textContent = 'Verifying...'; }

    // Verify against Supabase cloud registry
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
            alert('A network error occurred. Please try again.');
            if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.innerHTML = '<span>ðŸ”</span> Unlock My Private Vault'; }
            return;
        }
        faculty = data;
    } else {
        // Fallback: check local config if Supabase not available
        if (systemConfig && systemConfig.faculty) {
            faculty = systemConfig.faculty.find(f =>
                f.name.toLowerCase() === name.toLowerCase() && f.pin === pin
            );
        }
    }

    if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.innerHTML = '<span>ðŸ”</span> Unlock My Private Vault'; }

    if (!faculty) {
        alert("âŒ Invalid Name or PIN. Please contact the administrator for your registered name and PIN.");
        return;
    }

    await initializeFacultyPortal(faculty);
}

async function registerNewFaculty(name) {
    const verifyBtn = document.getElementById('facultyEntryBtn');
    if (verifyBtn) { verifyBtn.disabled = true; verifyBtn.textContent = 'Registering...'; }

    if (supabaseClient) {
        // Check if name is already taken
        const { data: existing } = await supabaseClient
            .from('faculty_registry')
            .select('id')
            .ilike('name', name)
            .maybeSingle();

        if (existing) {
            alert(`âš ï¸ "${name}" is already registered. If this is you, please use "Returning User" mode and enter your PIN.`);
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
            alert('Cloud registration failed. Please check your connection.');
            if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.innerHTML = '<span>âœ¨</span> Register & Enter Vault'; }
            return;
        }

        pendingFaculty = data;
        revealSuccessScreen(newPin);
    } else {
        alert("Cloud registry unavailable. Admin must register you manually via Settings.");
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

    // Show Loading State in Modal
    const loadingHtml = `
        <div class="text-center py-10">
            <div class="animate-spin text-4xl mb-4">âš™ï¸</div>
            <h3 class="text-xl font-bold">Initializing Private Vault...</h3>
            <p class="text-slate-500 text-xs">Securing your departmental isolation zone</p>
        </div>
    `;

    const successStep = document.getElementById('facultySuccessStep');
    const nameStep = document.getElementById('facultyNameStep');

    if (!successStep.classList.contains('hidden-section')) {
        successStep.innerHTML = loadingHtml;
    } else {
        nameStep.innerHTML = loadingHtml;
    }

    // 1. Initial Drive Prep (Master Folder)
    await prepareDriveAndConfig();
    
    // 2. Identify the Master 'Instructors' Folder
    await setupInstructorsFolderOnly();

    // 3. SECURE ISOLATION: Re-scope the root to the Instructor's specific vault
    const facultyFolderId = await getOrCreateInstructorFolder(faculty.name);
    
    // THE MASTER LOCK: Redirect all future drive operations to this subfolder
    driveFolderId = facultyFolderId; 
    console.log("FACULTY LOCKED: Root re-scoped to Private Vault ID:", driveFolderId);

    // Finalize UI
    document.getElementById('identityModal').classList.add('hidden-section');
    document.getElementById('mainPortal').classList.remove('hidden');
    
    // Visual Confirmation Badge
    const badge = document.createElement('div');
    badge.className = "flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 shadow-sm ml-4";
    badge.innerHTML = `<span class="text-[10px] font-black uppercase tracking-widest">ðŸ“‚ Vault: ${faculty.name}</span>`;
    document.getElementById('accountBar').insertBefore(badge, document.getElementById('accountBar').firstChild);
    
    // Refresh library from the new isolated root
    loadLibrary();
}

async function setupInstructorsFolderOnly() {
    const response = await gapi.client.drive.files.list({
        q: `'${driveFolderId}' in parents and name='${DRIVE_CONFIG.instructorsFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        spaces: 'drive'
    });
    
    if (response.result.files.length === 0) {
        const folder = await gapi.client.drive.files.create({
            resource: { name: DRIVE_CONFIG.instructorsFolderName, mimeType: 'application/vnd.google-apps.folder', parents: [driveFolderId] },
            fields: 'id'
        });
        instructorsFolderId = folder.result.id;
    } else {
        instructorsFolderId = response.result.files[0].id;
    }
}

// ==========================================
// v4.6 IDENTITY & ROLE MANAGEMENT
// ==========================================

function selectAccountType(role) {
    document.getElementById('facultyForm').classList.add('hidden-section');
    document.getElementById('adminForm').classList.add('hidden-section');

    if (role === 'admin') {
        document.getElementById('adminForm').classList.remove('hidden-section');
    } else {
        document.getElementById('facultyForm').classList.remove('hidden-section');
    }
}

async function initSystemConfig() {
    if (!driveFolderId) return;

    try {
        const response = await gapi.client.drive.files.list({
            q: `name='system_config.json' and '${driveFolderId}' in parents and trashed=false`,
            spaces: 'drive'
        });

        if (response.result.files.length === 0) {
            // Create default config if not exists
            systemConfig = {
                admin_password: "admin", 
                faculty: [
                    { email: "faculty@example.com", pin: "1234", name: "Sample Professor" }
                ]
            };
            await gapi.client.drive.files.create({
                resource: { name: 'system_config.json', parents: [driveFolderId] },
                media: { mimeType: 'application/json', body: JSON.stringify(systemConfig, null, 2) }
            });
        } else {
            const fileId = response.result.files[0].id;
            const content = await gapi.client.drive.files.get({ fileId: fileId, alt: 'media' });
            systemConfig = typeof content.result === 'string' ? JSON.parse(content.result) : content.result;
        }
    } catch (err) {
        console.error('Error loading system config:', err);
    }
}

async function prepareDriveAndConfig() {
    try {
        // 1. Find or Create Master Folder
        const response = await gapi.client.drive.files.list({
            q: `name='${DRIVE_CONFIG.mainFolder}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            spaces: 'drive'
        });

        if (response.result.files.length === 0) {
            const folder = await gapi.client.drive.files.create({
                resource: { name: DRIVE_CONFIG.mainFolder, mimeType: 'application/vnd.google-apps.folder' }, fields: 'id'
            });
            driveFolderId = folder.result.id;
        } else {
            driveFolderId = response.result.files[0].id;
        }

        console.log("Drive Initialized at:", DRIVE_CONFIG.mainFolder);
    } catch (err) {
        console.error("Initialization Error:", err);
        alert("Critical: Could not connect to Google Drive. Check your connection.");
    }
}

function verifyAdmin() {
    const pwd = document.getElementById('adminPass').value;
    
    // Fallback: If the config file hasn't loaded yet, use the emergency 'admin' password
    const masterPass = (systemConfig && systemConfig.admin_password) ? systemConfig.admin_password : "admin";
    
    if (pwd === masterPass) {
        userRole = 'admin';
        document.getElementById('identityModal').classList.add('hidden-section');
        document.getElementById('mainPortal').classList.remove('hidden');
        
        // Correctly reveal the admin settings tab
        document.getElementById('tab-settings').classList.remove('hidden');
        renderAdminSettings();
        
        // Finalize Folder structure & ENSURE config file exists
        setupMainFolder(true); 
        saveSystemConfig(); // Force a save to Drive now that we are in!
    } else {
        alert("Access Denied. If this is a new setup, your default password is 'admin'.");
    }
}

// ==========================================
// ADMIN SETTINGS & REGISTRY LOGIC
// ==========================================

async function renderAdminSettings() {
    // Update Password Field
    if (systemConfig) document.getElementById('setAdminPass').value = systemConfig.admin_password;

    // Render Faculty List from Supabase
    const list = document.getElementById('facultyRegistryList');
    list.innerHTML = '<tr><td colspan="3" class="py-8 text-center text-slate-400"><span class="animate-spin inline-block mr-2">âš™ï¸</span> Loading from cloud...</td></tr>';

    if (supabaseClient) {
        const { data: faculty, error } = await supabaseClient
            .from('faculty_registry')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            list.innerHTML = '<tr><td colspan="3" class="py-8 text-center text-rose-400">âŒ Failed to load registry from cloud.</td></tr>';
            return;
        }

        if (!faculty || faculty.length === 0) {
            list.innerHTML = '<tr><td colspan="3" class="py-8 text-center text-slate-400 italic">No faculty members registered yet.</td></tr>';
            return;
        }

        list.innerHTML = '';
        faculty.forEach((member) => {
            const tr = document.createElement('tr');
            tr.className = "group hover:bg-slate-50 transition-colors";
            const joinDate = new Date(member.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            tr.innerHTML = `
                <td class="py-5">
                    <div class="font-bold text-slate-900">${member.name}</div>
                    <div class="text-[10px] text-slate-400 mt-0.5">Joined: ${joinDate}</div>
                </td>
                <td class="py-5 text-center">
                    <span class="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg font-black text-xs tracking-widest text-emerald-700">${member.pin}</span>
                </td>
                <td class="py-5 text-right">
                    <button onclick="removeFacultyById('${member.id}', '${member.name}')" class="text-rose-400 hover:text-rose-600 font-bold text-[10px] uppercase tracking-widest">Remove</button>
                </td>
            `;
            list.appendChild(tr);
        });
    } else {
        // Fallback to local config
        if (!systemConfig || !systemConfig.faculty || systemConfig.faculty.length === 0) {
            list.innerHTML = '<tr><td colspan="3" class="py-8 text-center text-slate-400 italic">No faculty members registered.</td></tr>';
            return;
        }
        list.innerHTML = '';
        systemConfig.faculty.forEach((member, index) => {
            const tr = document.createElement('tr');
            tr.className = "group hover:bg-slate-50 transition-colors";
            tr.innerHTML = `
                <td class="py-5 font-bold text-slate-900">${member.name}</td>
                <td class="py-5 text-center"><span class="px-3 py-1 bg-slate-100 rounded-lg font-black text-xs tracking-widest text-slate-600">${member.pin}</span></td>
                <td class="py-5 text-right"><button onclick="removeFaculty(${index})" class="text-rose-400 hover:text-rose-600 font-bold text-[10px] uppercase tracking-widest">Remove</button></td>
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
        <p class="text-xs text-slate-400 mb-6">A unique PIN will be auto-generated and saved to the cloud registry.</p>
        <div class="space-y-4 mb-8">
            <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-left ml-2">Display Name</label>
                <input type="text" id="newFacName" placeholder="e.g. Dr. Sen" class="w-full p-4 border-2 rounded-xl font-bold bg-slate-50 outline-none focus:border-blue-400 transition">
            </div>
            <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-left ml-2">Auto-Generated PIN</label>
                <div class="flex gap-3 items-center">
                    <input type="text" id="newFacPin" value="${autoPin}" maxlength="4" class="flex-1 p-4 border-2 rounded-xl font-black text-2xl bg-emerald-50 border-emerald-200 outline-none text-center tracking-[0.5em] text-emerald-700">
                    <button onclick="document.getElementById('newFacPin').value=generatePin()" class="px-4 py-4 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-600 text-sm transition whitespace-nowrap">ðŸ”„ New PIN</button>
                </div>
                <p class="text-[10px] text-slate-400 mt-2 ml-2">Share this PIN privately with the faculty member. It cannot be recovered later.</p>
            </div>
        </div>
        <div class="flex gap-4">
            <button onclick="closeSettingsModal()" class="flex-1 py-4 bg-slate-100 rounded-xl font-bold">Cancel</button>
            <button onclick="commitAddFaculty()" class="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition">âœ… Register to Cloud</button>
        </div>
    `;

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('opacity-100');
        content.classList.remove('scale-95');
    }, 10);
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    const content = document.getElementById('settingsModalContent');
    modal.classList.remove('opacity-100');
    content.classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

async function commitAddFaculty() {
    const name = document.getElementById('newFacName').value.trim();
    const pin = document.getElementById('newFacPin').value.trim();

    if (!name || !pin) { alert("All fields are required."); return; }
    if (pin.length !== 4 || isNaN(pin)) { alert("PIN must be exactly 4 digits."); return; }

    const commitBtn = document.querySelector('#settingsModalContent button[onclick="commitAddFaculty()"]');
    if (commitBtn) { commitBtn.disabled = true; commitBtn.textContent = 'Saving...'; }

    if (supabaseClient) {
        // Check if name already exists
        const { data: existing } = await supabaseClient
            .from('faculty_registry')
            .select('id')
            .ilike('name', name)
            .maybeSingle();

        if (existing) {
            alert(`"${name}" is already registered. Each faculty member must have a unique name.`);
            if (commitBtn) { commitBtn.disabled = false; commitBtn.textContent = 'âœ… Register to Cloud'; }
            return;
        }

        const { error } = await supabaseClient
            .from('faculty_registry')
            .insert([{ name, pin }]);

        if (error) {
            console.error('Supabase insert error:', error);
            alert('Failed to save to cloud. Please try again.');
            if (commitBtn) { commitBtn.disabled = false; commitBtn.textContent = 'âœ… Register to Cloud'; }
            return;
        }
    } else {
        // Fallback to local config
        if (!systemConfig.faculty) systemConfig.faculty = [];
        systemConfig.faculty.push({ name, pin });
        await saveSystemConfig();
    }

    closeSettingsModal();
    renderAdminSettings();
    alert(`âœ… ${name} has been registered!\n\nTheir PIN is: ${pin}\n\nPlease share this with them privately.`);
}

async function removeFaculty(index) {
    if (!confirm("Are you sure you want to remove this faculty member? Their private folder will remain but they will lose access.")) return;
    
    systemConfig.faculty.splice(index, 1);
    await saveSystemConfig();
    renderAdminSettings();
}

async function removeFacultyById(id, name) {
    if (!confirm(`Are you sure you want to remove "${name}" from the registry?\n\nTheir private Drive folder will remain, but they will lose portal access.`)) return;

    if (supabaseClient) {
        const { error } = await supabaseClient
            .from('faculty_registry')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Supabase delete error:', error);
            alert('Failed to remove from cloud registry. Please try again.');
            return;
        }
    }

    renderAdminSettings();
}

async function updateAdminSecurity() {
    const newPass = document.getElementById('setAdminPass').value.trim();
    if (!newPass) { alert("Password cannot be empty."); return; }

    systemConfig.admin_password = newPass;
    await saveSystemConfig();
    alert("Master Password Successfully Updated.");
}

async function saveSystemConfig() {
    if (!driveFolderId) return;

    try {
        // Find existing config file
        const response = await gapi.client.drive.files.list({
            q: `name='system_config.json' and '${driveFolderId}' in parents and trashed=false`,
            spaces: 'drive'
        });

        const metadata = { name: 'system_config.json' };
        if (response.result.files.length > 0) {
            // Update existing
            const fileId = response.result.files[0].id;
            await gapi.client.drive.files.update({
                fileId: fileId,
                media: { mimeType: 'application/json', body: JSON.stringify(systemConfig, null, 2) }
            });
        } else {
            // Create new
            await gapi.client.drive.files.create({
                resource: { name: 'system_config.json', parents: [driveFolderId] },
                media: { mimeType: 'application/json', body: JSON.stringify(systemConfig, null, 2) }
            });
        }
        console.log("System Config Persisted to Drive.");
    } catch (err) {
        console.error('Error saving config:', err);
    }
}

function verifyFaculty() {
    const pin = document.getElementById('facultyPin').value;
    if (!systemConfig) { alert("System configuration not loaded. Please wait."); return; }

    // Security Fix: Cross-check the current logged-in email with the PIN
    const professorIndex = systemConfig.faculty.findIndex(f => f.email && f.email.toLowerCase() === currentUser.email.toLowerCase() && f.pin === pin);
    
    if (professorIndex !== -1) {
        const professor = systemConfig.faculty[professorIndex];
        userRole = 'faculty';
        
        // Auto-Sync Name (Point #1): If they changed their name on Google, update the registry
        if (currentUser.name && currentUser.name !== professor.name) {
            console.log(`Auto-Syncing Name: ${professor.name} -> ${currentUser.name}`);
            systemConfig.faculty[professorIndex].name = currentUser.name;
            saveSystemConfig(); // Silently save in background
        }

        currentUser.facultyName = professor.name; 
        document.getElementById('genInstructor').value = professor.name;
        
        // Hide modal and show portal
        document.getElementById('identityModal').classList.add('hidden-section');
        document.getElementById('mainPortal').classList.remove('hidden');
        setupMainFolder();
    } else {
        alert("Access Denied: This PIN does not match your authorized email account.");
    }
}

function switchGoogleAccount() {
    // Revoke token if it exists
    const token = gapi.client ? gapi.client.getToken() : null;
    if (token && token.access_token) {
        google.accounts.oauth2.revoke(token.access_token, () => {
            console.log('Token revoked');
        });
    }

    // Clear all storage
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expiry');
    localStorage.removeItem('google_user');

    // Reset memory state
    gapi.client.setToken(null);
    currentUser = null;
    userRole = null;

    // Return to auth screen
    document.getElementById('accountBar').classList.add('hidden');
    document.getElementById('mainPortal').classList.add('hidden');
    showAuthModal();
}

function signOut() {
    switchGoogleAccount();
    location.reload(); // Refresh to ensure a clean state
}

// ==========================================
// ADMIN SETTINGS & REGISTRY (v4.9)
// ==========================================

function renderAdminSettings() {
    if (!systemConfig) return;
    
    document.getElementById('setAdminPass').value = systemConfig.admin_password;
    const list = document.getElementById('facultyRegistryList');
    list.innerHTML = systemConfig.faculty.map((f, i) => `
        <div class="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl shadow-sm group">
            <input type="email" placeholder="Email" value="${f.email}" class="flex-1 p-2 bg-slate-50 border rounded-lg text-xs font-bold" onchange="updateFacultyRecord(${i}, 'email', this.value)">
            <input type="text" placeholder="PIN" value="${f.pin}" maxlength="4" class="w-20 p-2 bg-slate-50 border rounded-lg text-xs text-center font-black tracking-widest" onchange="updateFacultyRecord(${i}, 'pin', this.value)">
            <button onclick="removeFacultyRow(${i})" class="w-8 h-8 rounded-lg text-rose-400 hover:bg-rose-50 transition">âœ•</button>
        </div>
    `).join('');
}

function updateFacultyRecord(index, field, value) {
    if (field === 'pin' && !/^\d{4}$/.test(value)) {
        alert("PIN must be exactly 4 digits.");
        return;
    }
    systemConfig.faculty[index][field] = value;
}

function addNewFacultyRow() {
    systemConfig.faculty.push({ email: "", pin: "0000", name: "Pending Login" });
    renderAdminSettings();
}

function removeFacultyRow(index) {
    if (confirm("Revoke access for this account?")) {
        systemConfig.faculty.splice(index, 1);
        renderAdminSettings();
    }
}

async function saveSystemConfig(manual = false) {
    if (!driveFolderId || !systemConfig) return;
    
    // Update admin pass from UI if manual save
    if (manual) {
        systemConfig.admin_password = document.getElementById('setAdminPass').value;
    }

    try {
        const response = await gapi.client.drive.files.list({
            q: `name='system_config.json' and '${driveFolderId}' in parents and trashed=false`,
            spaces: 'drive'
        });

        const fileId = response.result.files[0].id;
        await gapi.client.drive.files.update({
            fileId: fileId,
            media: { mimeType: 'application/json', body: JSON.stringify(systemConfig, null, 2) }
        });
        
        if (manual) alert("âœ… System Records Securely Updated on Drive!");
    } catch (err) {
        console.error('Error saving system config:', err);
    }
}

// AI Mode & Manual Flow
function toggleAiMode() {
    const engine = document.getElementById('aiEngine').value;
    const panel = document.getElementById('manualAiPanel');
    
    if (engine === 'manual') {
        panel.classList.remove('hidden-section');
    } else {
        panel.classList.add('hidden-section');
    }
}

async function processManualResponse() {
    const rawData = document.getElementById('manualAiResponse').value;
    if (!rawData.trim()) {
        alert("Please paste the AI's JSON output first.");
        return;
    }

    try {
        // Clean markdown tags if user copied the whole code block
        const cleanJson = rawData.replace(/```json|```/gi, '').trim();
        const parsed = JSON.parse(cleanJson);
        
        // Pass to the existing library/state handlers
        if (Array.isArray(parsed)) {
            // Store locally
            localStorage.setItem('temp_manual_batch', JSON.stringify(parsed));
            alert(`Succesfully parsed ${parsed.length} questions! Head to the "Import" tab to build your exam sets.`);
            
            // Populate the import textarea automatically
            document.getElementById('aiOutputPaste').value = cleanJson;
            showTab('import');
        } else {
            throw new Error("Pasted data is not a valid question array.");
        }
    } catch (e) {
        console.error(e);
        alert("JSON Error: The pasted data is not valid JSON. Please ensure you copied the entire code block from your AI.");
    }
}


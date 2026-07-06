// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Detect student mode FIRST, before anything else
    const params = new URLSearchParams(location.search);
    const isStudentMode = params.get('mode') === 'student';

    if (isStudentMode) {
        // STUDENT MODE: Skip ALL Google Auth — students only need Name + ID
        // Hide all faculty/admin UI elements immediately, before any async load
        document.getElementById('authContainer')?.classList.add('hidden');
        document.getElementById('identityModal')?.classList.add('hidden-section');
        document.getElementById('accountBar')?.classList.add('hidden');
        document.getElementById('mainPortal')?.classList.add('hidden');

        initSupabase(); // needed for result submission
        checkStudentMode();
        initLibrary();
        return; // ← EXIT EARLY: do not load Google API at all
    }

    // FACULTY/ADMIN MODE ONLY below this line
    const now = new Date();
    const later = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    document.getElementById('linkStartTime').value = now.toISOString().slice(0, 16);
    document.getElementById('linkEndTime').value = later.toISOString().slice(0, 16);

    initSupabase();
    initGoogleApi();
    checkEnvironment();
    updateSourceDisplay();
    loadDraft();
    initLibrary();
});

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
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'student') return; // Skip checking token in student mode
    
    const token = safeStorage.get('google_access_token');
    const expiry = safeStorage.get('google_token_expiry');
    if (token && expiry && Date.now() < parseInt(expiry)) {
        if (typeof gapi !== 'undefined' && gapi.client) {
            gapi.client.setToken({ access_token: token });
        }
        const userStr = safeStorage.get('google_user');
        const user = userStr ? JSON.parse(userStr) : {};
        if (user.name) {
            currentUser = user;
            handleAuthSuccess();
        }
    }
}

function checkEnvironment() {
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'student') return; // Skip environment check for student mode
    
    const token = safeStorage.get('google_access_token');
    const expiry = safeStorage.get('google_token_expiry');
    const user = safeStorage.get('google_user');

    if (token && expiry && Date.now() < parseInt(expiry) && user) {
        currentUser = JSON.parse(user);
        
        // Unified Drive Naming Logic (v4.9)
        if (currentUser.email === 'chemistrydept@maldacollege.ac.in') {
            DRIVE_CONFIG.mainFolder = "Chemistry Department Exam Portal";
        } else {
            DRIVE_CONFIG.mainFolder = "Chemistry Department Exam Portal"; // Fixed name for everyone to prevent duplicate folders
        }
        
        if (typeof gapi !== 'undefined' && gapi.client) {
            gapi.client.setToken({ access_token: token });
        }
        
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
            ✧ Sign in with Google
        </button>
    `;
}

// ==========================================
// NAVIGATION & CORE UI
// ==========================================

function requestDriveAccess() {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
        alert("Google Identity Services not loaded. Please check your internet connection or disable ad-blockers.");
        return;
    }

    try {
        const client = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    gapi.client.setToken({ access_token: tokenResponse.access_token });
                    safeStorage.set('google_access_token', tokenResponse.access_token);
                    safeStorage.set('google_token_expiry', Date.now() + (tokenResponse.expires_in * 1000));

                    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                        headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                    })
                        .then(res => res.json())
                        .then(profile => {
                            currentUser = { name: profile.name, email: profile.email, image: profile.picture };
                            
                            // Unified Drive Naming Logic (v4.9)
                            if (normalizeEmail(profile.email) === DEPARTMENTAL_ACCOUNT) {
                                DRIVE_CONFIG.mainFolder = "Chemistry Department Exam Portal";
                            } else {
                                DRIVE_CONFIG.mainFolder = "Chemistry Department Exam Portal"; 
                            }
                            
                            safeStorage.set('google_user', JSON.stringify(currentUser));
                            handleAuthSuccess();
                        })
                        .catch(err => {
                            console.error('Userinfo fetch failed:', err);
                            alert("Failed to retrieve user profile. Please try again.");
                        });
                }
            },
            error_callback: (err) => {
                console.error('Google Auth Error:', err);
                if (err.type === 'popup_blocked_by_browser') {
                    alert('Popup blocked! Please allow popups for this site to sign in.');
                } else {
                    alert('Sign-in Error: ' + (err.message || 'Verification failed. Try refreshing the page.'));
                }
            }
        });

        // Forced account selection to ensure fresh login
        client.requestAccessToken({ prompt: 'select_account' });
    } catch (e) {
        console.error("Auth initialization failed:", e);
        alert("Authentication failed to start. Please check if your browser allows third-party cookies.");
    }
}

async function handleAuthSuccess() {
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'student') {
        document.getElementById('authContainer')?.classList.add('hidden');
        document.getElementById('identityModal')?.classList.add('hidden-section');
        document.getElementById('accountBar')?.classList.add('hidden');
        return;
    }

    // 1. Hide the entry modal and show base UI
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('mainPortal').classList.add('hidden'); // Keep portal hidden until role is verified
    document.getElementById('accountBar').classList.remove('hidden');
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userEmail').textContent = currentUser.email;

    if (currentUser.image) {
        document.getElementById('userAvatar').src = currentUser.image;
        document.getElementById('userAvatar').classList.remove('hidden');
    }

    // 2. Prepare Role Verification Modal
    document.getElementById('welcomeUserEmail').textContent = currentUser.email;
    document.getElementById('identityModal').classList.remove('hidden-section');
    
    // UI RESET: Hide everything until check completes
    document.getElementById('btnRoleAdmin').classList.add('hidden');
    document.getElementById('btnRoleFaculty').classList.add('hidden');
    document.getElementById('wrongAccountWarning').classList.add('hidden');
    
    // Show Loading Spinner during verification
    const roleStep = document.getElementById('roleSelectionStep');
    const originalRoleHtml = roleStep.innerHTML;
    roleStep.innerHTML = `
        <div class="py-10 text-center">
            <div class="animate-spin text-4xl mb-4">🛡️</div>
            <h3 class="text-xl font-black text-slate-800">Verifying Permissions...</h3>
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Checking Google Auth Registry</p>
        </div>
    `;

    try {
        const verifiedRole = await verifyCurrentUserRole(true); // Force refresh for accuracy
        const isAdmin = verifiedRole === 'admin';
        const isDept = verifiedRole === 'faculty' || (verifiedRole === 'admin' && ADMINS_CAN_ACT_AS_FACULTY);

        // Restore original UI
        roleStep.innerHTML = originalRoleHtml;
        document.getElementById('welcomeUserEmail').textContent = currentUser.email;

        if (isAdmin && normalizeEmail(currentUser.email) !== DEPARTMENTAL_ACCOUNT) {
            document.getElementById('btnRoleAdmin').classList.remove('hidden');
        }
        if (isDept) document.getElementById('btnRoleFaculty').classList.remove('hidden');

        if (!isAdmin && !isDept) {
            document.getElementById('wrongAccountWarning').classList.remove('hidden');
            checkPendingRequest(normalizeEmail(currentUser.email));
        }
        
        if (typeof renderVerifiedTokens === 'function') renderVerifiedTokens();

    } catch (e) {
        console.error("Role verification failed:", e);
        roleStep.innerHTML = originalRoleHtml;
        alert("Role verification encountered an error. Please reload.");
    }
}

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

async function sha256Hex(value) {
    const bytes = new TextEncoder().encode(value);
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hashBuffer)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function sha256Prefix(value) {
    // Simple fast prefix for internal IDs
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) - hash) + value.charCodeAt(i);
        hash |= 0; 
    }
    return Math.abs(hash).toString(16);
}

async function getAuthorizedRole(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return { role: 'student', record: null };

    // Emergency bootstrap: Priority access for departmental and admin accounts
    if (normalizedEmail === DEPARTMENTAL_ACCOUNT || normalizedEmail === 'chemistrydept@maldacollege.ac.in') {
        return { role: 'faculty', record: { email: normalizedEmail, role: 'faculty', active: true, emergency: true } };
    }
    if (AUTHORIZED_ADMINS.includes(normalizedEmail)) {
        return { role: 'admin', record: { email: normalizedEmail, role: 'admin', active: true, emergency: true } };
    }

    try {
        const token = safeStorage.get('google_access_token');
        if (token) {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-role`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const data = await response.json().catch(() => ({}));
            if (response.ok && (data.role === 'admin' || data.role === 'faculty')) {
                return { role: data.role, record: { email: data.email, role: data.role, display_name: data.display_name, active: true } };
            }
        }
    } catch (e) {
        console.error('Authorization fetch failed:', e);
    }

    return { role: 'student', record: null };
}

async function verifyCurrentUserRole(forceRefresh = false) {
    if (!currentUser || !currentUser.email) {
        currentAuthorization = { role: 'student', record: null, checkedAt: Date.now() };
        userRole = null;
        return 'student';
    }

    const normalizedEmail = normalizeEmail(currentUser.email);
    currentUser.email = normalizedEmail;

    if (!forceRefresh && currentAuthorization.checkedAt && currentAuthorization.record && currentAuthorization.record.email === normalizedEmail) {
        return currentAuthorization.role;
    }

    const authorization = await getAuthorizedRole(normalizedEmail);
    currentAuthorization = { ...authorization, checkedAt: Date.now() };
    if (authorization.role === 'student' && userRole !== 'student') userRole = null;
    return authorization.role;
}

function denyPrivilegedAccess(message = 'Access denied.') {
    alert(message);
    document.getElementById('mainPortal')?.classList.add('hidden');
    document.getElementById('tab-settings')?.classList.add('hidden');
    return false;
}

function requireRole(allowedRoles) {
    const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!allowed.includes(userRole)) {
        return denyPrivilegedAccess('Access denied.');
    }
    return true;
}

async function callSecureFacultyFunction(action, payload = {}) {
    const token = localStorage.getItem('google_access_token');
    if (!token) throw new Error('Missing Google token. Please sign in again.');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/faculty-admin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Secure faculty operation failed.');
    return data;
}

async function checkPendingRequest(email) {
    if (!supabaseClient) return;
    const requestAccessFlow = $('requestAccessFlow');
    const requestPendingStatus = $('requestPendingStatus');
    if (!requestAccessFlow || !requestPendingStatus) return;
    
    const { data } = await supabaseClient
        .from('access_requests')
        .select('*')
        .eq('email', email)
        .maybeSingle();
        
    if (data) {
        requestAccessFlow.classList.add('hidden');
        requestPendingStatus.classList.remove('hidden');
    } else {
        requestAccessFlow.classList.remove('hidden');
        requestPendingStatus.classList.add('hidden');
    }
}

async function submitAccessRequest() {
    if (!supabaseClient || !currentUser) return;
    
    const role = getValue('requestedRole', 'faculty');
    const btn = $('btnSubmitRequest');
    if (!btn) return;
    
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    
    const { error } = await supabaseClient
        .from('access_requests')
        .insert([{
            email: currentUser.email.toLowerCase(),
            name: currentUser.name,
            requested_role: role
        }]);
        
    if (error) {
        alert('Error submitting request: ' + error.message);
        btn.disabled = false;
        btn.textContent = 'Request Permission';
    } else {
        const requestAccessFlow = $('requestAccessFlow');
        const requestPendingStatus = $('requestPendingStatus');
        if (requestAccessFlow) requestAccessFlow.classList.add('hidden');
        if (requestPendingStatus) requestPendingStatus.classList.remove('hidden');
    }
}

function resetAuthFlow() {
    // Hide the identity modal and return to main landing
    document.getElementById('identityModal').classList.add('hidden-section');
    
    // Reset authorization UI state for safety
    document.getElementById('btnRoleAdmin').classList.add('hidden');
    document.getElementById('btnRoleFaculty').classList.add('hidden');
    document.getElementById('wrongAccountWarning').classList.add('hidden');

    // Re-initialize and show the login screen with the button
    showAuthModal();
    
    // Reset steps back to the first one for the next attempt
    document.getElementById('roleSelectionStep').classList.remove('hidden-section');
    document.getElementById('adminDriveStep').classList.add('hidden-section');
    document.getElementById('facultyNameStep').classList.add('hidden-section');
}

async function selectRole(role) {
    const verifiedRole = await verifyCurrentUserRole(true);

    if (role === 'admin') {
        if (verifiedRole !== 'admin') {
            denyPrivilegedAccess('This Google account is not authorized for admin access.');
            return;
        }
        document.getElementById('roleSelectionStep').classList.add('hidden-section');
        document.getElementById('adminDriveStep').classList.remove('hidden-section');
    } else {
        if (verifiedRole !== 'faculty' && !(verifiedRole === 'admin' && ADMINS_CAN_ACT_AS_FACULTY)) {
            denyPrivilegedAccess('This Google account is not authorized for faculty access. You may only access student exam links.');
            return;
        }
        document.getElementById('roleSelectionStep').classList.add('hidden-section');
        document.getElementById('facultyNameStep').classList.remove('hidden-section');
        document.getElementById('facultyNameClaim').value = currentAuthorization.record?.display_name || currentUser.name || '';
        
        // Show First-Time Entry only for departmental account
        const isDept = normalizeEmail(currentUser.email) === DEPARTMENTAL_ACCOUNT || normalizeEmail(currentUser.email) === 'chemistrydept@maldacollege.ac.in';
        if (isDept) {
            document.getElementById('authModeNew').classList.remove('hidden');
        } else {
            document.getElementById('authModeNew').classList.add('hidden');
        }
        
        setAuthMode('returning');
    }
}

async function confirmAdminEntry(scope) {
    const verifiedRole = await verifyCurrentUserRole(true);
    if (verifiedRole !== 'admin') {
        denyPrivilegedAccess('This Google account is not authorized for admin access.');
        return;
    }

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
    const isDept = normalizeEmail(currentUser.email) === DEPARTMENTAL_ACCOUNT || normalizeEmail(currentUser.email) === 'chemistrydept@maldacollege.ac.in';
    if (mode !== 'returning' && !isDept) {
        alert("Faculty self-registration is disabled. An admin must add your Google email first.");
        mode = 'returning';
    }
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
        entryBtn.innerHTML = '<span>🔐</span> Unlock My Private Vault';
    } else {
        btnNew.classList.add('bg-white', 'shadow-sm', 'text-blue-600');
        btnNew.classList.remove('text-slate-400');
        btnReturning.classList.remove('bg-white', 'shadow-sm', 'text-blue-600');
        btnReturning.classList.add('text-slate-400');
        pinContainer.classList.add('hidden-section');
        newInfo.classList.remove('hidden-section');
        entryBtn.innerHTML = '<span>✨</span> Register & Enter Vault';
    }
}

async function confirmFacultyEntry() {
    const name = document.getElementById('facultyNameClaim').value.trim();
    if (!name) { alert("Please enter your name."); return; }
    
    if (currentAuthMode === 'new') {
        await registerNewFaculty(name);
    } else {
        const pin = document.getElementById('facultyPinClaim').value.trim();
        if (!pin) { alert("Please enter your Faculty PIN."); return; }
        await verifyFacultyLogin(name, pin);
    }
}

async function verifyFacultyLogin(name, pin) {
    const verifyBtn = document.getElementById('facultyEntryBtn');
    if (verifyBtn) { verifyBtn.disabled = true; verifyBtn.textContent = 'Verifying...'; }

    const verifiedRole = await verifyCurrentUserRole(true);
    if (verifiedRole !== 'faculty' && !(verifiedRole === 'admin' && ADMINS_CAN_ACT_AS_FACULTY)) {
        if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.textContent = 'Unlock My Private Vault'; }
        denyPrivilegedAccess('This Google account is not authorized for faculty access. You may only access student exam links.');
        return;
    }

    // Verify against Supabase cloud registry directly (since RLS is disabled)
    let faculty = null;
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('faculty_registry')
                .select('*')
                .ilike('name', name)
                .maybeSingle();

            if (error) throw error;
            
            if (data) {
                // Check both hashed and plain text pins for compatibility
                const pinHash = await sha256Hex(pin);
                const matchesHash = data.pin_hash && data.pin_hash === pinHash;
                const matchesLegacyPin = data.pin && data.pin === pin;
                
                if (matchesHash || matchesLegacyPin) {
                    faculty = data;
                }
            }

            if (!faculty) {
                alert("Invalid Name or PIN.");
                if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.textContent = 'Unlock My Private Vault'; }
                return;
            }

            if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.textContent = 'Unlock My Private Vault'; }
            await initializeFacultyPortal(faculty);
            return;
        } catch (error) {
            console.error('Faculty verification error:', error);
            alert('Verification failed: ' + error.message);
            if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.textContent = 'Unlock My Private Vault'; }
            return;
        }
    }

    else {
        // Fallback: check local config if Supabase not available
        if (systemConfig && systemConfig.faculty) {
            const normalizedEmail = normalizeEmail(currentUser.email);
            faculty = systemConfig.faculty.find(f =>
                normalizeEmail(f.email) === normalizedEmail && f.pin === pin
            );
        }
    }

    if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.innerHTML = '<span>🔐</span> Unlock My Private Vault'; }

    if (!faculty) {
        alert("❌ Invalid Name or PIN. Please contact the administrator for your registered name and PIN.");
        return;
    }

    await initializeFacultyPortal(faculty);
}

async function registerNewFaculty(name) {
    const isDept = normalizeEmail(currentUser.email) === DEPARTMENTAL_ACCOUNT || normalizeEmail(currentUser.email) === 'chemistrydept@maldacollege.ac.in';
    if (!isDept) {
        alert("Faculty self-registration is disabled. An admin must add your Google email to the authorized faculty list.");
        return;
    }
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
            alert(`⚠️ "${name}" is already registered. If this is you, please use "Returning User" mode and enter your PIN.`);
            if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.innerHTML = '<span>✨</span> Register & Enter Vault'; }
            return;
        }

        const newPin = generatePin();
        
        try {
            // Use direct insert to bypass the Edge Function's "Admin required" restriction.
            // This works because of the "Enable shared account registration" policy.
            const { data, error } = await supabaseClient
                .from('faculty_registry')
                .insert([{ 
                    name, 
                    pin: newPin,
                    email: `faculty.${sha256Prefix(name)}@internal` // Virtual email for uniqueness
                }])
                .select()
                .single();

            if (error) throw error;

            pendingFaculty = data; 
            revealSuccessScreen(newPin);
        } catch (error) {
            console.error('Registration failed:', error);
            alert('Cloud registration failed: ' + (error.message || 'Please check your connection.'));
            if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.innerHTML = '<span>✨</span> Register & Enter Vault'; }
            return;
        }
    } else {
        alert("Cloud registry unavailable. Admin must register you manually via Settings.");
        if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.innerHTML = '<span>✨</span> Register & Enter Vault'; }
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
    if (pendingFaculty) {
        await initializeFacultyPortal(pendingFaculty);
    } else {
        alert("Session lost. Please use 'Returning User' mode to log in with your new PIN.");
    }
}

async function initializeFacultyPortal(faculty) {
    const verifiedRole = await verifyCurrentUserRole(true);
    if (verifiedRole !== 'faculty' && !(verifiedRole === 'admin' && ADMINS_CAN_ACT_AS_FACULTY)) {
        denyPrivilegedAccess('This Google account is not authorized for faculty access.');
        return;
    }

    userRole = 'faculty';
    storageScope = 'departmental';
    const facultyName = faculty.name || faculty.display_name || currentUser.name;
    currentUser.facultyName = facultyName;
    document.getElementById('genInstructor').value = facultyName;
    DRIVE_CONFIG.mainFolder = "Chemistry Department Exam Portal";

    // Show Loading State in Modal
    const loadingHtml = `
        <div class="text-center py-10">
            <div class="animate-spin text-4xl mb-4">⚙️</div>
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
    const facultyFolderId = await getOrCreateInstructorFolder(facultyName);
    
    // THE MASTER LOCK: Redirect all future drive operations to this subfolder
    driveFolderId = facultyFolderId; 
    console.log("FACULTY LOCKED: Root re-scoped to Private Vault ID:", driveFolderId);

    // Finalize UI
    document.getElementById('identityModal').classList.add('hidden-section');
    document.getElementById('mainPortal').classList.remove('hidden');
    
    // Visual Confirmation Badge
    const badge = document.createElement('div');
    badge.className = "flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 shadow-sm ml-4";
    badge.innerHTML = `<span class="text-[10px] font-black uppercase tracking-widest">📂 Vault: ${faculty.name}</span>`;
    badge.textContent = `Vault: ${facultyName}`;
    document.getElementById('accountBar').insertBefore(badge, document.getElementById('accountBar').firstChild);
    
    // Refresh library from the new isolated root
    loadLibrary();
}

async function setupInstructorsFolderOnly() {
    if (!requireRole(['admin', 'faculty'])) return;
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
    const facultyForm = $('facultyForm');
    const adminForm = $('adminForm');
    if (!facultyForm || !adminForm) return;

    facultyForm.classList.add('hidden-section');
    adminForm.classList.add('hidden-section');

    if (role === 'admin') {
        adminForm.classList.remove('hidden-section');
    } else {
        facultyForm.classList.remove('hidden-section');
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
                admin_password: null,
                faculty: []
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
    alert("Legacy shared admin passwords are disabled. Please sign in with an authorized Google admin account.");
}

// ==========================================
// ADMIN SETTINGS & REGISTRY LOGIC
// ==========================================

async function renderAdminSettings() {
    if (!requireRole('admin')) return;
    console.log("Admin Settings: Initializing...");
    
    // 1. Password
    if (systemConfig) {
        const passField = document.getElementById('setAdminPass');
        if (passField) passField.value = 'Managed in authorized_emails';
    }

    // 2. Database Connectivity Check
    if (!supabaseClient) {
        console.warn("Supabase client is null. Attempting re-init...");
        initSupabase(); 
    }

    // 3. Render Sections (Modularized for safety)

    renderFacultyRegistry();
    renderTokenRegistry();
}

async function renderFacultyRegistry() {
    if (!requireRole('admin')) return;
    const list = document.getElementById('facultyRegistryList');
    if (!list) return;

    list.innerHTML = '<tr><td colspan="3" class="py-8 text-center text-slate-400"><span class="animate-spin inline-block mr-2">⚙️</span> Loading from cloud...</td></tr>';

    if (supabaseClient) {
        try {
            const secureData = await callSecureFacultyFunction('listFaculty');
            const secureFaculty = secureData.faculty || [];

            if (secureFaculty.length === 0) {
                list.innerHTML = '<tr><td colspan="3" class="py-8 text-center text-slate-400 italic">No faculty members registered yet.</td></tr>';
                return;
            }

            list.innerHTML = '';
            secureFaculty.forEach((member) => {
                const tr = document.createElement('tr');
                tr.className = "group hover:bg-slate-50 transition-colors";
                const joinDate = member.created_at ? new Date(member.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pending';
                tr.innerHTML = `
                    <td class="py-5">
                        <div class="font-bold text-slate-900">${member.name}</div>
                        <div class="text-[10px] text-slate-400 mt-0.5">${member.email || 'No email'} · Joined: ${joinDate}</div>
                    </td>
                    <td class="py-5 text-center">
                        <span class="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg font-black text-xs tracking-widest text-emerald-700">${member.pin_hash ? 'Hashed' : 'Unset'}</span>
                    </td>
                    <td class="py-5 text-right">
                        <button onclick="removeFacultyById('${member.id}', '${member.name}', '${member.email || ''}')" class="text-rose-400 hover:text-rose-600 font-bold text-[10px] uppercase tracking-widest">Remove</button>
                    </td>
                `;
                list.appendChild(tr);
            });
        } catch (e) {
            console.error('Faculty Registry Error:', e);
            list.innerHTML = `<tr><td colspan="3" class="py-8 text-center text-rose-400">⚠️ Error: ${e.message}</td></tr>`;
        }
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

function renderTokenRegistry() {
    const list = document.getElementById('verifiedTokenList');
    if (!list) return;

    if (!verifiedTokens || verifiedTokens.length === 0) {
        list.innerHTML = '<div class="col-span-full py-8 text-center text-slate-400 italic font-medium">No verified tokens in registry.</div>';
        return;
    }

    list.innerHTML = '';
    verifiedTokens.forEach(token => {
        const div = document.createElement('div');
        div.className = "group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-blue-200 flex items-center gap-5";
        div.innerHTML = `
            <div class="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-blue-100 group-hover:scale-110 transition-transform">
                ${token.name.charAt(0)}
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                    <h4 class="font-black text-slate-900 truncate">${token.name}</h4>
                    ${token.verified ? '<span class="text-blue-500 text-[10px]">✔</span>' : ''}
                </div>
                <div class="font-mono text-[10px] text-slate-400 truncate tracking-tight mb-1">${token.address}</div>
                <div class="flex items-center gap-2">
                    <span class="text-[8px] font-black uppercase tracking-widest text-slate-400">${token.symbol}</span>
                    <span class="text-[8px] font-black uppercase text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Whitelisted</span>
                </div>
            </div>
            <button class="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
            </button>
        `;
        list.appendChild(div);
    });
}

function showAddFacultyModal() {
    if (!requireRole('admin')) return;
    const modal = document.getElementById('settingsModal');
    const content = document.getElementById('settingsModalContent');
    
    const autoPin = generatePin();
    content.innerHTML = `
        <h3 class="text-2xl font-black mb-2">Register Faculty</h3>
        <p class="text-xs text-slate-400 mb-6">A unique PIN will be auto-generated and saved to the cloud registry.</p>
        <div class="space-y-4 mb-8">
            <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-left ml-2">Google Email</label>
                <input type="email" id="newFacEmail" placeholder="faculty@example.com" class="w-full p-4 border-2 rounded-xl font-bold bg-slate-50 outline-none focus:border-blue-400 transition">
            </div>
            <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-left ml-2">Display Name</label>
                <input type="text" id="newFacName" placeholder="e.g. Dr. Sen" class="w-full p-4 border-2 rounded-xl font-bold bg-slate-50 outline-none focus:border-blue-400 transition">
            </div>
            <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-left ml-2">Auto-Generated PIN</label>
                <div class="flex gap-3 items-center">
                    <input type="text" id="newFacPin" value="${autoPin}" maxlength="4" class="flex-1 p-4 border-2 rounded-xl font-black text-2xl bg-emerald-50 border-emerald-200 outline-none text-center tracking-[0.5em] text-emerald-700">
                    <button onclick="document.getElementById('newFacPin').value=generatePin()" class="px-4 py-4 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-600 text-sm transition whitespace-nowrap">🔄 New PIN</button>
                </div>
                <p class="text-[10px] text-slate-400 mt-2 ml-2">Share this PIN privately with the faculty member. It cannot be recovered later.</p>
            </div>
        </div>
        <div class="flex gap-4">
            <button onclick="closeSettingsModal()" class="flex-1 py-4 bg-slate-100 rounded-xl font-bold">Cancel</button>
            <button onclick="commitAddFaculty()" class="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition">✅ Register to Cloud</button>
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
    if (!requireRole('admin')) return;
    const email = normalizeEmail(document.getElementById('newFacEmail').value);
    const name = document.getElementById('newFacName').value.trim();
    const pin = document.getElementById('newFacPin').value.trim();

    if (!email || !name || !pin) { alert("All fields are required."); return; }
    if (!email.includes('@')) { alert("Please enter a valid Google email."); return; }
    if (pin.length !== 4 || isNaN(pin)) { alert("PIN must be exactly 4 digits."); return; }

    const commitBtn = document.querySelector('#settingsModalContent button[onclick="commitAddFaculty()"]');
    if (commitBtn) { commitBtn.disabled = true; commitBtn.textContent = 'Saving...'; }

    if (supabaseClient) {
        try {
            await callSecureFacultyFunction('addFaculty', { email, name, pin });
            closeSettingsModal();
            renderAdminSettings();
            alert(`${name} has been registered. Share their PIN privately.`);
            return;
        } catch (error) {
            console.error('Secure faculty add error:', error);
            alert(error.message || 'Failed to save faculty member.');
            if (commitBtn) { commitBtn.disabled = false; commitBtn.textContent = 'Register to Cloud'; }
            return;
        }

        // Frontend checks are UX gates. Supabase RLS or a backend/Edge Function must enforce admin-only writes.
        const { data: existing } = await supabaseClient
            .from('authorized_emails')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (existing) {
            alert(`"${email}" is already authorized.`);
            if (commitBtn) { commitBtn.disabled = false; commitBtn.textContent = '✅ Register to Cloud'; }
            return;
        }

        const pinHash = await sha256Hex(pin);
        const { error: authError } = await supabaseClient
            .from('authorized_emails')
            .insert([{ email, role: 'faculty', display_name: name, active: true, created_by: normalizeEmail(currentUser.email) }]);

        if (authError) {
            console.error('Supabase authorization insert error:', authError);
            alert('Failed to authorize faculty email. Please try again.');
            if (commitBtn) { commitBtn.disabled = false; commitBtn.textContent = 'Register to Cloud'; }
            return;
        }

        const { error } = await supabaseClient
            .from('faculty_registry')
            .insert([{ email, name, pin_hash: pinHash, active: true }]);

        if (error) {
            console.error('Supabase insert error:', error);
            alert('Failed to save to cloud. Please try again.');
            if (commitBtn) { commitBtn.disabled = false; commitBtn.textContent = '✅ Register to Cloud'; }
            return;
        }
    } else {
        // Fallback to local config
        if (!systemConfig.faculty) systemConfig.faculty = [];
        systemConfig.faculty.push({ email, name, pin });
        await saveSystemConfig();
    }

    closeSettingsModal();
    renderAdminSettings();
    alert(`✅ ${name} has been registered!\n\nTheir PIN is: ${pin}\n\nPlease share this with them privately.`);
}

async function removeFaculty(index) {
    if (!requireRole('admin')) return;
    if (!confirm("Are you sure you want to remove this faculty member? Their private folder will remain but they will lose access.")) return;
    
    systemConfig.faculty.splice(index, 1);
    await saveSystemConfig();
    renderAdminSettings();
}

async function removeFacultyById(id, name, email = '') {
    if (!requireRole('admin')) return;
    if (!confirm(`Are you sure you want to remove "${name}" from the registry?\n\nTheir private Drive folder will remain, but they will lose portal access.`)) return;

    if (supabaseClient) {
        try {
            // First, try the secure cloud function (required for real authorized emails)
            if (email && !email.endsWith('@internal')) {
                await callSecureFacultyFunction('deactivateFaculty', { id, email });
            }
        } catch (error) {
            console.warn('Secure deactivation skipped or failed, trying direct update...', error);
        }

        // Always perform a direct delete as a fallback/primary action for admins
        const { error } = await supabaseClient
            .from('faculty_registry')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Supabase delete error:', error);
            alert('Failed to remove from cloud registry: ' + error.message);
            return;
        }

        renderAdminSettings();
        return;
    }
}

async function updateAdminSecurity() {
    if (!requireRole('admin')) return;
    alert("Shared frontend admin passwords are disabled. Manage admins in the authorized_emails table.");
}

async function saveSystemConfig() {
    if (!requireRole(['admin', 'faculty'])) return;
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
    alert("Legacy faculty login is disabled. Use the Google-authorized faculty entry flow.");
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
// DRIVE FOLDER MANAGEMENT
// ==========================================

async function setupMainFolder(skipMaster = false) {
    if (!requireRole(['admin', 'faculty'])) return;
    try {
        if (!skipMaster) {
            // This part is now handled by prepareDriveAndConfig
            return; 
        }

        // Search for subfolders inside the master folder
        const response = await gapi.client.drive.files.list({
            q: `'${driveFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`, spaces: 'drive'
        });
        
        const existingFolders = response.result.files;
        const findFolder = (name) => existingFolders.find(f => f.name === name);

        let commonFolder = findFolder(DRIVE_CONFIG.commonResourcesFolderName);
        if (!commonFolder) {
            commonFolder = await gapi.client.drive.files.create({
                resource: { name: DRIVE_CONFIG.commonResourcesFolderName, mimeType: 'application/vnd.google-apps.folder', parents: [driveFolderId] }, fields: 'id'
            });
            commonResourcesFolderId = commonFolder.result.id;
        } else {
            commonResourcesFolderId = commonFolder.id;
        }

        let instructorsFolder = findFolder(DRIVE_CONFIG.instructorsFolderName);
        if (!instructorsFolder) {
            instructorsFolder = await gapi.client.drive.files.create({
                resource: { name: DRIVE_CONFIG.instructorsFolderName, mimeType: 'application/vnd.google-apps.folder', parents: [driveFolderId] }, fields: 'id'
            });
            instructorsFolderId = instructorsFolder.result.id;
        } else {
            instructorsFolderId = instructorsFolder.id;
        }

        loadLibrary();
        console.log("Full Folder Structure Operational.");
    } catch (err) {
        console.error('Drive structure error:', err);
    }
}
async function getOrCreateInstructorFolder(instructorName) {
    if (!requireRole(['admin', 'faculty'])) throw new Error('Access denied');
    if (!instructorsFolderId) throw new Error('Instructors folder not initialized');

    // v4.9: Strict Name-Based Subfolder Isolation
    const targetName = (userRole === 'faculty' || (userRole === 'admin' && storageScope === 'departmental')) 
                       ? currentUser.facultyName 
                       : instructorName;

    const sanitizedName = targetName.replace(/[\\/:*?"<>|]/g, '_').trim();

    try {
        const response = await gapi.client.drive.files.list({
            q: `name='${sanitizedName}' and '${instructorsFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`, spaces: 'drive'
        });

        let instructorFolderId;
        if (response.result.files.length === 0) {
            const folder = await gapi.client.drive.files.create({
                resource: { name: sanitizedName, mimeType: 'application/vnd.google-apps.folder', parents: [instructorsFolderId] }, fields: 'id'
            });
            instructorFolderId = folder.result.id;

            for (const subfolderName of DRIVE_CONFIG.instructorSubfolders) {
                await gapi.client.drive.files.create({
                    resource: { name: subfolderName, mimeType: 'application/vnd.google-apps.folder', parents: [instructorFolderId] }, fields: 'id'
                });
            }
        } else {
            instructorFolderId = response.result.files[0].id;
        }
        currentInstructorFolderId = instructorFolderId;
        return instructorFolderId;
    } catch (err) {
        console.error('Error creating instructor folder:', err);
        throw err;
    }
}

async function getInstructorSubfolder(subfolderName) {
    if (!requireRole(['admin', 'faculty'])) throw new Error('Access denied');
    if (!currentInstructorFolderId) throw new Error('No instructor folder selected');
    const response = await gapi.client.drive.files.list({
        q: `name='${subfolderName}' and '${currentInstructorFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`, spaces: 'drive'
    });
    if (response.result.files.length > 0) return response.result.files[0].id;
    return null;
}

function showDriveFolder() {
    if (!requireRole(['admin', 'faculty'])) return;
    if (driveFolderId) window.open(`https://drive.google.com/drive/folders/${driveFolderId}`, '_blank');
}

// ==========================================
// TAB NAVIGATION
// ==========================================

function showTab(tabName) {
    if (tabName === 'settings' && !requireRole('admin')) return;
    if (['sources', 'extract', 'generate', 'ai-bridge', 'import', 'images', 'library', 'publish'].includes(tabName) && !requireRole(['admin', 'faculty'])) return;
    const tabs = ['sources', 'extract', 'generate', 'ai-bridge', 'import', 'images', 'library', 'publish', 'settings'];
    const tabLabels = { 'sources': '1. Sources', 'extract': '2. Extract', 'generate': '3. Generate', 'ai-bridge': '4. AI Bridge', 'import': '5. Import', 'images': '6. Images', 'library': '7. Library', 'publish': '8. Publish', 'settings': '⚙️ Settings' };
    tabs.forEach(t => {
        document.getElementById(`content-${t}`).classList.add('hidden-section');
        const btn = document.getElementById(`tab-${t}`);
        btn.className = 'flex-1 py-4 px-4 font-semibold tab-inactive transition whitespace-nowrap text-sm';
        btn.innerHTML = `<span class="relative z-10">${tabLabels[t]}</span><span class="tab-overlay">${tabLabels[t]}</span>`;
    });
    const activeBtn = document.getElementById(`tab-${tabName}`);
    activeBtn.className = 'flex-1 py-4 px-4 font-semibold tab-active transition whitespace-nowrap text-sm';
    activeBtn.innerHTML = tabLabels[tabName];

    // 21st.dev HoverClip inspired: fade+slide content transition
    const content = document.getElementById(`content-${tabName}`);
    content.classList.remove('hidden-section');
    content.classList.remove('tab-content-transition');
    void content.offsetWidth;
    content.classList.add('tab-content-transition');

    if (tabName === 'ai-bridge') updateAiBridgeSources();
    if (tabName === 'settings') {
        renderVerifiedTokens(); // Render the whitelist when entering settings
    }
    if (tabName === 'library') loadLibrary();
    if (tabName === 'images') renderImageQueue();
    if (tabName === 'settings') renderAdminSettings();
}

// ==========================================
// TAB 1: SOURCES MANAGEMENT
// ==========================================

function addDriveLink() {
    const url = document.getElementById('driveLinkInput').value.trim();
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (!match) { alert('Invalid Drive link.'); return; }
    sources.push({ id: 'D_' + Date.now(), type: 'drive', name: 'Drive ' + match[1].slice(0, 8) + '...', url: url, fileId: match[1] });
    document.getElementById('driveLinkInput').value = '';
    updateSourceDisplay();
}

function handleLocalFiles(files) {
    Array.from(files).forEach(file => { sources.push({ id: 'L_' + Date.now(), type: 'local', name: file.name, size: (file.size / 1024 / 1024).toFixed(2) + 'MB', file: file }); });
    updateSourceDisplay();
}

function addWebLink() {
    const url = document.getElementById('webLinkInput').value.trim();
    if (!url) return;
    sources.push({ id: 'W_' + Date.now(), type: 'web', name: new URL(url).hostname, url: url });
    document.getElementById('webLinkInput').value = '';
    updateSourceDisplay();
}

function addNotebookLink() {
    const url = document.getElementById('notebookLinkInput').value.trim();
    if (!url) return;
    sources.push({ id: 'N_' + Date.now(), type: 'notebook', name: 'Notebook', url: url });
    document.getElementById('notebookLinkInput').value = '';
    updateSourceDisplay();
}

function updateSourceDisplay() {
    const container = document.getElementById('combinedSourceList');
    if (sources.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-4">No sources added</p>';
    } else {
        container.innerHTML = sources.map(s => `
            <div class="flex justify-between items-center p-2 bg-gray-50 rounded border">
                <div class="flex items-center gap-2">
                    <span class="text-xs px-2 py-1 rounded font-semibold ${s.type === 'drive' ? 'bg-blue-100 text-blue-800' :
                s.type === 'local' ? 'bg-purple-100 text-purple-800' :
                    s.type === 'web' ? 'bg-pink-100 text-pink-800' :
                        'bg-green-100 text-green-800'
            }">${s.type.toUpperCase()}</span>
                    <span class="text-sm font-medium truncate max-w-xs">${s.name}</span>
                </div>
                <button onclick="removeSource('${s.id}')" class="text-red-500 hover:text-red-700">×</button>
            </div>
        `).join('');
    }

    // Recalculate and update the badges
    document.getElementById('totalDriveBadge').textContent = `Drive: ${sources.filter(x => x.type === 'drive').length}`;
    document.getElementById('totalLocalBadge').textContent = `Local: ${sources.filter(x => x.type === 'local').length}`;
    document.getElementById('totalWebBadge').textContent = `Web: ${sources.filter(x => x.type === 'web').length}`;
    document.getElementById('totalNotebookBadge').textContent = `Notebook: ${sources.filter(x => x.type === 'notebook').length}`;
}
function removeSource(id) { sources = sources.filter(x => x.id !== id); updateSourceDisplay(); }

// ==========================================
// TAB 3: GENERATE
// ==========================================

function updateFileNamePreview() {
    const instructor = getValue('genInstructor', 'Instructor').replace(/\s+/g, '_') || 'Instructor';
    const sem = getValue('genSemester', 'SemXX') || 'SemXX';
    const code = getValue('genCourse', 'Code') || 'Code';
    const topic = getValue('genTopic', 'Topic').replace(/\s+/g, '_') || 'Topic';
    const date = new Date().toLocaleDateString('en-GB').replace(/\//g, '');
    const qsName = `QS_${instructor}_${sem}_${code}_${topic}_${date}.html`;
    const preview = $('fileNamePreview');
    if (preview) preview.textContent = `Question Set: ${qsName}`;
    setValue('archiveFileName', qsName);
}

function saveDraft() {
    const draft = {
        instructor: getValue('genInstructor'),
        course: getValue('genCourse'),
        topic: getValue('genTopic'),
        standard: getValue('genStandard'),
        difficulty: getValue('genDifficulty'),
        duration: getValue('genDuration'),
        sets: getValue('genSets', '4'),
        attempts: getValue('genAttempts', '2'),
        linkStart: getValue('linkStartTime'),
        linkEnd: getValue('linkEndTime')
    };
    localStorage.setItem('exam_draft', JSON.stringify(draft));
    const indicator = $('draftSavedIndicator');
    if (indicator) {
        indicator.style.display = 'flex';
        setTimeout(() => { indicator.style.display = 'none'; }, 3000);
    }
}

function loadDraft() {
    const draftStr = localStorage.getItem('exam_draft');
    if (!draftStr) return;
    try {
        const draft = JSON.parse(draftStr);
        setValue('genInstructor', draft.instructor || '');
        setValue('genCourse', draft.course || '');
        setValue('genTopic', draft.topic || '');
        setValue('genStandard', draft.standard || 'GRADUATE');
        setValue('genDifficulty', draft.difficulty || 'MODERATE');
        setValue('genDuration', draft.duration || '180');
        setValue('genSets', draft.sets || '4');
        setValue('genAttempts', draft.attempts || '2');
        updateFileNamePreview();
    } catch (e) { }
}

// ==========================================
// TAB 4: AI BRIDGE
// ==========================================

function updateAiBridgeSources() {
    const container = $('aiBridgeSources');
    if (!container) return;
    if (sources.length === 0) container.innerHTML = '<p class="text-gray-400 text-sm">Add sources in Tab 1 first</p>';
    else container.innerHTML = `<div class="space-y-2">${sources.map(s => `<div class="text-sm truncate">• ${s.name}</div>`).join('')}</div>`;
}

// --- NEW: UI Logic for the Pool Slider ---
function togglePoolSlider() {
    const enablePool = $('enablePool');
    const container = $('poolSliderContainer');
    const poolOption = $('poolOption');
    const importMode = $('importMode');
    if (!enablePool || !container) return;
    const isChecked = enablePool.checked;

    if (isChecked) {
        container.classList.remove('hidden-section');
        if (poolOption) poolOption.disabled = false;
        if (importMode) importMode.value = 'pool';
    } else {
        container.classList.add('hidden-section');
        if (poolOption) poolOption.disabled = true;
        if (importMode && importMode.value === 'pool') importMode.value = 'shuffle';
    }
}

function updatePoolDisplay() {
    setText('poolValDisplay', getValue('poolSlider', '50') + '%');
}

// --- UPGRADED: Prompt Generator (Anti-Hallucination + Visual Quota) ---
function generatePrompt() {
    const instructor = document.getElementById('genInstructor').value.trim() || 'Instructor';
    const course = document.getElementById('genCourse').value.trim() || 'Course';
    const topic = document.getElementById('genTopic').value.trim() || 'Topic';
    const standard = document.getElementById('genStandard').value || 'JEE Main';

    // 1. Get the target numbers per student
    const targetSingle = parseInt(document.getElementById('distSingle').value) || 0;
    const targetMultiple = parseInt(document.getElementById('distMultiple').value) || 0;
    const targetMatching = parseInt(document.getElementById('distMatching').value) || 0;

    // 2. Check if the Pool slider is checked, and calculate the multiplier
    let multiplier = 1;
    if (document.getElementById('enablePool') && document.getElementById('enablePool').checked) {
        const extraPct = parseInt(document.getElementById('poolSlider').value) || 50;
        multiplier = 1 + (extraPct / 100);
    }

    // 3. Math.ceil rounds UP to the nearest whole number automatically
    const single = Math.ceil(targetSingle * multiplier);
    const multiple = Math.ceil(targetMultiple * multiplier);
    const matching = Math.ceil(targetMatching * multiplier);
    const total = single + multiple + matching;

    const webLinks = sources.filter(s => s.type === 'web').map(s => '- ' + s.url).join('\n') || 'None provided';

    const examProfile = examProfiles[standard] || examProfiles['UG'];

    // --- DIFFICULTY INTENSITY ENGINE ---
    const difficulty = document.getElementById('genDifficulty') ? document.getElementById('genDifficulty').value : 'MODERATE';
    const difficultyProfile = difficultyProfiles[difficulty] || difficultyProfiles['MODERATE'];

    const examIntelligenceDirective = `
EXAM INTELLIGENCE PROFILE — ${examProfile.label}:
${examProfile.directive}

${difficultyProfile.directive}

You MUST follow BOTH the exam profile AND the difficulty intensity above ABSOLUTELY. They are MANDATORY requirements for this paper.`;

    // 4. Aggressive Local File Directive
    const localFiles = sources.filter(s => s.type === 'local' || s.type === 'drive');
    const localFilesList = localFiles.map(s => '- ' + s.name).join('\n');
    const attachedFilesDirective = localFiles.length > 0
        ? `1. ATTACHED FILES (HIGHEST PRIORITY): You MUST deeply analyze these provided files:\n${localFilesList}\nYou MUST generate a significant portion of the questions directly from the content, structures, and reactions found in these specific files.`
        : "1. ATTACHED FILES: NONE. DO NOT invent or reference any local files.";

    const prompt = `You are a professional Academic Question Generator specialized in ${standard} chemistry and science topics.
Your task is to generate high-quality, technically accurate questions based on the following context.

IDENTITY & COMPLIANCE:
- You are an automated data system. Return strictly valid JSON logic.
- NO CONVERSATION. NO PREAMBLE. NO POST-TEXT.
- Ensure all chemical formulas use HTML <sub> and <sup> tags.

${examIntelligenceDirective}

EXAM PARAMETERS:
- STANDARD: ${examProfile.label}
- TOPIC: ${topic}
- DIFFICULTY: ${difficulty}

SOURCES & RESEARCH DIRECTIVES:
${attachedFilesDirective}
2. WEB LINKS:
${webLinks}
3. EXTERNAL SEARCH: Activate your browsing tool to find high-end academic resources related to ${topic} to ensure question diversity.

QUESTION POOL QUOTA:
- Generate: Single Correct (${single}), Multiple Correct (${multiple}), Matching (${matching}). TOTAL: ${total}

FORMATTING RULES (STRICT):
1. VISUAL COMPLIANCE: At least 60% of questions MUST reference structures, diagrams, or data. Use the exact [INSTRUCTOR NOTE] placeholders provided below.
2. IMAGE PLACEHOLDERS (CRITICAL: Because AI often miscalculates PDF page numbers, you MUST provide a unique text quote and the nearest section heading so the instructor can Ctrl+F it):
   - For PDFs/Docs: <br><br>[INSTRUCTOR NOTE - INSERT IMAGE: <a href='[FILE_NAME]' target='_blank' style='color:red; font-weight:bold;'>[FILE_NAME]</a> | Section: '[NEAREST HEADING]' | Quote: '[5-6 unique words adjacent to the figure]' | Description: '...']<br><br>
   - For Web Content: <br><br>[INSTRUCTOR NOTE - INSERT IMAGE: <a href='[URL]' target='_blank' style='color:blue; font-weight:bold;'>[DOMAIN]</a> | Quote: '[5-6 unique words adjacent to the figure]' | Description: '...']<br><br>
3. JSON INTEGRITY: Use only \n for internal line breaks. Never use physical line breaks inside a string value.
4. MATCHING FORMAT: The 'text' must have List I and List II. The 'options' must be 4 sequence strings (e.g. "A. I-A, II-B").

OUTPUT SCHEMA:
{
  "questions": [
    {
      "number": 1,
      "type": "single",
      "text": "...",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "...",
      "difficulty": "medium",
      "marks": 4,
      "negative": 1
    }
  ]
}

START JSON NOW:`;

    document.getElementById('generatedPrompt').textContent = prompt;
}

function copyPrompt() {
    navigator.clipboard.writeText(document.getElementById('generatedPrompt').textContent);
    alert('Copied!');
}

function openAiService(service) {
    const urls = {
        'chatgpt': 'https://chat.openai.com',
        'claude': 'https://claude.ai',
        'gemini': 'https://gemini.google.com',
        'copilot': 'https://copilot.microsoft.com',
        'perplexity': 'https://www.perplexity.ai',
        'deepseek': 'https://chat.deepseek.com',
        'grok': 'https://grok.com'
    };
    window.open(urls[service] || 'https://google.com', '_blank');
}

// ==========================================
// TAB 5: IMPORT
// ==========================================

// --- ITERATIVE ACCUMULATION ENGINE ---
function parseAiOutput() {
    let text = document.getElementById('aiOutputPaste').value.trim();
    if (!text) return;

    try {
        if (text.includes('```json')) text = text.match(/```json\s*([\s\S]*?)```/)[1];
        else if (text.includes('```')) text = text.match(/```\s*([\s\S]*?)```/)[1];

        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) text = text.substring(firstBrace, lastBrace + 1);

        // --- UPGRADED: THE IRONCLAD JSON RECOVERY ENGINE ---
        // 1. Repair physical line breaks inside strings
        let sanitized = "";
        let inString = false;
        let isEscaped = false;
        for (let i = 0; i < text.length; i++) {
            let char = text[i];
            if (char === '\\') { isEscaped = !isEscaped; sanitized += char; }
            else if (char === '"' && !isEscaped) { inString = !inString; sanitized += char; }
            else if ((char === '\n' || char === '\r') && inString) { sanitized += '\\n'; isEscaped = false; }
            else { sanitized += char; isEscaped = false; }
        }
        text = sanitized;

        // 2. Repair common "unescaped internal quotes" issues
        // Heuristic: A boundary quote is usually preceded by {[: or followed by ,:]}
        let result = "";
        inString = false;
        for (let i = 0; i < text.length; i++) {
            let char = text[i];
            if (char === '"') {
                let prev = text.substring(0, i).trim().slice(-1);
                let next = text.substring(i + 1).trim().slice(0, 1);
                let isStructural = (prev === ':' || prev === '{' || prev === '[' || prev === ',' || 
                                    next === ':' || next === '}' || next === ']' || next === ',');
                if (isStructural) { result += '"'; inString = !inString; }
                else { if (inString) result += '\\"'; else { result += '"'; inString = true; } }
            } else { result += char; }
        }
        text = result.replace(/^[^{]*/, "").replace(/[^}]*$/, "");

        let data = JSON.parse(text);
        let newQuestions = data.questions || data;
        if (!Array.isArray(newQuestions)) throw new Error("Parsed data is not an array");

        // ACCUMULATE: Push new questions into the master pool
        newQuestions.forEach(q => {
            // Standardize missing types to 'single'
            if (!q.type) q.type = 'single';

            // --- NEW: HTML SCRUBBING & HYPERLINK FIXER ---
            const cleanHtml = (htmlStr) => {
                if (typeof htmlStr !== 'string') return htmlStr;

                // 1. Safely fix URLs (Ignores local files/PDFs, only fixes raw domains)
                let s = htmlStr.replace(/href=['"]([^'"]+)['"]/gi, (match, url) => {
                    if (url.startsWith('http') || url.includes(' ') || url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('.doc')) return match;
                    if (url.match(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/)) return `href='https://${url}'`;
                    return match;
                });

                // 2. Collapse 3+ consecutive line breaks into just 2 (Fixes the HUGE spacing)
                s = s.replace(/(<br>\s*){3,}/gi, '<br><br>');
                // 3. Remove orphaned line breaks at the very beginning or end
                s = s.replace(/^(<br>\s*)+/, '').replace(/(<br>\s*)+$/, '');
                return s;
            };

            q.text = cleanHtml(q.text);
            if (q.explanation) q.explanation = cleanHtml(q.explanation);
            if (Array.isArray(q.options)) q.options = q.options.map(opt => cleanHtml(opt));
            // ---------------------------------------------

            parsedQuestions.push(q);
        });

        // Renumber the entire pool sequentially
        parsedQuestions.forEach((q, idx) => q.number = idx + 1);

        // Clear the paste box so instructor can paste the next batch
        document.getElementById('aiOutputPaste').value = '';

        // Run the math dashboard
        updatePoolStatus();

    } catch (e) {
        console.error("JSON Parse Error:", e);

        // Hide success/continuation boxes, show the Repair box
        document.getElementById('successBox').classList.add('hidden-section');
        document.getElementById('continuationBox').classList.add('hidden-section');
        document.getElementById('errorBox').classList.remove('hidden-section');

        // Change the status badge to Error
        const badge = document.getElementById('poolStatusBadge');
        badge.className = "bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded font-bold border border-orange-300";
        badge.textContent = "Syntax Error Detected";

        alert("✗ Parse Error: The AI formatted the JSON incorrectly (likely using physical line breaks). Please copy the Repair Command and paste it back to the AI.");
    }
}

function updatePoolStatus() {
    // 1. Calculate Targets
    const targetSingle = parseInt(document.getElementById('distSingle').value) || 0;
    const targetMultiple = parseInt(document.getElementById('distMultiple').value) || 0;
    const targetMatching = parseInt(document.getElementById('distMatching').value) || 0;

    let multiplier = 1;
    if (document.getElementById('enablePool') && document.getElementById('enablePool').checked) {
        const extraPct = parseInt(document.getElementById('poolSlider').value) || 50;
        multiplier = 1 + (extraPct / 100);
    }

    const reqSingle = Math.ceil(targetSingle * multiplier);
    const reqMultiple = Math.ceil(targetMultiple * multiplier);
    const reqMatching = Math.ceil(targetMatching * multiplier);
    const reqTotal = reqSingle + reqMultiple + reqMatching;

    // 2. Count Current Pool
    const curSingle = parsedQuestions.filter(q => q.type === 'single').length;
    const curMultiple = parsedQuestions.filter(q => q.type === 'multiple').length;
    const curMatching = parsedQuestions.filter(q => q.type === 'matching').length;
    const curTotal = parsedQuestions.length;

    // 3. Update Dashboard Numbers
    document.getElementById('statTotal').textContent = `${curTotal} / ${reqTotal}`;
    document.getElementById('statSingle').textContent = `${curSingle} / ${reqSingle}`;
    document.getElementById('statMultiple').textContent = `${curMultiple} / ${reqMultiple}`;
    document.getElementById('statMatching').textContent = `${curMatching} / ${reqMatching}`;

    // 4. Calculate Deficits
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
        importBtn.disabled = true;
    }
    else if (defTotal > 0) {
        badge.className = "bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-bold border border-red-300";
        badge.textContent = `Missing ${defTotal} Questions`;
        successBox.classList.add('hidden-section');
        contBox.classList.remove('hidden-section');
        importBtn.disabled = true;

        // Generate Dynamic Continuation Prompt
        const contString = `You stopped early. Generate the remaining ${defTotal} questions (Single Correct: ${defSingle}, Multiple Correct: ${defMultiple}, Matching: ${defMatching}) starting from question number ${curTotal + 1}. Output ONLY raw JSON matching the exact schema provided previously.`;
        document.getElementById('continuationPrompt').value = contString;
    }
    else {
        badge.className = "bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold border border-green-300";
        badge.textContent = "Pool Complete";
        contBox.classList.add('hidden-section');
        successBox.classList.remove('hidden-section');
        importBtn.disabled = false; // UNLOCK EXAM GENERATION
    }
}

function copyContinuation() {
    navigator.clipboard.writeText(document.getElementById('continuationPrompt').value);
    alert('Continuation command copied! Paste it back to the AI.');
}

function copyRepair() {
    navigator.clipboard.writeText(document.getElementById('repairPrompt').value);
    alert('Repair command copied! Paste it back to the AI to fix the JSON.');

    // Hide the error box after copying so the user can try parsing the new output
    document.getElementById('errorBox').classList.add('hidden-section');
    document.getElementById('poolStatusBadge').textContent = "Awaiting Fixed Import";
}

function clearImport() {
    document.getElementById('aiOutputPaste').value = '';
    parsedQuestions = []; // Wipe the master pool
    updatePoolStatus();   // Reset the dashboard
}

// Advanced Fisher-Yates Shuffle Algorithm
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
        alert(`SUCCESS! Randomly constructed ${setNum} unique Sets from the extra AI Question Pool.`);

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
        alert(`SUCCESS! Split ${parsedQuestions.length} unique questions evenly into ${setNum} Sets.`);

    } else {
        sets.forEach((s, index) => {
            let questionsCopy = JSON.parse(JSON.stringify(parsedQuestions));
            if (index > 0) {
                questionsCopy = shuffleArray(questionsCopy);
                questionsCopy.forEach((q, idx) => q.number = idx + 1);
            }
            generatedSets[s] = questionsCopy;
        });
        alert(`SUCCESS! Copied and Shuffled ${parsedQuestions.length} questions into Sets.`);
    }

    // --- NEW: Generate 4-digit Short Option IDs ---
    Object.keys(generatedSets).forEach(s => {
        generatedSets[s].forEach(q => {
            if (q.options && Array.isArray(q.options)) {
                q.optionIds = [];
                while (q.optionIds.length < q.options.length) {
                    let id = Math.floor(1000 + Math.random() * 9000);
                    if (!q.optionIds.includes(id)) q.optionIds.push(id);
                }
            }
        });
    });

    showTab('images');
}

// ==========================================
// TAB 6: IMAGES & EDIT (ARRAY-AWARE ENGINE)
// ==========================================

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
                '<div class="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">✏️ Click anywhere to edit</div>' +
                '</div>' +
                '<div class="mb-5 text-gray-900 leading-relaxed" style="font-size: ' + qBaseSize + 'px; font-weight: ' + qWeightStr + ';">' + q.text + '</div>' +
                '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-800 mb-4" style="font-size: ' + optBaseSize + 'px;">' +
                q.options.map((opt, i) => {
                    let isCorrect = Array.isArray(q.correct) ? q.correct.includes(i) : (i === q.correct);
                    let correctClass = isCorrect ? 'bg-green-100 text-green-900 border-2 border-green-500 font-bold shadow-sm' : 'bg-gray-50 border border-gray-300';
                    let btnClass = isCorrect ? 'bg-green-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-green-50 hover:text-green-700 hover:border-green-300';
                    let btnText = isCorrect ? '✓ CORRECT' : 'Mark Correct';

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

    document.getElementById('editModal').classList.remove('hidden-section');
}

function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden-section');
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

function insertImageUrl() {
    const url = prompt("Enter the URL of the image:");
    if (url) {
        document.getElementById('editQText').focus();
        document.execCommand('insertImage', false, url);
        styleInsertedImages();
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Image = e.target.result;
        document.getElementById('editQText').focus();
        document.execCommand('insertImage', false, base64Image);
        styleInsertedImages();
    };
    reader.readAsDataURL(file);
    
    event.target.value = '';
}

function styleInsertedImages() {
    setTimeout(() => {
        const editor = document.getElementById('editQText');
        const images = editor.getElementsByTagName('img');
        for(let i=0; i<images.length; i++) {
            if(!images[i].classList.contains('styled-img')) {
                images[i].style.maxWidth = '100%';
                images[i].style.borderRadius = '8px';
                images[i].style.marginTop = '10px';
                images[i].style.marginBottom = '10px';
                images[i].classList.add('styled-img');
            }
        }
    }, 50);
}

// ==========================================
// TAB 7 & 8: LIBRARY & PUBLISH (DRIVE FIX)
// ==========================================

async function loadLibrary() {
    if (!requireRole(['admin', 'faculty'])) return;
    if (!instructorsFolderId) return;
    const container = document.getElementById('libraryContent');
    container.innerHTML = '<p class="text-center py-4 text-slate-400">Loading Cloud Library...</p>';

    try {
        const response = await gapi.client.drive.files.list({
            q: `'${instructorsFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            spaces: 'drive'
        });

        let folders = response.result.files;

        // Privacy Lock (v4.6): If faculty, show ONLY their folder
        if (userRole === 'faculty' && currentUser.facultyName) {
            folders = folders.filter(f => f.name === currentUser.facultyName);
        }

        if (folders.length === 0) {
            container.innerHTML = '<p class="text-center py-4 text-slate-500">No instructor folders found or access restricted.</p>';
            return;
        }

        container.innerHTML = folders.map(f => `
            <div class="library-card flex justify-between items-center group">
                <div class="flex items-center gap-4">
                    <div class="text-3xl">📁</div>
                    <div>
                        <h4 class="font-bold text-slate-800 text-lg">${f.name}</h4>
                        <p class="text-xs text-slate-400 font-bold uppercase tracking-widest">Chemistry Faculty</p>
                    </div>
                </div>
                <button onclick="window.open('https://drive.google.com/drive/folders/${f.id}', '_blank')" class="pearl-btn pearl-btn-blue px-6 py-2 rounded-xl text-white text-sm font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">Open Folder</button>
            </div>
        `).join('');

    } catch (err) {
        console.error('Library load error:', err);
        container.innerHTML = '<p class="text-center py-4 text-red-500">Error loading library data.</p>';
    }
}

// ==========================================
// LOCK & CONTINUE — CHECKPOINT GENERATION
// ==========================================

async function lockAndContinue() {
    if (!requireRole(['admin', 'faculty'])) return;

    // Guard: must have questions
    if (Object.keys(generatedSets).length === 0) {
        alert('No questions found. Please generate or import questions before locking.');
        return;
    }

    const instructor = document.getElementById('genInstructor').value.trim();
    const course     = document.getElementById('genCourse').value.trim();
    if (!instructor) { alert('Please enter the Instructor name in the Generate tab first.'); showTab('generate'); return; }
    if (!course)     { alert('Please enter the Course Code in the Generate tab first.');     showTab('generate'); return; }

    // Collect config from the Generate tab
    const cfg = {
        instructor,
        course,
        semester:   document.getElementById('genSemester').value,
        topic:      document.getElementById('genTopic').value,
        standard:   document.getElementById('genStandard').value,
        sets:       parseInt(document.getElementById('genSets').value),
        attempts:   parseInt(document.getElementById('genAttempts').value),
        difficulty: document.getElementById('genDifficulty').value,
        duration:   parseInt(document.getElementById('genDuration').value)
    };

    // Build the filename (same format as the preview)
    const dateStr    = new Date().toLocaleDateString('en-GB').replace(/\//g, '');
    const safeName   = (name) => name.replace(/\s+/g, '_');
    const archiveName = `QS_${safeName(cfg.instructor)}_${cfg.semester}_${cfg.course}_${safeName(cfg.topic)}_${dateStr}.html`;

    // ── Build HTML Checkpoint ────────────────────────────────────────────────
    const checkpointPayload = JSON.stringify({ cfg, sets: generatedSets });

    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>QB Checkpoint - ${cfg.course}</title>
  <style>
    body{font-family:sans-serif;max-width:900px;margin:0 auto;padding:20px}
    .set-title{background:#3498db;color:#fff;padding:10px;border-radius:6px;margin:30px 0 15px}
    .question{border:1px solid #e0e0e0;padding:20px;border-radius:8px;margin-bottom:20px;page-break-inside:avoid}
    .correct-opt{background:#d4edda;font-weight:bold}
    .option{padding:8px;border-radius:4px;border:1px solid #ddd;margin:4px 0}
    .explanation{background:#fff3cd;padding:12px;border-radius:6px;margin-top:10px}
    @media print{.question{border:1px solid #ccc}}
  </style>
</head>
<body>
  <!-- CHECKPOINT PAYLOAD — DO NOT EDIT -->
  <script id="exam-checkpoint-data" type="application/json">${checkpointPayload}<\/script>

  <h1 style="text-align:center">Question Bank Checkpoint: ${cfg.course}</h1>
  <p><b>Instructor:</b> ${cfg.instructor} | <b>Topic:</b> ${cfg.topic} | <b>Standard:</b> ${cfg.standard} | <b>Semester:</b> ${cfg.semester} | <b>Sets:</b> ${cfg.sets} | <b>Attempts:</b> ${cfg.attempts} | <b>Date:</b> ${new Date().toLocaleDateString()}</p>`;

    Object.entries(generatedSets).forEach(([set, qs]) => {
        html += `<div class="set-container"><h2 class="set-title">Set ${set}</h2>`;
        qs.forEach(q => {
            const corr = Array.isArray(q.correct) ? q.correct : [q.correct];
            html += `<div class="question"><b>Q${q.number}. [${(q.type || 'single').toUpperCase()}] +${q.marks}/-${q.negative}</b><p>${q.text}</p>`;
            q.options.forEach((opt, i) => {
                const optId = (q.optionIds && q.optionIds[i]) ? `[${q.optionIds[i]}] ` : '';
                html += `<div class="option ${corr.includes(i) ? 'correct-opt' : ''}">${String.fromCharCode(65 + i)}. ${optId}${opt}</div>`;
            });
            if (q.explanation) html += `<div class="explanation"><b>Explanation:</b> ${q.explanation}</div>`;
            html += `</div>`;
        });
        html += `</div>`;
    });
    html += `</body></html>`;

    const htmlBlob = new Blob([html], { type: 'text/html' });

    // ── Save to Drive (with duplicate prevention) ────────────────────────────
    if (driveFolderId && gapi && gapi.client) {
        try {
            await getOrCreateInstructorFolder(cfg.instructor);
            const questionBanksFolderId = await getInstructorSubfolder('03_Question_Banks');

            if (questionBanksFolderId) {
                const token = gapi.client.getToken().access_token;

                // Check if a file with the same name already exists in this folder
                const searchResp = await gapi.client.drive.files.list({
                    q: `name='${archiveName}' and '${questionBanksFolderId}' in parents and trashed=false`,
                    fields: 'files(id, name)',
                    spaces: 'drive'
                });

                const existingFiles = searchResp.result.files;

                if (existingFiles && existingFiles.length > 0) {
                    // ── UPDATE existing file (no duplicate created) ──────────
                    const existingFileId = existingFiles[0].id;
                    const updateResp = await fetch(
                        `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`,
                        {
                            method: 'PATCH',
                            headers: new Headers({ 'Authorization': 'Bearer ' + token }),
                            body: (() => {
                                const form = new FormData();
                                form.append('metadata', new Blob([JSON.stringify({ name: archiveName })], { type: 'application/json' }));
                                form.append('file', htmlBlob);
                                return form;
                            })()
                        }
                    );
                    if (!updateResp.ok) console.warn('Checkpoint update warning:', await updateResp.text());
                    else console.log('✅ Checkpoint updated (no duplicate):', archiveName);
                } else {
                    // ── CREATE new file ──────────────────────────────────────
                    const form = new FormData();
                    form.append('metadata', new Blob([JSON.stringify({ name: archiveName, parents: [questionBanksFolderId] })], { type: 'application/json' }));
                    form.append('file', htmlBlob);
                    const createResp = await fetch(
                        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                        {
                            method: 'POST',
                            headers: new Headers({ 'Authorization': 'Bearer ' + token }),
                            body: form
                        }
                    );
                    if (!createResp.ok) console.warn('Checkpoint create warning:', await createResp.text());
                    else console.log('✅ Checkpoint saved to Drive:', archiveName);
                }
            }
        } catch (e) {
            // Non-fatal: Drive save failure does not block the user
            console.warn('Checkpoint Drive save (non-fatal):', e);
        }
    }

    // ── Pre-fill the archiveFileName input on the Publish tab ───────────────
    const archiveInput = document.getElementById('archiveFileName');
    if (archiveInput) archiveInput.value = archiveName;

    // ── Navigate to Publish tab ──────────────────────────────────────────────
    showTab('publish');
}

async function publishExam() {
    if (!requireRole(['admin', 'faculty'])) return;
    const instructor = document.getElementById('genInstructor').value.trim();
    const course = document.getElementById('genCourse').value.trim();
    if (!instructor) { alert('Please enter Instructor name in Generate tab'); showTab('generate'); return; }
    if (!course) { alert('Please enter Course code in Generate tab'); showTab('generate'); return; }
    if (Object.keys(generatedSets).length === 0) { alert('No questions to publish. Please generate or import questions first.'); showTab('ai-bridge'); return; }

    const cfg = {
        instructor, course,
        semester: document.getElementById('genSemester').value,
        topic: document.getElementById('genTopic').value,
        standard: document.getElementById('genStandard').value,
        sets: parseInt(document.getElementById('genSets').value),
        attempts: parseInt(document.getElementById('genAttempts').value),
        linkStart: document.getElementById('linkStartTime').value,
        linkEnd: document.getElementById('linkEndTime').value,
        duration: parseInt(document.getElementById('genDuration').value),
        markCorrect: parseFloat(document.getElementById('markCorrect').value),
        markNegative: parseFloat(document.getElementById('markNegative').value),
        resultsSheetId: null
    };

    currentExam = { id: 'EXAM_' + Date.now(), config: cfg, sets: generatedSets, studentAttempts: {}, createdAt: new Date().toISOString() };

    const baseUrl = location.href.split('?')[0];
    let studentUrl = `${baseUrl}?mode=student&exam=${currentExam.id}`;
    let driveError = null;

    // Drive path — wrapped entirely so failures never block the UI update
    if (driveFolderId && gapi.client) {
        try {
            await getOrCreateInstructorFolder(instructor);

            const questionBanksFolderId = await getInstructorSubfolder('03_Question_Banks');
            const examConfigsFolderId   = await getInstructorSubfolder('07_Exam_Configurations');
            const resultsFolderId       = await getInstructorSubfolder('05_Results_Archives');

            // 1. Results sheet
            try {
                const sheetName = `Mark_${instructor}_${cfg.semester}_${course}_${cfg.topic}_${new Date().toLocaleDateString('en-GB').replace(/\//g, '')}`;
                const sheet = await gapi.client.sheets.spreadsheets.create({ resource: { properties: { title: sheetName } } });
                currentExam.config.resultsSheetId = sheet.result.spreadsheetId;
                if (resultsFolderId) await gapi.client.drive.files.update({ fileId: currentExam.config.resultsSheetId, addParents: resultsFolderId, fields: 'id, parents' });
                await gapi.client.sheets.spreadsheets.values.update({ spreadsheetId: currentExam.config.resultsSheetId, range: 'Sheet1!A1:I1', valueInputOption: 'USER_ENTERED', resource: { values: [['Timestamp','Email','Name','ID','Attempt','Set Assigned','Final Score','Questions Answered','Total Questions']] } });
                await gapi.client.drive.permissions.create({ fileId: currentExam.config.resultsSheetId, resource: { type: 'anyone', role: 'writer' } });
            } catch (e) { console.warn('Results sheet (non-fatal):', e); }

            // 2. Save exam JSON config
            if (examConfigsFolderId) {
                try {
                    const savedJson = await saveExamToDrive(currentExam, examConfigsFolderId, `Exam_${course}_${currentExam.id.slice(-6)}.json`, 'application/json');
                    const jsonFileId = savedJson && savedJson.id;
                    if (jsonFileId) {
                        try { await gapi.client.drive.permissions.create({ fileId: jsonFileId, resource: { type: 'anyone', role: 'reader' } }); } catch(e){}
                        studentUrl = `${baseUrl}?mode=student&exam=${currentExam.id}&fileId=${jsonFileId}`;
                    }
                } catch (e) { console.warn('JSON config save (non-fatal):', e); }
            }

            // 3. HTML question bank archive
            if (questionBanksFolderId) {
                try {
                    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QB - ${cfg.course}</title><style>body{font-family:sans-serif;max-width:900px;margin:0 auto;padding:20px}.set-title{background:#3498db;color:#fff;padding:10px;border-radius:6px;margin:30px 0 15px}.question{border:1px solid #e0e0e0;padding:20px;border-radius:8px;margin-bottom:20px;page-break-inside:avoid}.correct-opt{background:#d4edda;font-weight:bold}.option{padding:8px;border-radius:4px;border:1px solid #ddd;margin:4px 0}.explanation{background:#fff3cd;padding:12px;border-radius:6px;margin-top:10px}@media print{.question{border:1px solid #ccc}}</style></head><body><h1 style="text-align:center">Question Bank: ${cfg.course}</h1><p><b>Instructor:</b> ${cfg.instructor} | <b>Topic:</b> ${cfg.topic} | <b>Date:</b> ${new Date().toLocaleDateString()}</p>`;
                    Object.entries(generatedSets).forEach(([set, qs]) => {
                        html += `<div class="set-container"><h2 class="set-title">Set ${set}</h2>`;
                        qs.forEach(q => {
                            const corr = Array.isArray(q.correct) ? q.correct : [q.correct];
                            html += `<div class="question"><b>Q${q.number}. [${(q.type||'single').toUpperCase()}] +${q.marks}/-${q.negative}</b><p>${q.text}</p>`;
                            q.options.forEach((opt, i) => { 
                                const optId = (q.optionIds && q.optionIds[i]) ? `[${q.optionIds[i]}] ` : '';
                                html += `<div class="option ${corr.includes(i)?'correct-opt':''}">${String.fromCharCode(65+i)}. ${optId}${opt}</div>`; 
                            });
                            if (q.explanation) html += `<div class="explanation"><b>Explanation:</b> ${q.explanation}</div>`;
                            html += `</div>`;
                        });
                        html += `</div>`;
                    });
                    html += `</body></html>`;
                    let archiveName = (document.getElementById('archiveFileName').value || 'Question_Bank').replace(/\.[^.]+$/, '') + '.html';
                    await saveExamToDrive(new Blob([html], { type: 'text/html' }), questionBanksFolderId, archiveName, 'text/html', true);
                } catch (e) { console.warn('HTML archive (non-fatal):', e); }
            }

        } catch (e) {
            console.error('Drive publish error:', e);
            if (e && typeof e === 'object') {
                if (e.message) {
                    driveError = e.message;
                } else if (e.result && e.result.error && e.result.error.message) {
                    driveError = e.result.error.message;
                } else if (e.error && e.error.message) {
                    driveError = e.error.message;
                } else {
                    try {
                        driveError = JSON.stringify(e);
                    } catch (_) {
                        driveError = String(e);
                    }
                }
            } else {
                driveError = String(e);
            }
        }
    } else {
        // LocalStorage fallback
        try { localStorage.setItem('exam_' + currentExam.id, JSON.stringify(currentExam)); } catch(e) {}
    }

    // ── UI ALWAYS UPDATES ──────────────────────────────────────────────────
    addToLibrary(currentExam);
    document.getElementById('pubInstructor').textContent = cfg.instructor;
    document.getElementById('pubCourse').textContent = cfg.course;
    document.getElementById('pubStandard').textContent = cfg.standard;
    document.getElementById('pubSets').textContent = cfg.sets + ' Sets';
    document.getElementById('pubAttempts').textContent = cfg.attempts + ' Attms';
    document.getElementById('studentUrl').textContent = studentUrl;
    localStorage.removeItem('exam_draft');

    showTab('publish');

    const resultCard = document.getElementById('publishResult');
    if (resultCard) {
        resultCard.classList.remove('hidden-section');
        setTimeout(() => resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
    }

    if (driveError) {
        alert(`\u26a0\ufe0f Published locally. Drive had an issue:\n${driveError}\n\nYour student link is shown below.`);
    } else {
        alert('\u2705 Exam Published Successfully!');
    }
}

async function saveExamToDrive(data, folderId, fileName, mimeType, isBlob = false) {
    if (!requireRole(['admin', 'faculty'])) throw new Error('Access denied');
    const token = gapi.client.getToken().access_token;
    const metadata = { name: fileName, parents: [folderId] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', isBlob ? data : new Blob([JSON.stringify(data, null, 2)], { type: mimeType }));

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: new Headers({ 'Authorization': 'Bearer ' + token }),
        body: form
    });
    return await response.json();
}
function copyStudentUrl() {
    const url = document.getElementById('studentUrl').textContent.trim();
    if (!url || url === 'Generating link...') return;
    navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById('copyLinkBtn');
        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = '✅ Copied!';
            btn.style.background = 'linear-gradient(135deg, #00ff88 0%, #00c9a7 100%)';
            setTimeout(() => {
                btn.innerHTML = original;
                btn.style.background = '';
            }, 2000);
        }
    });
}

// ==========================================
// STUDENT EXAM MODE
// ==========================================

async function checkStudentMode() {
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'student') {
        document.getElementById('mainPortal').classList.add('hidden-section');
        document.getElementById('studentView').classList.remove('hidden-section');
        document.getElementById('accountBar')?.classList.add('hidden');

        const fileId = params.get('fileId');
        if (fileId) {
            try {
                // Use a direct REST fetch with the public API key — no OAuth/gapi needed
                const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${GOOGLE_API_KEY}`;
                const response = await fetch(driveUrl);
                if (response.ok) {
                    currentExam = await response.json();
                } else {
                    console.error('Failed to fetch exam file:', response.status, await response.text());
                }
            } catch (e) {
                console.error('Exam fetch error:', e);
            }
        } else if (params.get('exam')) {
            const examData = localStorage.getItem('exam_' + params.get('exam'));
            if (examData) currentExam = JSON.parse(examData);
        }

        if (currentExam && currentExam.config) {
            document.getElementById('examStateMessage').innerHTML = `
                <div class="max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-8 mt-12 text-center border-t-[6px] border-blue-600 modal-animate">
                    <h2 class="text-3xl font-extrabold mb-2 text-gray-800">${currentExam.config.course} Exam</h2>
                    <p class="text-sm font-medium text-blue-600 mb-8 bg-blue-50 py-1.5 px-4 rounded-full inline-block">${currentExam.config.topic} | ${currentExam.config.standard}</p>
                    <div class="space-y-4 mb-8">
                        <input type="text" id="sName" placeholder="Full Name" class="w-full p-4 border-2 rounded-xl">
                        <input type="text" id="sId" placeholder="Student ID" class="w-full p-4 border-2 rounded-xl">
                        <input type="email" id="sEmail" placeholder="Email (Optional)" class="w-full p-4 border-2 rounded-xl">
                    </div>
                    <button onclick="startExam()" class="w-full pearl-btn pearl-btn-blue py-4 rounded-xl text-white">Start Exam Now</button>
                </div>
            `;
            document.getElementById('examStateMessage').classList.remove('hidden-section');
        }
    }
}

let examTimerInterval = null;
let examTimeRemaining = 0;
let examSecurityActive = false;
let isSubmitting = false;

function startExam() {
    isSubmitting = false;
    isHandlingBreach = false;
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

    // Reset security counters for this attempt
    tabSwitchCount = 0;
    examSecurityActive = true;
    if (!studentSession.securityLog) studentSession.securityLog = [];

    // Force fullscreen
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
            console.warn('Fullscreen request failed:', err);
        });
    }

    document.getElementById('securityBanner').classList.add('hidden-section');
    document.getElementById('examStateMessage').classList.add('hidden-section');
    document.getElementById('examInterface').classList.remove('hidden-section');
    document.getElementById('totalQNum').textContent = studentSession.questions.length;
    document.getElementById('currentSetDisplay').textContent = 'Set ' + studentSession.set;
    document.getElementById('studentNameDisplay').textContent = studentSession.name;
    document.getElementById('studentIdDisplay').textContent = studentSession.id;

    if (currentExam.config && currentExam.config.duration) {
        startExamTimer(currentExam.config.duration);
    } else {
        startExamTimer(60); // Default to 60 minutes
    }

    loadQuestion(0);
}

function startExamTimer(durationMinutes) {
    if (examTimerInterval) clearInterval(examTimerInterval);
    examTimeRemaining = durationMinutes * 60;
    updateTimerDisplay();

    examTimerInterval = setInterval(() => {
        examTimeRemaining--;
        if (examTimeRemaining <= 0) {
            clearInterval(examTimerInterval);
            examTimeRemaining = 0;
            updateTimerDisplay();
            
            // Disable security BEFORE the native alert pops up, otherwise the alert itself triggers a "blur" strike!
            examSecurityActive = false; 
            isSubmitting = true;

            setTimeout(() => {
                const modal = document.getElementById('securityModal');
                const icon = document.getElementById('securityModalIcon');
                const title = document.getElementById('securityModalTitle');
                const message = document.getElementById('securityModalMessage');
                const warning = document.getElementById('securityModalWarning');
                const btn = document.getElementById('securityModalBtn');

                if (modal) {
                    icon.textContent = '⏱️';
                    title.textContent = "TIME'S UP!";
                    title.className = "text-3xl font-black text-blue-700 mb-2 uppercase tracking-tight";
                    modal.querySelector('.bg-white').className = "bg-white rounded-[2rem] p-10 max-w-lg w-full shadow-2xl border-4 border-blue-500 transition-all";
                    btn.className = "w-full px-10 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-lg text-white transition-all shadow-xl shadow-blue-900/20";
                    
                    message.textContent = "Your time is up! Your exam has been submitted automatically.";
                    warning.classList.add('hidden-section');
                    btn.textContent = 'View Results';
                    btn.onclick = () => {
                        modal.classList.add('hidden-section');
                    };
                    modal.classList.remove('hidden-section');
                }
                
                finalSubmit();
            }, 50);
        } else {
            updateTimerDisplay();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const display = document.getElementById('examTimerDisplay');
    if (!display) return;
    const h = Math.floor(examTimeRemaining / 3600).toString().padStart(2, '0');
    const m = Math.floor((examTimeRemaining % 3600) / 60).toString().padStart(2, '0');
    const s = (examTimeRemaining % 60).toString().padStart(2, '0');
    
    if (examTimeRemaining >= 3600) {
       display.textContent = `${h}:${m}:${s}`;
    } else {
       display.textContent = `00:${m}:${s}`;
    }
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
    const total = studentSession.questions.length;
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
    const total = studentSession.questions.length;
    tracker.innerHTML = studentSession.questions.map((q, i) => {
        let iconCls = 'gift-icon ';
        if (i === studentSession.currentIdx) iconCls += 'current';
        else if (studentSession.answers[i] !== undefined) iconCls += 'answered';
        else iconCls += 'unanswered';
        return `<div class="gift-item">${i + 1}</div>`;
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
function saveAndNext() { if (studentSession.currentIdx < studentSession.questions.length - 1) loadQuestion(studentSession.currentIdx + 1); else showSubmitConfirmation(); }
function clearResponse() { delete studentSession.answers[studentSession.currentIdx]; loadQuestion(studentSession.currentIdx); }
function showSubmitConfirmation() { document.getElementById('submitModal').classList.remove('hidden'); }
function closeSubmitModal() { document.getElementById('submitModal').classList.add('hidden'); }

function finalSubmit() {
    if (isSubmitting) return;
    isSubmitting = true;
    closeSubmitModal();
    examSecurityActive = false;
    if (examTimerInterval) clearInterval(examTimerInterval);
    
    // Exit fullscreen if active
    if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.warn(err));
    }

    let score = 0;
    studentSession.questions.forEach((q, i) => {
        const answer = studentSession.answers[i];
        if (answer === undefined) return;
        if (answer === q.correct) score += (q.marks || 4);
        else score -= (q.negative || 1);
    });

    if (currentExam.config && currentExam.config.resultsSheetId && typeof gapi !== 'undefined' && gapi.client && gapi.client.sheets) {
        const rowData = [new Date().toLocaleString(), studentSession.email, studentSession.name, studentSession.id, 1, studentSession.set, score, Object.keys(studentSession.answers).length, studentSession.questions.length];
        gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: currentExam.config.resultsSheetId,
            range: 'Sheet1!A:I',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: { values: [rowData] }
        }).catch(err => {
            console.error('Failed to submit results to Google Sheet:', err);
        });
    }

    // Save student attempt to local storage as fallback
    try {
        const attempts = JSON.parse(localStorage.getItem('student_exam_attempts') || '[]');
        attempts.push({
            examId: currentExam.id,
            course: currentExam.config ? currentExam.config.course : 'Unknown',
            topic: currentExam.config ? currentExam.config.topic : 'Unknown',
            timestamp: new Date().toISOString(),
            name: studentSession.name,
            id: studentSession.id,
            email: studentSession.email,
            score: score,
            answers: studentSession.answers
        });
        localStorage.setItem('student_exam_attempts', JSON.stringify(attempts));
    } catch (e) {
        console.warn('Failed to save attempt to localStorage:', e);
    }

    // --- NEW: Generate Student Answer Sheet (Excel) ---
    try {
        let htmlTable = `<table border="1" style="font-family: Arial, sans-serif; font-size: 14pt; text-align: center;">`;
        htmlTable += `<tr><th colspan="8" style="font-size: 24pt; text-align: center; font-weight: bold; padding: 10px;">STUDENT NAME: ${studentSession.name} | ID: ${studentSession.id}</th></tr>`;
        htmlTable += `<tr><th colspan="8" style="font-size: 18pt; text-align: center; font-weight: bold; padding: 10px;">SET: ${studentSession.set}</th></tr>`;
        htmlTable += `<tr style="background-color: #f2f2f2;">
            <th>Number</th><th>Type</th><th>Option_A</th><th>Option_B</th><th>Option_C</th><th>Option_D</th><th>Correct</th><th>Student_Answer</th>
        </tr>`;

        studentSession.questions.forEach((q, i) => {
            const answerIdx = studentSession.answers[i];
            const type = (q.type || 'single').toUpperCase();
            const optA = (q.optionIds && q.optionIds[0]) ? q.optionIds[0] : '';
            const optB = (q.optionIds && q.optionIds[1]) ? q.optionIds[1] : '';
            const optC = (q.optionIds && q.optionIds[2]) ? q.optionIds[2] : '';
            const optD = (q.optionIds && q.optionIds[3]) ? q.optionIds[3] : '';
            
            const correctOptIdx = Array.isArray(q.correct) ? q.correct[0] : q.correct;
            const correctOpt = (q.optionIds && q.optionIds[correctOptIdx]) ? q.optionIds[correctOptIdx] : '';
            const studentOpt = (answerIdx !== undefined && q.optionIds && q.optionIds[answerIdx]) ? q.optionIds[answerIdx] : 'Unanswered';
            
            htmlTable += `<tr>
                <td>${q.number}</td>
                <td>${type}</td>
                <td>${optA}</td>
                <td>${optB}</td>
                <td>${optC}</td>
                <td>${optD}</td>
                <td style="background-color: #d4edda;">${correctOpt}</td>
                <td style="background-color: ${answerIdx === correctOptIdx ? '#d4edda' : '#f8d7da'};">${studentOpt}</td>
            </tr>`;
        });
        htmlTable += `</table>`;

        const blob = new Blob([htmlTable], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        let baseName = "Exam";
        if (currentExam && currentExam.config) {
            const cfg = currentExam.config;
            const dateStr = new Date().toLocaleDateString('en-GB').replace(/\\//g, '');
            baseName = \`QS_\${cfg.instructor}_\${cfg.semester}_\${cfg.course}_\${cfg.topic}_\${dateStr}\`;
        }
        
        a.download = \`\${baseName}_\${studentSession.name}.xls\`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Failed to generate Student Excel Sheet:", e);
    }

    document.getElementById('studentView').classList.add('hidden-section');
    document.getElementById('resultView').classList.remove('hidden-section');
    
    // Fix: Ensure global overlays are disabled so they don't block the results screen
    const enforcer = document.getElementById('fullscreenEnforcer');
    if (enforcer) enforcer.classList.add('hidden-section');
    document.getElementById('finalBestScore').textContent = score;
}

function initLibrary() {
    const saved = localStorage.getItem('exam_library');
    if (saved) { try { libraryData = JSON.parse(saved); } catch (e) { } }
}

function addToLibrary(exam) {
    if (!exam) return;
    
    // Add to local list
    libraryData.unshift(exam);
    
    // Limit to 50 items and save to Browser storage
    localStorage.setItem('exam_library', JSON.stringify(libraryData.slice(0, 50)));
    
    // Update the UI if we are on the library tab
    if (!document.getElementById('content-library').classList.contains('hidden-section')) {
        renderLibraryUI();
    }
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
                <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl">📋</div>
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

// ==========================================
// STRICT EXAM SECURITY LOCKDOWN
// ==========================================

let tabSwitchCount = 0;
const MAX_TAB_SWITCHES = 4;
let isHandlingBreach = false;

function dismissSecurityModal() {
    const modal = document.getElementById('securityModal');
    if (modal) modal.classList.add('hidden-section');
    isHandlingBreach = false; // RELEASE THE LOCK
}

function handleSecurityBreach(reason) {
    if (!examSecurityActive) return;
    if (isHandlingBreach) return;

    isHandlingBreach = true;
    tabSwitchCount++;
    
    // Log violation
    studentSession.securityLog = studentSession.securityLog || [];
    studentSession.securityLog.push({ timestamp: new Date().toISOString(), reason: reason });

    // Attempt to re-enter fullscreen
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
    }

    const banner = document.getElementById('securityBanner');
    const reasonText = document.getElementById('securityBannerReason');
    const chancesText = document.getElementById('securityChancesLeft');

    let chancesLeft = MAX_TAB_SWITCHES - tabSwitchCount;
    if (chancesLeft < 0) chancesLeft = 0;

    if (banner) banner.classList.remove('hidden-section');
    if (reasonText) reasonText.textContent = tabSwitchCount === 1 ? `Warning: ${reason}` : (chancesLeft <= 0 ? `Final Violation: ${reason}` : `Strike ${tabSwitchCount - 1}: ${reason}`);
    if (chancesText) chancesText.textContent = tabSwitchCount === 1 ? '3' : chancesLeft.toString();

    // Allow DOM to paint the red banner before blocking the thread with the modal
    setTimeout(() => {
        const modal = document.getElementById('securityModal');
        const icon = document.getElementById('securityModalIcon');
        const title = document.getElementById('securityModalTitle');
        const message = document.getElementById('securityModalMessage');
        const warning = document.getElementById('securityModalWarning');
        const btn = document.getElementById('securityModalBtn');

        if (!modal) return;

        // Reset styling to RED (in case it was changed to blue by the timer)
        modal.querySelector('.bg-white').className = "bg-white rounded-[2rem] p-10 max-w-lg w-full shadow-2xl border-4 border-red-500 transition-all";
        title.className = "text-3xl font-black text-red-700 mb-2 uppercase tracking-tight";
        btn.className = "w-full px-10 py-4 bg-red-600 hover:bg-red-700 rounded-xl font-black text-lg text-white transition-all shadow-xl shadow-red-900/20";

        if (tabSwitchCount === 1) {
            icon.textContent = '⚠️';
            title.textContent = 'SECURITY ALERT';
            message.textContent = `Reason: ${reason}\n\nThis activity is strictly prohibited and has been logged. Please return to the exam immediately.`;
            warning.classList.add('hidden-section');
            btn.textContent = 'I Understand';
            btn.onclick = dismissSecurityModal;
        } else if (chancesLeft <= 0) {
            icon.textContent = '🚨';
            title.textContent = 'EXAM TERMINATED';
            message.textContent = 'You have exceeded the maximum number of allowed security violations.\nYour exam is being submitted now with your current answers.';
            warning.classList.add('hidden-section');
            btn.textContent = 'View Results';
            btn.onclick = () => {
                modal.classList.add('hidden-section');
                isHandlingBreach = false;
            };
            finalSubmit(); // Terminate instantly
        } else {
            icon.textContent = '🚨';
            title.textContent = 'SECURITY BREACH DETECTED';
            message.textContent = `Strike ${tabSwitchCount - 1} of 3\n\nReason: ${reason}`;
            warning.classList.remove('hidden-section');
            warning.textContent = chancesLeft === 1 
                ? '⛔ FINAL WARNING! Next violation will immediately submit and waste your attempt.'
                : `WARNING: ${chancesLeft} CHANCE${chancesLeft === 1 ? '' : 'S'} LEFT. Further violations will result in forced submission.`;
            btn.textContent = 'I Understand';
            btn.onclick = dismissSecurityModal;
        }

        modal.classList.remove('hidden-section');
    }, 50);
}

// 1. Focus / Visibility Tripwires
window.addEventListener('blur', () => { handleSecurityBreach('Lost Window Focus (Alt+Tab or clicked elsewhere)'); });
document.addEventListener('visibilitychange', () => { if (document.hidden) handleSecurityBreach('Tab Hidden or Minimized'); });

// 2. Fullscreen Tripwire
document.addEventListener('fullscreenchange', () => {
    if (examSecurityActive && !document.fullscreenElement) {
        const enforcer = document.getElementById('fullscreenEnforcer');
        if (enforcer) enforcer.classList.remove('hidden-section');
        handleSecurityBreach('Exited Fullscreen Mode');
    }
});

function enforceFullscreenClick() {
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().then(() => {
            const enforcer = document.getElementById('fullscreenEnforcer');
            if (enforcer) enforcer.classList.add('hidden-section');
        }).catch(() => {});
    }
}

// 3. Keyboard & Interaction Lockdown
document.addEventListener('contextmenu', e => { e.preventDefault(); }); // Global block to prevent pre-exam Inspect Element
document.addEventListener('copy', e => { if (examSecurityActive) e.preventDefault(); });
document.addEventListener('cut', e => { if (examSecurityActive) e.preventDefault(); });
document.addEventListener('paste', e => { if (examSecurityActive) e.preventDefault(); });
document.addEventListener('dragstart', e => { if (examSecurityActive) e.preventDefault(); });

// (Global click listener removed in favor of the hard overlay)

document.addEventListener('keydown', e => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
    const key = e.key.toLowerCase();

    // ALWAYS block DevTools to prevent console injection before exam starts
    if (e.key === 'F12' || (cmdOrCtrl && e.shiftKey && ['i', 'j', 'c'].includes(key))) {
        e.preventDefault();
        if (examSecurityActive) handleSecurityBreach('Attempted to open Developer Tools');
        return;
    }

    if (!examSecurityActive) return;

    // Block F5
    if (e.key === 'F5') { e.preventDefault(); handleSecurityBreach('Attempted to refresh the page'); }
    
    // Block PrintScreen (Clear clipboard hack by copying empty space)
    if (e.key === 'PrintScreen') { 
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('').catch(() => {});
        }
        handleSecurityBreach('Attempted to take a screenshot'); 
    }

    // Block Cmd/Ctrl Shortcuts
    if (cmdOrCtrl) {
        const blockedKeys = ['c', 'v', 'x', 'a', 's', 'p', 'f', 'g', 'h', 'u', 't', 'n', 'w', 'r'];
        if (blockedKeys.includes(key)) {
            e.preventDefault();
        }
    }
});

// Guard against page refresh/close
window.addEventListener('beforeunload', (e) => {
    if (examSecurityActive && !isSubmitting) {
        e.preventDefault();
        e.returnValue = 'You are currently in an active exam. Refreshing or leaving will cause you to lose your progress and waste an attempt.';
        return e.returnValue;
    }
});

// ==========================================
// ADMIN SETTINGS & REGISTRY (v4.9)
// ==========================================

function renderLegacyAdminSettings() {
    if (!requireRole('admin')) return;
    if (!systemConfig) return;
    
    document.getElementById('setAdminPass').value = 'Managed in authorized_emails';
    const list = document.getElementById('facultyRegistryList');
    list.innerHTML = systemConfig.faculty.map((f, i) => `
        <div class="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl shadow-sm group">
            <input type="email" placeholder="Email" value="${f.email}" class="flex-1 p-2 bg-slate-50 border rounded-lg text-xs font-bold" onchange="updateFacultyRecord(${i}, 'email', this.value)">
            <input type="text" placeholder="PIN" value="${f.pin}" maxlength="4" class="w-20 p-2 bg-slate-50 border rounded-lg text-xs text-center font-black tracking-widest" onchange="updateFacultyRecord(${i}, 'pin', this.value)">
            <button onclick="removeFacultyRow(${i})" class="w-8 h-8 rounded-lg text-rose-400 hover:bg-rose-50 transition">✕</button>
        </div>
    `).join('');
}

function updateFacultyRecord(index, field, value) {
    if (!requireRole('admin')) return;
    if (field === 'pin' && !/^\d{4}$/.test(value)) {
        alert("PIN must be exactly 4 digits.");
        return;
    }
    systemConfig.faculty[index][field] = value;
}

function addNewFacultyRow() {
    if (!requireRole('admin')) return;
    systemConfig.faculty.push({ email: "", pin: "0000", name: "Pending Login" });
    renderAdminSettings();
}

function removeFacultyRow(index) {
    if (!requireRole('admin')) return;
    if (confirm("Revoke access for this account?")) {
        systemConfig.faculty.splice(index, 1);
        renderAdminSettings();
    }
}

async function saveSystemConfig(manual = false) {
    if (!requireRole(['admin', 'faculty'])) return;
    if (!driveFolderId || !systemConfig) return;
    
    // Update admin pass from UI if manual save
    if (manual) {
        systemConfig.admin_password = null;
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
        
        if (manual) alert("✅ System Records Securely Updated on Drive!");
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

// ==========================================
// INTERACTIVE UI EFFECTS (React-Inspired Hover Glow)
// ==========================================

function initInteractiveModals() {
    document.querySelectorAll('.modal-animate').forEach(modal => {
        // Ensure the container clips the blob and holds relative items
        modal.classList.add('relative', 'overflow-hidden');
        
        // Elevate all immediate children so they sit above the glow blob
        Array.from(modal.children).forEach(child => {
            child.classList.add('relative', 'z-10');
        });

        // Create the glowing blob
        const glowBlob = document.createElement('div');
        // Setting up dimensions, blur, and opacity transitions
        glowBlob.className = 'absolute pointer-events-none w-[500px] h-[500px] rounded-full blur-3xl opacity-0 transition-opacity duration-300';
        // Using inline background to ensure colors apply without strict strict CDN compilation dependency
        glowBlob.style.backgroundImage = 'linear-gradient(to right, rgba(216, 180, 254, 0.3), rgba(147, 197, 253, 0.3), rgba(249, 168, 212, 0.3))';
        glowBlob.style.top = '0';
        glowBlob.style.left = '0';
        glowBlob.style.zIndex = '0';
        
        modal.insertBefore(glowBlob, modal.firstChild);

        modal.addEventListener('mousemove', (e) => {
            const rect = modal.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Smoothly follow the mouse with a slight transform delay
            glowBlob.style.transform = `translate(${x - 250}px, ${y - 250}px)`;
            glowBlob.style.transition = 'transform 0.1s ease-out, opacity 0.3s ease-in-out';
        });

        modal.addEventListener('mouseenter', () => {
            glowBlob.classList.remove('opacity-0');
            glowBlob.classList.add('opacity-100');
        });

        modal.addEventListener('mouseleave', () => {
            glowBlob.classList.add('opacity-0');
            glowBlob.classList.remove('opacity-100');
        });
    });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initInteractiveModals();
    
    // Admin Intelligence Initialization
    const adminInput = document.getElementById('adminTopicInput');
    if (adminInput) {
        adminInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') runAcademicSearch();
        });
    }
});

/**
 * ADMIN INTELLIGENCE: Academic Resource Discovery (v4.9.1)
 * Strictly restricted to Admin role for internet-wide curated mapping.
 */
let currentSearchLevel = 'GENERAL';

function setSearchLevel(lvl) {
    currentSearchLevel = lvl;
    
    // Reset all buttons to default inactive state
    const buttons = document.querySelectorAll('.search-level-btn');
    buttons.forEach(btn => {
        btn.className = 'search-level-btn px-5 py-2 rounded-full font-black text-[10px] transition-all duration-300 bg-white text-slate-500 hover:text-indigo-600 border border-slate-100';
    });
    
    // Highlight the active button
    const activeBtn = document.getElementById('btn-' + lvl);
    if (activeBtn) {
        activeBtn.className = 'search-level-btn px-5 py-2 rounded-full font-black text-[10px] transition-all duration-300 bg-indigo-600 text-white shadow-lg shadow-indigo-100';
    }
}

// --- OER & TOKEN REGISTRY (v4.9.6.2) ---


const verifiedTokens = [
    {
        address: '3E9eXWovmB1yX57t8wTozV68L5vT19mQv5m6L8wPsn4S',
        name: 'Arke',
        symbol: 'ARKE',
        verified: true,
        desc: 'Decentralized RWA Intelligence Protocol'
    }
];

function runAcademicSearch() {
    if (!requireRole('admin')) return;
    const topic = document.getElementById('adminTopicInput').value.trim();
    if (!topic) {
        alert("Please enter a topic to discover resources.");
        return;
    }

    const resultsContainer = document.getElementById('adminSearchPortals');
    
    let levelDisplay = currentSearchLevel;
    if (levelDisplay === 'JEE_MAINS') levelDisplay = 'JEE Mains';
    else if (levelDisplay === 'JEE_ADV') levelDisplay = 'JEE Advanced';
    else if (levelDisplay === 'GRADUATE') levelDisplay = 'Graduate';
    else if (levelDisplay === 'JAM') levelDisplay = 'JAM';
    else if (levelDisplay === 'GENERAL') levelDisplay = 'Open Knowledge';

    resultsContainer.innerHTML = `
        <div class="col-span-full py-12 text-center">
            <div class="animate-spin text-4xl mb-4">🔮</div>
            <h4 class="text-indigo-600 font-bold">Mapping Internet Resources...</h4>
            <p class="text-slate-400 text-[10px] uppercase tracking-widest font-black mt-2">Level: ${levelDisplay}</p>
        </div>
    `;
    resultsContainer.className = 'mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 opacity-100 translate-y-0 transition-all duration-500';

    // Competitive Exam Context Expansion Logic
    let academicSuffix = '';
    let videoSuffix = '';
    let scholarSuffix = '';

    switch (currentSearchLevel) {
        case 'GRADUATE':
            academicSuffix = ' "graduate lecture notes" "study materials" "research papers" site:edu';
            videoSuffix = ' "university level"';
            scholarSuffix = ' "research review"';
            break;
        case 'JEE_MAINS':
            academicSuffix = ' "JEE Mains preparation" "previous year questions" "short tricks"';
            videoSuffix = ' "JEE Mains crash course"';
            scholarSuffix = ' "concept mapping"'; 
            break;
        case 'JEE_ADV':
            academicSuffix = ' "JEE Advanced multiple correct" "IIT level problems" "conceptual depth"';
            videoSuffix = ' "JEE Advanced difficult problems"';
            scholarSuffix = ' "advanced concepts"';
            break;
        case 'GATE':
            academicSuffix = ' "GATE NAT questions" "standard author references" "GATE previous year"';
            videoSuffix = ' "GATE conceptual lectures"';
            scholarSuffix = ' "engineering core concepts"';
            break;
        case 'NET':
            academicSuffix = ' "CSIR NET previous papers" "research methodology" "JRF notes"';
            videoSuffix = ' "CSIR NET full lectures"';
            scholarSuffix = ' "advanced syllabus review"';
            break;
        case 'JAM':
            academicSuffix = ' "IIT JAM study material" "Integrated MSc notes"';
            videoSuffix = ' "IIT JAM preparation"';
            scholarSuffix = ' "fundamental derivations"';
            break;
        case 'GENERAL':
            academicSuffix = ' "concept overview" "study materials" site:libretexts.org OR site:openstax.org';
            videoSuffix = ' "topic explained" "educational animation"';
            scholarSuffix = ' "foundational review"';
            break;
    }

    const portals = [
        {
            label: 'OER Repositories',
            icon: '📂',
            engine: 'google',
            query: `site:(libretexts.org OR openstax.org OR oercommons.org OR merlot.org OR cnx.org OR open.bccampus.ca OR saylor.org OR epgp.inflibnet.ac.in OR egyankosh.ac.in OR chemistrysteps.com OR makingmolecules.com OR masterorganicchemistry.com OR chemistry.msu.edu OR pressbooks.pub OR spcmc.ac.in OR edurev.in) "${topic}" ${academicSuffix}`,
            desc: `Aggregated search across top-tier Open Educational Resources for ${topic} (${levelDisplay}).`
        },
        {
            label: 'Lecture Intelligence',
            icon: '🏫',
            engine: 'google',
            query: topic + academicSuffix,
            desc: `Curated university/exam materials and pedagogical structures for ${topic}.`
        },
        {
            label: 'Video Repositories',
            icon: '📺',
            engine: 'youtube',
            query: topic + videoSuffix,
            desc: `Expert-led video series and visualized problem sets tailored for ${levelDisplay}.`
        },
        {
            label: 'Research Context',
            icon: '🔬',
            engine: 'scholar',
            query: topic + scholarSuffix,
            desc: `Direct mapping to Google Scholar for high-end academic rigor and concept reviews.`
        },
        {
            label: 'Premium Courseware',
            icon: '🏛️',
            engine: 'google',
            query: `site:(mit.edu OR nptel.ac.in OR harvard.edu) "${topic}"`,
            desc: `Tier-1 global repository search including NPTEL and Ivy League standards.`
        },
        {
            label: 'PDF Deep-Scan',
            icon: '📄',
            engine: 'google',
            query: (function() {
                let base = `${topic} filetype:pdf`;
                // Append category tag for competitive exams, exclude for Graduate/General
                if (['JEE_MAINS', 'JEE_ADV', 'JAM', 'GATE', 'NET'].includes(currentSearchLevel)) {
                    let tag = levelDisplay.replace('JEE Mains', 'JEE MAIN'); // Normalized tag
                    return `${base} +${tag}`;
                }
                return base;
            })(),
            desc: `Locating strictly downloadable academic documents, archives, and PYQs for ${levelDisplay}.`
        },
        {
            label: 'Scientific Archives',
            icon: '📚',
            engine: 'google',
            query: `site:(researchgate.net OR academia.edu) "${topic}"`,
            desc: `Mapping the community-led scientific discussion and paper databases.`
        }
    ];


    setTimeout(() => {
        resultsContainer.innerHTML = '';
        portals.forEach(p => {
            let searchUrl = '';
            if (p.engine === 'google') searchUrl = `https://www.google.com/search?q=${encodeURIComponent(p.query)}`;
            else if (p.engine === 'youtube') searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(p.query)}`;
            else if (p.engine === 'scholar') searchUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(p.query)}`;

            const tile = document.createElement('div');
            tile.className = 'group/tile bg-white/80 border border-indigo-50 p-7 rounded-[2rem] hover:border-indigo-300 hover:shadow-2xl hover:shadow-indigo-50 transition-all duration-500 hover:-translate-y-1 block cursor-pointer';
            
            if (p.engine === 'custom' && p.action) {
                tile.onclick = (e) => { e.preventDefault(); eval(p.action); };
            } else {
                tile.onclick = () => window.open(searchUrl, '_blank');
            }

            tile.innerHTML = `
                <div class="flex items-center gap-5 mb-4">
                    <span class="text-3xl filter drop-shadow-lg scale-100 group-hover/tile:scale-110 transition-transform">${p.icon}</span>
                    <h4 class="font-black text-slate-800 group-hover/tile:text-indigo-600 transition-colors leading-tight">${p.label}</h4>
                </div>
                <p class="text-[10px] font-bold text-slate-500 line-clamp-2 leading-relaxed mb-6">${p.desc}</p>
                <div class="flex items-center text-[9px] font-black text-indigo-400 uppercase tracking-widest gap-2">
                    ${p.engine === 'custom' ? 'Open Registry' : 'Start Intelligence Scan'} <span class="group-hover/tile:translate-x-2 transition-transform">→</span>
                </div>
            `;
            resultsContainer.appendChild(tile);
        });
    }, 800);
}

// OER AI INTEGRATION (v4.9.6)
function toggleAdminAiGrid() {
    if (!requireRole('admin')) return;
    const grid = document.getElementById('adminAiGrid');
    if (grid.classList.contains('hidden')) {
        grid.classList.remove('hidden');
        setTimeout(() => grid.style.maxHeight = '500px', 10);
    } else {
        grid.style.maxHeight = '0';
        setTimeout(() => grid.classList.add('hidden'), 500);
    }
}

function runAdminOERGeneration(service) {
    if (!requireRole('admin')) return;
    const topic = document.getElementById('adminTopicInput').value.trim();
    if (!topic) {
        alert("Please enter a topic first!");
        return;
    }

    const oerProfile = examProfiles.OPEN_KNOWLEDGE;
    const prompt = `${oerProfile.directive}

TASK: Generate a foundational study guide and educational overview for the topic: "${topic}".
Include: Core concepts, standard derivations, and high-quality OER references.
FORMAT: Please provide this in a clean, professional academic structure.`;

    navigator.clipboard.writeText(prompt).then(() => {
        alert(`Academic Prompt for "${topic}" copied to clipboard! Opening ${service}...`);
        openAiService(service);
    }).catch(err => {
        console.error('Clipboard error:', err);
        alert('Prompt generated. Opening service...');
        openAiService(service);
    });
}




// --- NEW: TOKEN REGISTRY ---
function renderVerifiedTokens() {
    const container = document.getElementById('verifiedTokenList');
    if (!container) return;
    
    container.innerHTML = verifiedTokens.map(token => `
        <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-300 transition-all">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl font-black">
                    ${token.symbol.charAt(0)}
                </div>
                <div>
                    <div class="flex flex-wrap items-center gap-2">
                        <h4 class="font-black text-slate-800">${token.name}</h4>
                        ${token.verified ? '<span class="text-blue-500 text-xs shadow-sm bg-white rounded-full">✓</span>' : ''}
                    </div>
                    <p class="text-[9px] sm:text-[10px] text-slate-400 font-mono break-all max-w-[150px] sm:max-w-xs">${token.address}</p>
                </div>
            </div>
            <div class="text-right whitespace-nowrap">
                <span class="block text-[10px] font-black text-slate-300 uppercase tracking-widest">${token.symbol}</span>
                <span class="text-[9px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full mt-1 inline-block">Whitelisted</span>
            </div>
        </div>
    `).join('');
}


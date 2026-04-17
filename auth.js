/**
 * GOOGLE API & AUTHENTICATION
 * Online Exam Portal v4.9.5
 */

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
        DRIVE_CONFIG.mainFolder = "Chemistry Department Exam Portal";
        gapi.client.setToken({ access_token: token });
        document.getElementById('mainPortal').classList.add('hidden');
        handleAuthSuccess();
    } else {
        showAuthModal();
    }
}

function showAuthModal() {
    document.getElementById('authContainer').classList.remove('hidden');
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

    document.getElementById('welcomeUserEmail').textContent = currentUser.email;
    document.getElementById('identityModal').classList.remove('hidden-section');
    
    const isAdmin = AUTHORIZED_ADMINS.includes(currentUser.email.toLowerCase());
    const isDept = currentUser.email.toLowerCase() === DEPARTMENTAL_ACCOUNT;

    if (isAdmin) document.getElementById('btnRoleAdmin').classList.remove('hidden');
    if (isDept) document.getElementById('btnRoleFaculty').classList.remove('hidden');

    if (!isAdmin && !isDept) {
        document.getElementById('wrongAccountWarning').classList.remove('hidden');
    }
}

function resetAuthFlow() {
    document.getElementById('identityModal').classList.add('hidden-section');
    showAuthModal();
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
        entryBtn.innerHTML = '<span>ðŸ” </span> Unlock My Private Vault';
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
        if (typeof verifyFacultyLogin === 'function') await verifyFacultyLogin(name, pin);
    } else {
        if (typeof registerNewFaculty === 'function') await registerNewFaculty(name);
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
            systemConfig = {
                admin_password: "admin", 
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
        alert("Critical: Could not connect to Google Drive.");
    }
}

function switchGoogleAccount() {
    const token = gapi.client ? gapi.client.getToken() : null;
    if (token && token.access_token) {
        google.accounts.oauth2.revoke(token.access_token, () => {
            console.log('Token revoked');
        });
    }

    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expiry');
    localStorage.removeItem('google_user');

    gapi.client.setToken(null);
    currentUser = null;
    userRole = null;

    document.getElementById('accountBar').classList.add('hidden');
    document.getElementById('mainPortal').classList.add('hidden');
    showAuthModal();
}

function signOut() {
    switchGoogleAccount();
    location.reload();
}

async function saveSystemConfig() {
    if (!driveFolderId || !systemConfig) return;
    try {
        const response = await gapi.client.drive.files.list({
            q: `name='system_config.json' and '${driveFolderId}' in parents and trashed=false`,
            spaces: 'drive'
        });

        if (response.result.files.length > 0) {
            const fileId = response.result.files[0].id;
            await gapi.client.drive.files.update({
                fileId: fileId,
                media: { mimeType: 'application/json', body: JSON.stringify(systemConfig, null, 2) }
            });
        } else {
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

function requestDriveAccess() {
    const client = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: (tokenResponse) => {
            if (tokenResponse.access_token) {
                localStorage.setItem('google_access_token', tokenResponse.access_token);
                localStorage.setItem('google_token_expiry', (Date.now() + tokenResponse.expires_in * 1000).toString());
                
                fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                })
                .then(res => res.json())
                .then(user => {
                    currentUser = {
                        name: user.name,
                        email: user.email,
                        image: user.picture
                    };
                    localStorage.setItem('google_user', JSON.stringify(currentUser));
                    handleAuthSuccess();
                });
            }
        },
    });
    client.requestAccessToken();
}

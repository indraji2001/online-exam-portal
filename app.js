// ==========================================
// USER CONFIGURATION - PASTE YOUR KEYS HERE!
// ==========================================

const GOOGLE_CLIENT_ID = '670497066265-fqlae5ft60pn5eulscqalu6716227p2n.apps.googleusercontent.com'; // <--- REPLACE THIS 
const GOOGLE_API_KEY = 'AIzaSyDdUDx1O499R5H2Ikai2Hl-rDq_wYKcyC0';                                // <--- REPLACE THIS

// ==========================================
// GLOBAL STATE & CONFIGURATION
// ==========================================

let sources = [], currentExam = {}, generatedSets = {}, studentSession = {};
let parsedQuestions = [], figureMappings = [], libraryData = [];
let googleAuthToken = null, currentUser = null, driveFolderId = null, userRole = null, systemConfig = null;
let instructorsFolderId = null, commonResourcesFolderId = null;
let currentInstructorFolderId = null;
let storageScope = 'personal'; // 'personal' or 'departmental'

const AUTHORIZED_ADMINS = ['indraji2001@gmail.com', 'anindyaums@gmail.com'];
const DEPARTMENTAL_ACCOUNT = 'chemistrydept@maldacollege.ac.in';

const DRIVE_CONFIG = {
    mainFolder: null,
    instructorsFolderName: 'Instructors',
    commonResourcesFolderName: '08_Common_Resources',
    instructorSubfolders: [
        '01_Source_Materials',
        '02_Notebook_LLM_Exports',
        '03_Question_Banks',
        '04_Exam_Images',
        '05_Results_Archives',
        '06_Student_Submissions',
        '07_Exam_Configurations'
    ]
};

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const now = new Date();
    const later = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    document.getElementById('linkStartTime').value = now.toISOString().slice(0, 16);
    document.getElementById('linkEndTime').value = later.toISOString().slice(0, 16);

    initGoogleApi();
    checkEnvironment();
    checkStudentMode();
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
        
        // Unified Drive Naming Logic (v4.7)
        if (currentUser.email === 'chemistrydept@maldacollege.ac.in') {
            DRIVE_CONFIG.mainFolder = "Chemistry Department Exam Portal";
        } else {
            DRIVE_CONFIG.mainFolder = "Chemistry Department Exam Portal"; // Fixed name for everyone to prevent duplicate folders
        }
        
        gapi.client.setToken({ access_token: token });
        
        // v4.7 SECURITY FIX: Hide portal until identity is confirmed
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

function requestDriveAccess() {
    // Clear any stuck tokens in memory before requesting a new one
    gapi.client.setToken(null);

    const client = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                gapi.client.setToken({ access_token: tokenResponse.access_token });
                localStorage.setItem('google_access_token', tokenResponse.access_token);
                localStorage.setItem('google_token_expiry', Date.now() + (tokenResponse.expires_in * 1000));

                fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                })
                    .then(res => res.json())
                    .then(profile => {
                        currentUser = { name: profile.name, email: profile.email, image: profile.picture };
                        
                        // Unified Drive Naming Logic (v4.7)
                        if (profile.email === 'chemistrydept@maldacollege.ac.in') {
                            DRIVE_CONFIG.mainFolder = "Chemistry Department Exam Portal";
                        } else {
                            DRIVE_CONFIG.mainFolder = "Chemistry Department Exam Portal"; // Fixed name for everyone
                        }
                        
                        localStorage.setItem('google_user', JSON.stringify(currentUser));
                        
                        // v4.7 SECURITY FIX: 
                        // Hide portal until identity is confirmed
                        document.getElementById('mainPortal').classList.add('hidden');
                        handleAuthSuccess();
                    });
            }
        },
        error_callback: (err) => {
            console.error('Google Auth Error Scope:', err);
            if (err.type === 'popup_blocked_by_browser') {
                alert('Please allow popups for this site to sign in.');
            } else {
                alert('Sign-in Error: ' + (err.message || 'Check browser console for details. Ensure you are running on http://localhost'));
            }
        }
    });

    // Forced account selection
    client.requestAccessToken({ prompt: 'select_account' });
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

    // Role Detection Logic - v4.8 Departmental
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
    document.getElementById('nav-settings').classList.remove('hidden');
    setupMainFolder(true);
}

async function confirmFacultyEntry() {
    const name = document.getElementById('facultyNameClaim').value.trim();
    const pin = document.getElementById('facultyPinClaim').value.trim();
    
    if (!name) { alert("Please enter your name."); return; }
    if (!pin) { alert("Please enter your Faculty PIN."); return; }
    
    if (!systemConfig) {
        // Try to load config if it failed during auth success
        await initSystemConfig();
    }
    
    if (!systemConfig) {
        alert("System Configuration could not be loaded. Please ensure the admin has initialized the portal.");
        return;
    }

    // Verify against registry
    const faculty = systemConfig.faculty.find(f => 
        f.name.toLowerCase() === name.toLowerCase() && f.pin === pin
    );

    if (!faculty) {
        alert("Invalid Name or PIN. Please contact the administrator (Indrajit/Anindya) for authorization.");
        return;
    }
    
    userRole = 'faculty';
    storageScope = 'departmental';
    currentUser.facultyName = faculty.name;
    document.getElementById('genInstructor').value = faculty.name;
    DRIVE_CONFIG.mainFolder = "Chemistry Department Exam Portal";

    // Show Loading State in Modal
    document.getElementById('facultyNameStep').innerHTML = `
        <div class="text-center py-10">
            <div class="animate-spin text-4xl mb-4">⚙️</div>
            <h3 class="text-xl font-bold">Initializing Private Vault...</h3>
            <p class="text-slate-500 text-xs">Securing your departmental isolation zone</p>
        </div>
    `;

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
    badge.innerHTML = `<span class="text-[10px] font-black uppercase tracking-widest">📂 Vault: ${faculty.name}</span>`;
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
        
        // Show Admin Settings tab
        document.getElementById('tab-settings').classList.remove('hidden');
        renderAdminSettings();
        
        // Finalize Folder structure & ENSURE config file exists
        setupMainFolder(true); 
        saveSystemConfig(); // Force a save to Drive now that we are in!
    } else {
        alert("Access Denied. If this is a new setup, your default password is 'admin'.");
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
// DRIVE FOLDER MANAGEMENT
// ==========================================

async function setupMainFolder(skipMaster = false) {
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
    if (!instructorsFolderId) throw new Error('Instructors folder not initialized');

    // v4.8: Strict Name-Based Subfolder Isolation
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
    if (!currentInstructorFolderId) throw new Error('No instructor folder selected');
    const response = await gapi.client.drive.files.list({
        q: `name='${subfolderName}' and '${currentInstructorFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`, spaces: 'drive'
    });
    if (response.result.files.length > 0) return response.result.files[0].id;
    return null;
}

function showDriveFolder() {
    if (driveFolderId) window.open(`https://drive.google.com/drive/folders/${driveFolderId}`, '_blank');
}

// ==========================================
// TAB NAVIGATION
// ==========================================

function showTab(tabName) {
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
    if (tabName === 'library') loadLibrary();
    if (tabName === 'images') renderImageQueue();
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
    const instructor = document.getElementById('genInstructor').value.replace(/\s+/g, '_') || 'Instructor';
    const sem = document.getElementById('genSemester').value || 'SemXX';
    const code = document.getElementById('genCourse').value || 'Code';
    const topic = document.getElementById('genTopic').value.replace(/\s+/g, '_') || 'Topic';
    const date = new Date().toLocaleDateString('en-GB').replace(/\//g, '');
    const qsName = `QS_${instructor}_${sem}_${code}_${topic}_${date}.xlsx`;
    document.getElementById('fileNamePreview').innerHTML = `<div>Question Set: ${qsName}</div>`;
    if (document.getElementById('archiveFileName')) document.getElementById('archiveFileName').value = qsName;
}

function saveDraft() {
    const draft = {
        instructor: document.getElementById('genInstructor').value,
        course: document.getElementById('genCourse').value,
        topic: document.getElementById('genTopic').value,
        standard: document.getElementById('genStandard').value,
        duration: document.getElementById('genDuration').value,
        sets: document.getElementById('genSets').value,
        attempts: document.getElementById('genAttempts').value,
        linkStart: document.getElementById('linkStartTime').value,
        linkEnd: document.getElementById('linkEndTime').value
    };
    localStorage.setItem('exam_draft', JSON.stringify(draft));
    const indicator = document.getElementById('draftSavedIndicator');
    indicator.style.display = 'flex';
    setTimeout(() => { indicator.style.display = 'none'; }, 3000);
}

function loadDraft() {
    const draftStr = localStorage.getItem('exam_draft');
    if (!draftStr) return;
    try {
        const draft = JSON.parse(draftStr);
        document.getElementById('genInstructor').value = draft.instructor || '';
        document.getElementById('genCourse').value = draft.course || '';
        document.getElementById('genTopic').value = draft.topic || '';
        document.getElementById('genStandard').value = draft.standard || 'JEE Main';
        document.getElementById('genDuration').value = draft.duration || '180';
        document.getElementById('genSets').value = draft.sets || '4';
        document.getElementById('genAttempts').value = draft.attempts || '2';
        updateFileNamePreview();
    } catch (e) { }
}

// ==========================================
// TAB 4: AI BRIDGE
// ==========================================

function updateAiBridgeSources() {
    const container = document.getElementById('aiBridgeSources');
    if (sources.length === 0) container.innerHTML = '<p class="text-gray-400 text-sm">Add sources in Tab 1 first</p>';
    else container.innerHTML = `<div class="space-y-2">${sources.map(s => `<div class="text-sm truncate">• ${s.name}</div>`).join('')}</div>`;
}

// --- NEW: UI Logic for the Pool Slider ---
function togglePoolSlider() {
    const isChecked = document.getElementById('enablePool').checked;
    const container = document.getElementById('poolSliderContainer');
    const poolOption = document.getElementById('poolOption');
    const importMode = document.getElementById('importMode');

    if (isChecked) {
        container.classList.remove('hidden-section');
        poolOption.disabled = false; // Un-grey the option in Tab 5
        importMode.value = 'pool';   // Auto-select it for convenience
    } else {
        container.classList.add('hidden-section');
        poolOption.disabled = true;  // Grey it back out
        if (importMode.value === 'pool') importMode.value = 'shuffle';
    }
}

function updatePoolDisplay() {
    document.getElementById('poolValDisplay').textContent = document.getElementById('poolSlider').value + '%';
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

    // 4. Aggressive Local File Directive
    const localFiles = sources.filter(s => s.type === 'local' || s.type === 'drive');
    const localFilesList = localFiles.map(s => '- ' + s.name).join('\n');
    const attachedFilesDirective = localFiles.length > 0
        ? `1. ATTACHED FILES (HIGHEST PRIORITY): You MUST deeply analyze these provided files:\n${localFilesList}\nYou MUST generate a significant portion of the questions directly from the content, structures, and reactions found in these specific files.`
        : "1. ATTACHED FILES: NONE. DO NOT invent or reference any local files.";

    const prompt = `[SYSTEM COMMAND: ACT AS AN EXPERT EXAM GENERATOR. YOUR ONLY OUTPUT MUST BE RAW, VALID JSON. NO CONVERSATION.]

STANDARD: ${standard}
TOPIC: ${topic}

SOURCES & MANDATORY RESEARCH DIRECTIVES:
${attachedFilesDirective}
2. WEB LINKS: Extract content from:
${webLinks}
3. MANDATORY INDEPENDENT WEB SEARCH (CRITICAL): You MUST activate your browsing/search tool to find NEW, highly relevant external academic websites, PDFs, DOCs, or PPTs related to ${topic}. Supplement the provided sources to ensure high-quality, diverse questions.

QUESTION DISTRIBUTION (GENERATION POOL):
- Single Correct: ${single}, Multiple Correct: ${multiple}, Matching: ${matching}. TOTAL: ${total}

CRITICAL RULES FOR CHEMISTRY & SCIENCE FORMATTING:

RULE 1: MANDATORY VISUAL & STRUCTURAL QUOTA (CRITICAL)
- Science/Chemistry is not just text. At least 60% of your questions MUST be based on chemical structures, reaction schemes, diagrams, graphs, or data tables.
- You MUST actively design questions that require the student to look at a visual diagram (e.g., "Identify the major product in the given reaction scheme", "What is the name of the structure shown?").
- For EVERY visual question, you MUST insert an Image Placeholder using the exact HTML formats in Rule 2.

RULE 2: STRICT IMAGE PLACEHOLDER FORMATTING (NO HALLUCINATIONS)
You must use specific HTML tags to tell the instructor exactly where to find the image to copy-paste. The links MUST be clickable hyperlinks.
- FOR DOCUMENTS (PDF/DOC/PPT from provided sources or your independent search):
  Use RED clickable links. You MUST include the Page No, Figure/Image No (if any), and Position.
  Format: <br><br>[INSTRUCTOR NOTE - INSERT IMAGE: <a href='[VALID_URL_OR_FILE_NAME]' target='_blank' style='color:red; font-weight:bold; text-decoration:underline;'>[DOCUMENT NAME]</a> | Page: [XX] | Fig: [XX] | Position: [Top/Middle/Bottom] | Visual Description: '[e.g., reaction mechanism]']<br><br>
- FOR WEBPAGES (from provided links or your independent search):
  Use BLUE clickable links. You MUST include a direct quote of the nearby text/heading so the instructor can find the image easily.
  Format: <br><br>[INSTRUCTOR NOTE - INSERT IMAGE: <a href='[VALID_URL]' target='_blank' style='color:blue; font-weight:bold; text-decoration:underline;'>[DOMAIN NAME]</a> | Nearby Text/Heading: '[EXACT QUOTE]' | Visual Description: '[e.g., crystal lattice diagram]']<br><br>
- DO NOT invent fake URLs or 404 pages. Only reference real images that actually exist in the sources.

RULE 3: STRICT HTML FOR CHEMICAL FORMULAS (NO LATEX)
Use HTML <sub> and <sup> tags (e.g., CH<sub>3</sub>Cl). DO NOT use $ signs, \\(, \\), or LaTeX.

RULE 4: QUESTION FORMATTING STRICT RULES
- Single Correct: 'options' has exactly 4 strings. 'correct' is an integer (0-3).
- Multiple Correct: 'options' has exactly 4 strings. 'correct' is an array of integers (e.g., [0, 2]).
- Matching: DO NOT output 6 options! The 'text' MUST contain "List I" and "List II". The 'options' MUST contain exactly 4 sequence variations (e.g., "A. I-P, II-Q, III-R", "B. I-Q, II-P, III-R", etc.). The 'correct' field MUST be a single integer (0-3) pointing to the correct sequence.

RULE 5: ABSOLUTE JSON COMPLIANCE
- You MUST output ONLY valid JSON.
- Escape double quotes properly. Use <br> for new lines.

MANDATORY JSON SCHEMA TEMPLATE:
{
  "questions": [
    {
      "number": 1,
      "type": "single",
      "text": "Question text here... <br><br>[INSTRUCTOR NOTE...]",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Detailed explanation here... <br><br>[INSTRUCTOR NOTE...]",
      "difficulty": "medium",
      "marks": 4,
      "negative": 1
    }
  ]
}

Generate exactly ${total} high-quality questions following the exact schema above. START YOUR RESPONSE WITH { AND END WITH }.`;

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

        // --- NEW: THE BULLETPROOF JSON SANITIZER ---
        // This algorithm detects physical line breaks that the AI incorrectly placed 
        // INSIDE string values and silently converts them to <br> tags before parsing.
        let sanitized = "";
        let inString = false;
        let isEscaped = false;
        for (let i = 0; i < text.length; i++) {
            let char = text[i];
            if (char === '\\') {
                isEscaped = !isEscaped;
                sanitized += char;
            } else if (char === '"' && !isEscaped) {
                inString = !inString;
                sanitized += char;
                isEscaped = false;
            } else if ((char === '\n' || char === '\r') && inString) {
                // If we hit a line break inside a string, fix it automatically
                if (char === '\n') sanitized += '<br>';
                isEscaped = false;
            } else {
                sanitized += char;
                isEscaped = false;
            }
        }
        text = sanitized; // Overwrite the AI's bad text with the sanitized text
        // --- END SANITIZER ---

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

// ==========================================
// TAB 7 & 8: LIBRARY & PUBLISH (DRIVE FIX)
// ==========================================

async function loadLibrary() {
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

async function publishExam() {
    const instructor = document.getElementById('genInstructor').value.trim();
    const course = document.getElementById('genCourse').value.trim();
    if (!instructor) { alert('Please enter Instructor name in Generate tab'); showTab('generate'); return; }
    if (!course) { alert('Please enter Course code in Generate tab'); showTab('generate'); return; }
    if (Object.keys(generatedSets).length === 0) { alert('No questions to publish. Please generate or import questions first.'); showTab('ai-bridge'); return; }

    const cfg = {
        instructor: instructor, course: course,
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

    try {
        if (driveFolderId && gapi.client) {
            const instructorFolderId = await getOrCreateInstructorFolder(instructor);
            const questionBanksFolderId = await getInstructorSubfolder('03_Question_Banks');
            const examConfigsFolderId = await getInstructorSubfolder('07_Exam_Configurations');
            const resultsFolderId = await getInstructorSubfolder('05_Results_Archives');

            const sheetName = `Mark_${instructor}_${cfg.semester}_${course}_${cfg.topic}_${new Date().toLocaleDateString('en-GB').replace(/\//g, '')}`;
            const sheet = await gapi.client.sheets.spreadsheets.create({
                resource: { properties: { title: sheetName } }
            });
            currentExam.config.resultsSheetId = sheet.result.spreadsheetId;

            await gapi.client.drive.files.update({
                fileId: currentExam.config.resultsSheetId,
                addParents: resultsFolderId,
                fields: 'id, parents'
            });

            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: currentExam.config.resultsSheetId,
                range: 'Sheet1!A1:I1',
                valueInputOption: 'USER_ENTERED',
                resource: { values: [['Timestamp', 'Email', 'Name', 'ID', 'Attempt', 'Set Assigned', 'Final Score', 'Questions Answered', 'Total Questions']] }
            });

            await gapi.client.drive.permissions.create({
                fileId: currentExam.config.resultsSheetId,
                resource: { type: 'anyone', role: 'writer' }
            });

            const savedJsonReq = await saveExamToDrive(currentExam, examConfigsFolderId, `Exam_${course}_${currentExam.id.slice(-6)}.json`, 'application/json');
            const jsonFileId = savedJsonReq.id;

            if (jsonFileId) {
                try {
                    await gapi.client.drive.permissions.create({
                        fileId: jsonFileId,
                        resource: { type: 'anyone', role: 'reader' }
                    });
                } catch (e) {
                    console.log("Could not auto-share JSON.", e);
                }
            }

            const ws = XLSX.utils.json_to_sheet(Object.entries(generatedSets).flatMap(([setName, questions]) =>
                questions.map(q => ({
                    Set: setName, Number: q.number, Type: q.type, Text: q.text,
                    Option_A: q.options[0], Option_B: q.options[1], Option_C: q.options[2], Option_D: q.options[3],
                    Correct: Array.isArray(q.correct) ? q.correct.join(',') : q.correct,
                    Marks: q.marks, Negative: q.negative, Explanation: q.explanation
                }))
            ));
            const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Questions');
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            await saveExamToDrive(new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), questionBanksFolderId, document.getElementById('archiveFileName').value || 'Question_Bank.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', true);

            const baseUrl = location.href.split('?')[0];
            const studentUrl = `${baseUrl}?mode=student&exam=${currentExam.id}&fileId=${jsonFileId}`;
            document.getElementById('studentUrl').textContent = studentUrl;
        } else {
            localStorage.setItem('exam_' + currentExam.id, JSON.stringify(currentExam));
            const baseUrl = location.href.split('?')[0];
            document.getElementById('studentUrl').textContent = `${baseUrl}?mode=student&exam=${currentExam.id}`;
        }

        addToLibrary(currentExam);
        document.getElementById('pubInstructor').textContent = cfg.instructor;
        document.getElementById('pubCourse').textContent = cfg.course;
        document.getElementById('pubStandard').textContent = cfg.standard;
        document.getElementById('pubSets').textContent = cfg.sets + ' Sets';
        document.getElementById('pubAttempts').textContent = cfg.attempts;

        localStorage.removeItem('exam_draft');
        alert(`✅ Exam Published Successfully!`);
    } catch (err) {
        console.error('Publish error:', err);
        alert('Error: ' + err.message);
    }
}

async function saveExamToDrive(data, folderId, fileName, mimeType, isBlob = false) {
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
function copyStudentUrl() { navigator.clipboard.writeText(document.getElementById('studentUrl').textContent); alert('Copied!'); }

// ==========================================
// STUDENT EXAM MODE
// ==========================================

async function checkStudentMode() {
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'student') {
        document.getElementById('mainPortal').classList.add('hidden-section');
        document.getElementById('studentView').classList.remove('hidden-section');

        const fileId = params.get('fileId');
        if (fileId) {
            try {
                let retries = 0;
                while ((typeof gapi === 'undefined' || !gapi.client || !gapi.client.drive) && retries < 15) {
                    await new Promise(r => setTimeout(r, 500));
                    retries++;
                }
                if (gapi && gapi.client && gapi.client.drive) {
                    const response = await gapi.client.drive.files.get({ fileId: fileId, alt: 'media' });
                    currentExam = response.result;
                }
            } catch (e) { }
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

function startExam() {
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

    document.getElementById('examStateMessage').classList.add('hidden-section');
    document.getElementById('examInterface').classList.remove('hidden-section');
    document.getElementById('totalQNum').textContent = studentSession.questions.length;
    document.getElementById('currentSetDisplay').textContent = 'Set ' + studentSession.set;
    document.getElementById('studentNameDisplay').textContent = studentSession.name;
    document.getElementById('studentIdDisplay').textContent = studentSession.id;

    loadQuestion(0);
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
    closeSubmitModal();
    let score = 0;
    studentSession.questions.forEach((q, i) => {
        const answer = studentSession.answers[i];
        if (answer === undefined) return;
        if (answer === q.correct) score += (q.marks || 4);
        else score -= (q.negative || 1);
    });

    if (currentExam.config && currentExam.config.resultsSheetId && gapi.client.sheets) {
        const rowData = [new Date().toLocaleString(), studentSession.email, studentSession.name, studentSession.id, 1, studentSession.set, score, Object.keys(studentSession.answers).length, studentSession.questions.length];
        gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: currentExam.config.resultsSheetId,
            range: 'Sheet1!A:I',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: { values: [rowData] }
        });
    }

    document.getElementById('studentView').classList.add('hidden-section');
    document.getElementById('resultView').classList.remove('hidden-section');
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

// Security
document.addEventListener('contextmenu', e => { if (!document.getElementById('examInterface').classList.contains('hidden-section')) e.preventDefault(); });
document.addEventListener('copy', e => { if (!document.getElementById('examInterface').classList.contains('hidden-section')) e.preventDefault(); });
window.addEventListener('blur', () => { if (!document.getElementById('examInterface').classList.contains('hidden-section')) alert('Security Alert!'); });

// ==========================================
// ADMIN SETTINGS & REGISTRY (v4.7)
// ==========================================

function renderAdminSettings() {
    if (!systemConfig) return;
    
    document.getElementById('settingAdminPass').value = systemConfig.admin_password;
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
        systemConfig.admin_password = document.getElementById('settingAdminPass').value;
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


// ==========================================
// PORTAL CORE CONFIGURATION
// Keep this file small: credentials, shared state, and tiny helpers only.
// ==========================================

const GOOGLE_CLIENT_ID = '670497066265-fqlae5ft60pn5eulscqalu6716227p2n.apps.googleusercontent.com';
const GOOGLE_API_KEY = 'AIzaSyDdUDx1O499R5H2Ikai2Hl-rDq_wYKcyC0';

const SUPABASE_URL = 'https://epdnzakxmdmvldrwmkcf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_EUDjItmGuijXnXpPJD25Wg_npHA4Lu9';
let supabaseClient = null;

function initSupabase() {
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('Supabase connected: Chemistry Exam Portal DB');
    } catch (e) {
        console.error('Supabase init failed:', e);
    }
}

function generatePin() {
    return String(Math.floor(1000 + Math.random() * 9000));
}

// ==========================================
// SHARED APPLICATION STATE
// ==========================================

let sources = [], currentExam = {}, generatedSets = {}, studentSession = {};
let parsedQuestions = [], figureMappings = [], libraryData = [];
let googleAuthToken = null, currentUser = null, driveFolderId = null, userRole = null, systemConfig = null;
let currentAuthorization = { role: 'student', record: null, checkedAt: null };
let instructorsFolderId = null, commonResourcesFolderId = null;
let currentInstructorFolderId = null;
let storageScope = 'personal'; // 'personal' or 'departmental'
let currentAuthMode = 'returning'; // 'returning' or 'new'
let pendingFaculty = null;

// ==========================================
// SMALL DOM HELPERS
// ==========================================

const $ = (id) => document.getElementById(id);
const getValue = (id, fallback = '') => {
    const el = $(id);
    return el ? el.value : fallback;
};
const setValue = (id, value) => {
    const el = $(id);
    if (el) el.value = value;
};
const setText = (id, value) => {
    const el = $(id);
    if (el) el.textContent = value;
};

const AUTHORIZED_ADMINS = ['indraji2001@gmail.com', 'anindyaums@gmail.com'];
const DEPARTMENTAL_ACCOUNT = 'chemistrydept@maldacollege.ac.in';
const ADMINS_CAN_ACT_AS_FACULTY = true;

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

// --- SAFE STORAGE HELPERS ---
const safeStorage = {
    get: (key) => {
        try { return localStorage.getItem(key); }
        catch (e) { console.warn('Storage Access Denied:', e); return null; }
    },
    set: (key, value) => {
        try { localStorage.setItem(key, value); }
        catch (e) { console.warn('Storage Write Denied:', e); }
    },
    remove: (key) => {
        try { localStorage.removeItem(key); }
        catch (e) { console.warn('Storage Removal Denied:', e); }
    }
};

/**
 * CONFIGURATION & CONSTANTS
 * Online Exam Portal v4.9.5
 */

// API Credentials
const GOOGLE_CLIENT_ID = '670497066265-fqlae5ft60pn5eulscqalu6716227p2n.apps.googleusercontent.com';
const GOOGLE_API_KEY = 'AIzaSyDdUDx1O499R5H2Ikai2Hl-rDq_wYKcyC0';
const SUPABASE_URL = 'https://epdnzakxmdmvldrwmkcf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_EUDjItmGuijXnXpPJD25Wg_npHA4Lu9';

// User & Role Access
const AUTHORIZED_ADMINS = ['indraji2001@gmail.com', 'anindyaums@gmail.com'];
const DEPARTMENTAL_ACCOUNT = 'chemistrydept@maldacollege.ac.in';

// Google Drive Folder Structure
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

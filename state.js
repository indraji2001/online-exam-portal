/**
 * GLOBAL STATE
 * Online Exam Portal v4.9.5
 */

let sources = [];
let currentExam = {};
let generatedSets = {};
let studentSession = {};
let parsedQuestions = [];
let figureMappings = [];
let libraryData = [];

// Auth & Identity State
let supabaseClient = null;
let googleAuthToken = null;
let currentUser = null;
let driveFolderId = null;
let userRole = null;
let systemConfig = null;
let instructorsFolderId = null;
let commonResourcesFolderId = null;
let currentInstructorFolderId = null;
let storageScope = 'personal'; // 'personal' or 'departmental'
let currentAuthMode = 'returning'; // 'returning' or 'new'
let pendingFaculty = null;

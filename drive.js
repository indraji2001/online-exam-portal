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
                    <div class="text-3xl">📂</div>
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

// ==========================================
// NAVIGATION & CORE UI
// ==========================================

function showTab(tabId) {
    // Hide all sections
    document.querySelectorAll('section').forEach(el => {
        if (el.id.startsWith('content-')) {
            el.classList.add('hidden-section');
            el.classList.add('hidden'); // Double safety
        }
    });

    // Show target section
    const target = document.getElementById('content-' + tabId);
    if (target) {
        target.classList.remove('hidden-section');
        target.classList.remove('hidden');
    }

    // Update Tab Buttons
    document.querySelectorAll('nav button').forEach(btn => {
        if (btn.id && btn.id.startsWith('tab-')) {
            btn.className = 'flex-1 py-4 px-4 font-semibold tab-inactive rounded-xl';
        }
    });
    
    const activeBtn = document.getElementById('tab-' + tabId);
    if (activeBtn) {
        activeBtn.className = 'flex-1 py-4 px-4 font-semibold tab-active rounded-xl';
    }

    // Special Rendering for dynamic tabs
    if (tabId === 'library') renderLibraryUI();
    if (tabId === 'settings') renderAdminSettings();
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
                        
                        // Unified Drive Naming Logic (v4.9)
                        if (profile.email === 'chemistrydept@maldacollege.ac.in') {
                            DRIVE_CONFIG.mainFolder = "Chemistry Department Exam Portal";
                        } else {
                            DRIVE_CONFIG.mainFolder = "Chemistry Department Exam Portal"; // Fixed name for everyone
                        }
                        
                        localStorage.setItem('google_user', JSON.stringify(currentUser));
                        
                        // v4.9 SECURITY FIX: 
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


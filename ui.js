// ==========================================
// NAVIGATION & CORE UI
// ==========================================

function showTab(tabId) {
    const tabs = ['sources', 'extract', 'generate', 'ai-bridge', 'import', 'images', 'library', 'publish', 'settings'];
    const tabLabels = { 
        'sources': '1. Sources', 
        'extract': '2. Extract', 
        'generate': '3. Generate', 
        'ai-bridge': '4. AI Bridge', 
        'import': '5. Import', 
        'images': '6. Images', 
        'library': '7. Library', 
        'publish': '8. Publish', 
        'settings': '⚙️ Settings' 
    };

    // Hide all sections and reset buttons
    tabs.forEach(t => {
        const section = document.getElementById(`content-${t}`);
        const btn = document.getElementById(`tab-${t}`);
        if (section) section.classList.add('hidden-section');
        if (btn) {
            btn.className = 'flex-1 py-4 px-4 font-semibold tab-inactive transition whitespace-nowrap text-sm';
            btn.innerHTML = `<span class="relative z-10">${tabLabels[t]}</span><span class="tab-overlay">${tabLabels[t]}</span>`;
        }
    });

    // Show active section
    const target = document.getElementById(`content-${tabId}`);
    if (target) {
        target.classList.remove('hidden-section');
        target.classList.add('tab-content-transition');
    }

    // Mark active button
    const activeBtn = document.getElementById(`tab-${tabId}`);
    if (activeBtn) {
        activeBtn.className = 'flex-1 py-4 px-4 font-semibold tab-active transition whitespace-nowrap text-sm';
        activeBtn.innerHTML = tabLabels[tabId];
    }

    // Special Rendering for dynamic tabs
    if (tabId === 'ai-bridge') if (typeof updateAiBridgeSources === 'function') updateAiBridgeSources();
    if (tabId === 'library') {
        if (typeof renderLibraryUI === 'function') renderLibraryUI();
        else if (typeof loadLibrary === 'function') loadLibrary();
    }
    if (tabId === 'images') if (typeof renderImageQueue === 'function') renderImageQueue();
    if (tabId === 'settings') if (typeof renderAdminSettings === 'function') renderAdminSettings();
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


// ==================== AUDIO SETUP ====================
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioEnabled = false;
const audioBuffers = {}; // hover, select, sharedA may be stored here

// ----------------- Asset loading -----------------
async function loadAudioAsset(slotName, url) {
    if (!audioContext) return Promise.reject('No audioContext');
    try {
        const resp = await fetch(url, { cache: 'no-cache' });
        if (!resp.ok) throw new Error('Fetch failed: ' + resp.status);
        const arrayBuffer = await resp.arrayBuffer();
        // decodeAudioData returns a Promise in modern browsers, but some older need callback — handle both
        let decoded;
        // In modern browsers decodeAudioData returns a promise when called with one arg.
        // If it expects callback args, we fallback to wrapper.
        try {
            decoded = await audioContext.decodeAudioData(arrayBuffer);
        } catch (e) {
            // fallback callback style
            decoded = await new Promise((resolve, reject) => {
                audioContext.decodeAudioData(arrayBuffer, resolve, reject);
            });
        }
        audioBuffers[slotName] = decoded;
        console.log('[audio] loaded', slotName, 'duration', decoded.duration?.toFixed?.(3) ?? 'n/a', 's');
        return decoded;
    } catch (err) {
        console.warn('loadAudioAsset failed for', url, err);
        return Promise.reject(err);
    }
}

// ----------------- Synth fallback generators -----------------
function createHoverSoundFallback() {
    try {
        const duration = 0.04;
        const sampleRate = audioContext.sampleRate || 44100;
        const buffer = audioContext.createBuffer(1, Math.floor(duration * sampleRate), sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 50);
            data[i] = Math.sin(2 * Math.PI * 800 * t) * envelope * 0.28;
        }
        audioBuffers.hover = buffer;
    } catch (e) { console.warn('hover fallback failed', e); }
}

function createSelectSoundFallback() {
    try {
        const duration = 0.08;
        const sampleRate = audioContext.sampleRate || 44100;
        const buffer = audioContext.createBuffer(1, Math.floor(duration * sampleRate), sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 30);
            data[i] = Math.sin(2 * Math.PI * 420 * t) * envelope * 0.42;
        }
        audioBuffers.select = buffer;
    } catch (e) { console.warn('select fallback failed', e); }
}

// ----------------- Ensure sounds (try asset then fallbacks) -----------------
// This tries to load assets/A.mp3 for both hover & select. If it fails, synthesized fallbacks are created.
async function ensureSounds() {
    // If already loaded, return
    if (audioBuffers.hover && audioBuffers.select) return;

    // Path to your mp3 file. Update if your file is in a different location.
    const assetPath = 'assets/A.mp3';

    try {
        const decoded = await loadAudioAsset('sharedA', assetPath);
        // Use the same decoded buffer for hover & select, but we'll play short slices in playSound.
        audioBuffers.hover = decoded;
        audioBuffers.select = decoded;
    } catch (err) {
        console.warn('Using fallback synthesized sounds because asset load failed.');
        if (!audioBuffers.hover) createHoverSoundFallback();
        if (!audioBuffers.select) createSelectSoundFallback();
    }
}

// ----------------- HTMLAudioElement fallback (very short silent WAV placeholder by default) -----------------
let htmlAudioFallback;
function playFallback() {
    if (!htmlAudioFallback) {
        // Extremely short silent WAV placeholder — replace with a real short beep file if you want
        htmlAudioFallback = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YRAAAAAA');
        htmlAudioFallback.preload = 'auto';
    }
    try {
        htmlAudioFallback.currentTime = 0;
        htmlAudioFallback.play().catch(e => console.warn('fallback blocked', e));
    } catch (e) {
        console.warn('fallback play error', e);
    }
}

// ----------------- Play routine -----------------
function playSound(type) {
    // prefer WebAudio
    if (audioEnabled && audioBuffers[type] && audioContext.state === 'running') {
        try {
            const source = audioContext.createBufferSource();
            const gain = audioContext.createGain();
            gain.gain.value = 0.9;
            source.buffer = audioBuffers[type];
            source.connect(gain);
            gain.connect(audioContext.destination);

            // If both hover/select reference the full mp3, play only short snippets:
            if (type === 'hover') {
                // play first 0.04s
                try {
                    source.start(0, 0, 0.04);
                } catch (e) {
                    source.start(0);
                }
            } else if (type === 'select') {
                // play first 0.08s
                try {
                    source.start(0, 0, 0.08);
                } catch (e) {
                    source.start(0);
                }
            } else {
                source.start(0);
            }

            // ensure source stopped after the clip (grace margin)
            const clipDur = (type === 'hover' ? 0.04 : (type === 'select' ? 0.08 : source.buffer.duration || 0.2));
            setTimeout(() => {
                try { source.stop(); } catch (e) {}
            }, (clipDur + 0.05) * 1000);

            return;
        } catch (err) {
            console.warn('WebAudio play failed', err);
        }
    }
    // fallback to HTML audio if webaudio not available
    playFallback();
}

// ==================== CONTENT DATA (contact updated to include small circular icons) ====================
const contentData = {
    education: {
        header: 'EDUCATIONAL DETAILS',
        body: `
            <h3>Personal Information</h3>
            <p><strong>Name:</strong> Abhay Ojha</p>
            <p><strong>College:</strong> Institute of Technology and Management, GIDA</p>
            <p><strong>Course:</strong> B.Tech in Computer Science & Engineering</p>
            <p><strong>Year:</strong> Final Year</p>
            <h3>Academic Notes</h3>
            <p>Currently managing coursework with a focus on practical development and creative problem-solving. Exam schedules take priority, but always making time for coding and innovation.</p>
            <h3>Schedule</h3>
            <ul>
                <li>Morning: Classes & lectures</li>
                <li>Afternoon: Project work & assignments</li>
                <li>Evening: Personal projects & skill development</li>
                <li>Night: Relaxation & light coding</li>
            </ul>
            <p><em>Education is the foundation, but experience is the mission.</em></p>
        `
    },
    skills: {
        header: 'SKILLS & EXPERTISE',
        body: `
            <h3>Technical Skills</h3>
            <ul>
                <li><strong>App Development (Flutter, Dart, Swift, Kotlin):</strong><br>Cross-platform & Native mobile apps</li>
                <li><strong>Frontend:</strong><br>HTML, CSS, JavaScript, React, Next.js, Tailwind CSS</li>
                <li><strong>Backend:</strong><br>Python, Node.js, Express.js, REST APIs</li>
                <li><strong>Databases:</strong><br>PostgreSQL, Firebase, MySQL, Supabase</li>
                <li><strong>AI Engineering:</strong><br>Prompt Engineering, LLM Integration & Automation</li>
                <li><strong>Version Control:</strong><br>Git & GitHub</li>
                <li><strong>Cloud & DevOps:</strong><br>Docker, Kubernetes, CI/CD, AWS</li>
                 
                
            </ul>
            <h3>Creative Skills</h3>
            <ul>
                <li><strong>UI/UX Design:</strong> Clean visual layouts</li>
                <li><strong>Problem Solving:</strong> Creative debugging</li>
            </ul>
            <h3>Soft Skills</h3>
            <ul>
                <li>Time management</li>
                <li>Self-discipline</li>
                <li>Straightforward communication</li>
                <li>Quick learning</li>
            </ul>
            <p><em>“Crafting clean apps, strong systems, and cloud-ready solutions.”</em></p>
        `
    },
    projects: {
        header: 'PROJECTS PORTFOLIO',
        body: `
            <h3>TechVerse</h3>
            <p><strong>Technology:</strong> HTML,CSS,JS,TYPESCRIPT.</p>
            <p>A full Job tracking system with analytics, shortage alerts & offline support.</p>
            <ul>
                <li> 250+ comapany registered</li>
                <li> Location wise Jobs </li>
                <li>Tech stack required</li>
                <li>Fast & optimized</li>
            </ul>
            <h3>HireNova</h3>
            <p><strong>Technology:</strong> Next.js,PostgreSQL,OpenAI API,Typescript</p>
            <p>A smooth custom website to analyze resume and ATS score</p>
            <ul>
                <li>Custom controls</li>
                <li>Modern UI</li>
            </ul>
            <h3>Other basic Apps</h3>
            <ul>
                <li>PerFitlyLife App </li>
                <li>Nebula OS</li>
                <li>AI Chat assistan </li>
                <li>AI Junction</li>
                 <li> iOS game</li>
            </ul>
            <p><em>Every mission completed makes you stronger.</em></p>
        `
    },
    contact: {
        header: 'CONTACT INFORMATION',
        // NOTE: social icons injected here so they appear inside the panel under contact details
        body: `
            <h3>Get In Touch</h3>
            <p><strong>Email:</strong> <a href="mailto:techmaster050718@gmail.com">techmaster050718@gmail.com</a></p>
            <p><strong>Phone:</strong> +91 9580239104</p>
            
            <h3>Availability</h3>
            <p>Freelance, collabs, new projects — response slower during exams.</p>
            
            

            <!-- Social icons (small circular) -->
            <div class="contact-social" role="group" aria-label="Contact social links">
                <a class="social-btn github" href="https://github.com/techmaster050718" target="_blank" rel="noopener" aria-label="GitHub">
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                        <path fill="currentColor" d="M12 .5C5.6.5.5 5.6.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.5v-1.8c-3.2.7-3.9-1.4-3.9-1.4-.5-1.2-1.2-1.6-1.2-1.6-1-.7.1-.7.1-.7 1.1.1 1.6 1.2 1.6 1.2 1 .1 1.6.7 2 .9.1-.8.4-1.4.8-1.8-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3 0 0 1-.3 3.3 1.2.9-.2 1.8-.3 2.7-.3s1.8.1 2.7.3C16.7 4 17.7 4.3 17.7 4.3c.6 1.5.2 2.7.1 3 .8.8 1.2 1.9 1.2 3.2 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.6 18.4.5 12 .5z"/>
                    </svg>
                </a>

                <a class="social-btn linkedin" href="https://www.linkedin.com/in/abhay-ojha-331a47375" target="_blank" rel="noopener" aria-label="LinkedIn">
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                        <path fill="currentColor" d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.11 1 2.5 1 4.98 2.12 4.98 3.5zM0 8h5V24H0zM8 8h4.7v2.2h.1c.7-1.3 2.4-2.2 4-2.2 4.3 0 5.1 2.8 5.1 6.4V24h-5V15.6c0-2-0.1-4.6-3-4.6-3 0-3.5 2.3-3.5 4.4V24H8z"/>
                    </svg>
                </a>

                <a class="social-btn insta" href="https://www.instagram.com/abhay_ojha18?igsh=MTVmdmh0azNnMDhmeA==" target="_blank" rel="noopener" aria-label="Instagram">
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                        <path fill="currentColor" d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5.5A4.5 4.5 0 1 0 16.5 12 4.5 4.5 0 0 0 12 7.5zm6.5-.6a1 1 0 1 1-1 1 1 1 0 0 1 1-1zM12 9a3 3 0 1 1-3 3 3 3 0 0 1 3-3z"/>
                    </svg>
                </a>
            </div>

            <p style="margin-top:12px;"><em>Let’s build something awesome together.</em></p>
        `
    }
};

// ==================== MENU & NAVIGATION ====================
const menuItems = Array.from(document.querySelectorAll('.menu-item'));
const hoverBox = document.querySelector('.hover-box');
const panelContent = document.querySelector('.panel-content');
const panelHeader = document.getElementById('panelHeader');
const panelBody = document.getElementById('panelBody');

let currentIndex = -1;
let isPanelOpen = false;
let lastHoverTime = 0;

function hideHoverBox() {
    if (hoverBox) hoverBox.classList.remove('visible');
    menuItems.forEach(mi => mi.classList.remove('active'));
}

// Position hover box relative to container
function updateHoverBox(element) {
    if (!element || !hoverBox) return;
    const menuContainer = document.querySelector('.menu-items');
    const rect = element.getBoundingClientRect();
    const containerRect = menuContainer.getBoundingClientRect();
    const top = rect.top - containerRect.top;
    hoverBox.style.top = `${top}px`;
    hoverBox.style.left = `${rect.left - containerRect.left}px`;
    hoverBox.style.width = `${rect.width}px`;
    hoverBox.style.height = `${rect.height}px`;
    hoverBox.classList.add('visible');
}

// Open panel
function openPanel(page) {
    const content = contentData[page];
    if (!content) return;
    if (panelHeader) panelHeader.textContent = content.header;
    if (panelBody) panelBody.innerHTML = content.body;
    if (panelContent) {
        panelContent.classList.add('active');
        panelContent.setAttribute('aria-hidden', 'false');
    }
    isPanelOpen = true;
    playSound('select');
    // focus first interactive element for accessibility
    setTimeout(() => {
        // focus first link or social button inside panel
        panelContent?.querySelector('a, button, input, [tabindex]')?.focus();
        // wire up social buttons (they exist in contact body)
        wireSocialButtons();
    }, 80);
}

// Close panel
function closePanel() {
    panelContent?.classList.remove('active');
    panelContent?.setAttribute('aria-hidden', 'true');
    isPanelOpen = false;
    playSound('hover');
    if (currentIndex >= 0) menuItems[currentIndex]?.focus();
}

// Mouse / pointer / focus events for menu items
menuItems.forEach((item, index) => {
    item.addEventListener('pointerenter', () => {
        currentIndex = index;
        updateHoverBox(item);
        menuItems.forEach(mi => mi.classList.remove('active'));
        item.classList.add('active');
        const now = performance.now();
        if (now - lastHoverTime > 120) {
            playSound('hover');
            lastHoverTime = now;
        }
    });

    item.addEventListener('click', () => {
        openPanel(item.getAttribute('data-page'));
    });

    item.addEventListener('focus', () => {
        currentIndex = index;
        updateHoverBox(item);
        menuItems.forEach(mi => mi.classList.remove('active'));
        item.classList.add('active');
    });

    item.addEventListener('blur', () => {
        setTimeout(() => {
            if (!document.activeElement.classList.contains('menu-item')) {
                hideHoverBox();
                currentIndex = -1;
            }
        }, 120);
    });
});

document.querySelector('.menu-items')?.addEventListener('pointerleave', () => {
    if (!menuItems.some(mi => mi === document.activeElement)) {
        hideHoverBox();
        currentIndex = -1;
    }
});

// ==================== KEYBOARD NAVIGATION ====================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isPanelOpen) {
        closePanel();
        return;
    }
    if (isPanelOpen) return;
    if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) return;
    e.preventDefault();
    if (e.key === 'ArrowDown') {
        currentIndex = (currentIndex + 1) % menuItems.length;
        menuItems[currentIndex].focus();
        updateHoverBox(menuItems[currentIndex]);
        playSound('hover');
    }
    if (e.key === 'ArrowUp') {
        currentIndex = currentIndex <= 0 ? menuItems.length - 1 : currentIndex - 1;
        menuItems[currentIndex].focus();
        updateHoverBox(menuItems[currentIndex]);
        playSound('hover');
    }
    if (e.key === 'Enter' && currentIndex >= 0) {
        openPanel(menuItems[currentIndex].getAttribute('data-page'));
    }
});

// ==================== SPEED CONTROLS ====================
const speedButtons = document.querySelectorAll('.speed-toggle button');
const speedMap = { fast: '--speed-fast', normal: '--speed-normal', cinematic: '--speed-cinematic' };

speedButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const speed = btn.getAttribute('data-speed') || 'normal';
        document.documentElement.style.setProperty('--current-speed', `var(${speedMap[speed]})`);
        speedButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});
if (!document.querySelector('.speed-toggle button.active')) {
    const normalBtn = document.querySelector('.speed-toggle button[data-speed="normal"]');
    if (normalBtn) normalBtn.classList.add('active');
}

// ==================== VIDEO FALLBACK ====================
const video = document.getElementById('bgVideo');
if (video) {
    video.addEventListener('error', () => console.log('Video failed to load, using gradient fallback'));
    video.play().catch(() => {/* will play after interaction */});
}

// ==================== ENABLE BUTTON WIREFRAME ====================
const enableBtn = document.getElementById('enableSoundBtn');
if (enableBtn) {
    enableBtn.addEventListener('click', async () => {
        await enableAudio();
    }, { once: true });
}

// ==================== PANEL ESC KEY SUPPORT ====================
panelContent?.addEventListener('keydown', (evt) => {
    if (evt.key === 'Escape') closePanel();
});

// ==================== AUTO DEBUG INFO (one-time) ====================
setTimeout(() => {
    console.log('Audio state:', audioContext.state, 'audioEnabled:', audioEnabled, 'buffers:', Object.keys(audioBuffers));
    if (audioContext.state !== 'running') {
        console.log('If no sound: click "Enable Sound" button or interact with the page.');
    }
}, 800);

// ==================== enableAudio (interaction to satisfy autoplay policies) ====================
async function enableAudio() {
    if (audioEnabled) return;
    try {
        await audioContext.resume();
        audioEnabled = true;
        // ensureSounds is async — call but do not await UI flow
        ensureSounds().catch(() => {});
        // optional test sound
        playSound('select');
        const btn = document.getElementById('enableSoundBtn');
        if (btn) {
            btn.textContent = '🔊 Sound Enabled';
            btn.disabled = true;
            btn.style.opacity = 0.8;
        }
        console.log('Audio enabled');
    } catch (err) {
        console.warn('Audio resume failed', err);
    }
}

// Unlock audio on first user action (pointer, key, touch) to satisfy autoplay rules
document.addEventListener('click', enableAudio, { once: true });
document.addEventListener('keydown', enableAudio, { once: true });
document.addEventListener('touchstart', enableAudio, { once: true });

// ==================== Small HTMLAudio fallback play (kept above) ====================
// playFallback() defined earlier

// ==================== UTILS: remove old controls & wire social buttons ====================
function removeOldControls() {
    // remove the old big neon social links and controls bar if present
    document.querySelectorAll('.social-links, .neon-btn, .controls, .bottom-controls, .hint-bar, .nav-hints').forEach(el => {
        try { el.remove(); } catch (e) { el.style.display = 'none'; }
    });
}

// Wire up social buttons for hover sounds and keyboard activation
function wireSocialButtons() {
    const socialButtons = Array.from(document.querySelectorAll('.contact-social .social-btn, #floatingSocial .social-btn'));
    if (!socialButtons.length) return;
    // ensure sounds ready (non-blocking)
    ensureSounds().catch(() => {});
    socialButtons.forEach(btn => {
        // pointer hover
        if (!btn._wiredHover) {
            btn.addEventListener('pointerenter', () => {
                try { playSound('hover'); } catch (e) {}
            });
            // focus for keyboard
            btn.addEventListener('focus', () => {
                try { playSound('hover'); } catch (e) {}
            });
            // keyboard activation (Enter/Space)
            btn.addEventListener('keydown', (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    btn.click();
                }
            });
            btn._wiredHover = true; // mark wired to avoid duplicate listeners
        }
    });
}

// Run cleanup and initial wiring after DOM ready
document.addEventListener('DOMContentLoaded', () => {
    removeOldControls();
    // prepare sounds (non-blocking)
    ensureSounds().catch(()=>{});
    // If panel already shows contact (unlikely), wire social buttons
    wireSocialButtons();
    // Optional: ensure hover sound plays for menu items when focused (keyboard)
    menuItems.forEach(mi => {
        mi.addEventListener('focus', () => {
            try { playSound('hover'); } catch (e) {}
        });
    });
});

// ======= DEBUG + GUARANTEE CONTACT SOCIAL VISIBLE =======
document.addEventListener('DOMContentLoaded', () => {
  // helper to create same social HTML if missing
  function createContactSocialHtml() {
    const wrap = document.createElement('div');
    wrap.className = 'contact-social';
    wrap.setAttribute('role','group');
    wrap.setAttribute('aria-label','Contact social links');
    wrap.innerHTML = `
      <a class="social-btn github" href="https://github.com/techmaster050718" target="_blank" rel="noopener" aria-label="GitHub">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 .5C5.6.5.5 5.6.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.5v-1.8c-3.2.7-3.9-1.4-3.9-1.4-.5-1.2-1.2-1.6-1.2-1.6-1-.7.1-.7.1-.7 1.1.1 1.6 1.2 1.6 1.2 1 .1 1.6.7 2 .9.1-.8.4-1.4.8-1.8-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3 0 0 1-.3 3.3 1.2.9-.2 1.8-.3 2.7-.3s1.8.1 2.7.3C16.7 4 17.7 4.3 17.7 4.3c.6 1.5.2 2.7.1 3 .8.8 1.2 1.9 1.2 3.2 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.6 18.4.5 12 .5z"/></svg>
      </a>
      <a class="social-btn linkedin" href="https://www.linkedin.com/in/abhay-ojha-331a47375" target="_blank" rel="noopener" aria-label="LinkedIn">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.11 1 2.5 1 4.98 2.12 4.98 3.5zM0 8h5V24H0zM8 8h4.7v2.2h.1c.7-1.3 2.4-2.2 4-2.2 4.3 0 5.1 2.8 5.1 6.4V24h-5V15.6c0-2-0.1-4.6-3-4.6-3 0-3.5 2.3-3.5 4.4V24H8z"/></svg>
      </a>
      <a class="social-btn insta" href="https://www.instagram.com/abhay_ojha18?igsh=MTVmdmh0azNnMDhmeA==" target="_blank" rel="noopener" aria-label="Instagram">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5.5A4.5 4.5 0 1 0 16.5 12 4.5 4.5 0 0 0 12 7.5zm6.5-.6a1 1 0 1 1-1 1 1 1 0 0 1 1-1zM12 9a3 3 0 1 1-3 3 3 3 0 0 1 3-3z"/></svg>
      </a>
    `;
    return wrap;
  }

  // debug: print whether contact content exists
  console.log('[debug] panelBody exists?', !!panelBody, 'panelHeader text:', panelHeader?.textContent);

  // If contact panel content rendered but button missing, insert fallback
  function ensureContactIconsVisible() {
    // 1) If panelBody has a .contact-social already but display:none, force show
    const existing = panelBody?.querySelector('.contact-social');
    if (existing) {
      existing.style.display = 'flex';
      console.log('[debug] contact-social exists, forced display flex');
      // wire events
      wireSocialButtons();
      return;
    }

    // 2) If contact panel is active and no .contact-social, append fallback
    const headerText = panelHeader?.textContent?.toLowerCase() || '';
    if (headerText.includes('contact')) {
      // append fallback if not present
      if (panelBody && !panelBody.querySelector('.contact-social')) {
        panelBody.insertAdjacentElement('beforeend', createContactSocialHtml());
        console.log('[debug] appended fallback contact-social into panelBody');
        // wire events and sounds for new buttons
        wireSocialButtons();
      }
    }
  }

  // Run at start and also after menu opens (in case user clicks after page load)
  ensureContactIconsVisible();

  // Re-run when user clicks Contact menu — also handle other clicks
  document.querySelectorAll('.menu-item').forEach(mi => {
    mi.addEventListener('click', () => {
      setTimeout(() => {
        ensureContactIconsVisible();
      }, 120);
    });
  });

  // Also show icons if user opens via keyboard (Enter)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement?.classList?.contains('menu-item')) {
      setTimeout(() => {
        ensureContactIconsVisible();
      }, 120);
    }
  });

  // If still not visible, print helpful console state after 1s
  setTimeout(() => {
    const found = panelBody?.querySelector('.contact-social');
    console.log('[debug] final check contact-social found?', !!found, 'panelBody innerHTML length:', panelBody?.innerHTML?.length);
  }, 1000);
});

// static/js/ui.js - FIXED to work with admin-configured difficulty settings

class UI {
    constructor(api) {
        this.api = api;
        this.selectedLevel = 1;
        this.currentLang = localStorage.getItem('lang') || 'en';
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.profileHistory = [];
    }

    async init() {
        this.setTheme(this.currentTheme);
        window.applyI18N(this.currentLang);
        this.setupHeaderControls();
        this.startBackgroundRotation();

        // Start relaxing menu music
        setTimeout(() => {
            if (window.soundManager) {
                window.soundManager.playMusic('menu_chill');
            }
        }, 500);
    }

    startBackgroundRotation() {
        const images = ['bg1.jpg', 'bg2.jpg', 'bg3.jpg', 'bg4.jpg'].map(f => `/static/images/${f}`);
        let idx = 0;
        const container = document.getElementById('bg-container');
        if (!container) return;

        container.innerHTML = '';
        images.forEach((src, i) => {
            const layer = document.createElement('div');
            layer.className = `bg-layer ${i === 0 ? 'active' : ''}`;
            layer.style.backgroundImage = `url('${src}')`;
            container.appendChild(layer);
        });

        setInterval(() => {
            document.querySelectorAll('.bg-layer').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.bg-layer')[idx].classList.add('active');
            idx = (idx + 1) % images.length;
        }, 10000);
    }

    setupHeaderControls() {
        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) {
            themeBtn.onclick = () => this.toggleTheme();
            this.updateThemeIcon();
        }

        const langBtn = document.getElementById('lang-toggle');
        if (langBtn) {
            langBtn.onclick = () => this.toggleLanguage();
            langBtn.innerHTML = `<span class="btn-lang">${this.currentLang.toUpperCase()}</span>`;
        }
    }

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        const screen = document.getElementById(id);
        if (screen) screen.classList.remove('hidden');

        // NEW: Update level buttons when showing level screen
        if (id === 'level-screen') {
            this.updateLevelButtons();
        }

        // Music control
        if (window.soundManager) {
            if (id === 'game-screen') {
                soundManager.stopMusic();
                soundManager.playAmbient('game_ambient');
            } else if (id.includes('menu') || id.includes('profile') || id.includes('leaderboard')) {
                soundManager.stopAmbient();
                soundManager.playMusic(Math.random() > 0.5 ? 'menu_chill' : 'menu_calm');
            } else {
                soundManager.stopMusic();
                soundManager.stopAmbient();
            }
        }
    }

    setTheme(theme) {
        this.currentTheme = theme;
        document.body.dataset.theme = theme;
        localStorage.setItem('theme', theme);
        this.updateThemeIcon();
    }

    updateThemeIcon() {
        const btn = document.getElementById('theme-toggle');
        if (btn) {
            btn.innerHTML = this.currentTheme === 'dark'
                ? '<i class="fas fa-sun"></i>'
                : '<i class="fas fa-moon"></i>';
        }
    }

    toggleTheme() {
        const next = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(next);
        if (this.api.isLoggedIn()) {
            this.api.updateSettings({ theme: next });
        }
    }

    toggleLanguage() {
        const langs = ['en', 'uz', 'ru'];
        const idx = (langs.indexOf(this.currentLang) + 1) % langs.length;
        this.currentLang = langs[idx];
        localStorage.setItem('lang', this.currentLang);

        window.applyI18N(this.currentLang);
        document.getElementById('lang-toggle').innerHTML = `<span class="btn-lang">${this.currentLang.toUpperCase()}</span>`;

        if (this.api.isLoggedIn()) {
            this.api.updateSettings({ language: this.currentLang });
        }
    }

    // NEW: Update level buttons based on admin-configured settings
    updateLevelButtons() {
        // Get difficulty settings from game
        const settings = window.game?.difficultySettings || {};

        console.log('Updating level buttons with settings:', settings);

        // Get the existing buttons in the level-grid
        const buttons = document.querySelectorAll('.level-grid .btn-level-large');

        buttons.forEach((btn, index) => {
            const level = index + 1; // Easy=1, Medium=2, Hard=3
            const setting = settings[level];

            if (setting) {
                // Level exists in admin panel - enable button
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
                btn.style.filter = 'none';

                // Update button text with admin settings
                const titleSpan = btn.querySelector('span');
                const descSmall = btn.querySelector('small');

                if (titleSpan && setting.names) {
                    // Use translated name from admin
                    const name = setting.names[this.currentLang] || setting.names.en || titleSpan.textContent;
                    titleSpan.textContent = name;
                }

                if (descSmall) {
                    // Show actual settings from admin
                    const points = setting.base_points;
                    const feature = setting.hints_enabled ? 'Hints' :
                                  setting.shuffle_enabled ? `Shuffles (${setting.shuffle_frequency}s)` :
                                  'No Hints';
                    descSmall.textContent = `${points} Points + ${feature}`;
                }

                console.log(`Level ${level} enabled:`, setting);
            } else {
                // Level doesn't exist in admin panel - disable button
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
                btn.style.filter = 'grayscale(100%)';

                const descSmall = btn.querySelector('small');
                if (descSmall) {
                    descSmall.textContent = 'Not available yet';
                    descSmall.style.color = '#999';
                }

                console.log(`Level ${level} disabled (not in admin)`);
            }
        });
    }

    async showLeaderboard() {
        this.showScreen('leaderboard-screen');
        const list = document.getElementById('leaderboard-list');
        list.innerHTML = '<li class="loading">Loading...</li>';

        try {
            const entries = await this.api.getLeaderboard();
            list.innerHTML = entries.length === 0
                ? '<li class="empty">No scores yet</li>'
                : entries.map((e, i) => `
                    <li style="animation-delay: ${i * 0.05}s; opacity: 0;">
                        <span class="rank">${i + 1}</span>
                        <span class="name">${e.name}</span>
                        <span class="score">${e.score_balls} pts</span>
                    </li>
                `).join('');
        } catch (e) {
            list.innerHTML = '<li class="error">Failed to load</li>';
        }
    }

    async showProfile() {
        this.showScreen('profile-screen');
        const content = document.getElementById('profile-content');
        const auth = document.getElementById('profile-auth');
        content.innerHTML = '<div class="loading">Loading...</div>';
        auth.innerHTML = '';

        try {
            const data = await this.api.getProfile();
            if (!data.player) {
                // Guest user - show login prompt
                content.innerHTML = `
                    <div class="profile-guest">
                        <h3>Please login to view profile</h3>
                        <button class="btn-primary" onclick="checkExistingLogin()">Login</button>
                    </div>
                `;
                return;
            }

            // Logged in user - show logout button with translation
            const dict = window.I18N[this.currentLang];
            auth.innerHTML = `<button class="btn-logout" onclick="logout()">${dict.logout}</button>`;
            this.profileHistory = data.history || [];

            this.renderProfile(data.player);
        } catch (e) {
            content.innerHTML = '<div class="error">Failed to load profile</div>';
        }
    }

    renderProfile(player) {
        const content = document.getElementById('profile-content');
        const dict = window.I18N[this.currentLang];

        // Profile header with player info
        content.innerHTML = `
            <div class="profile-header">
                <h3>${player.name}</h3>
                <p>${player.phone_number}</p>
            </div>

            <!-- Only History section, no tabs needed -->
            <div class="profile-section">
                <h4>${dict.history}</h4>
                ${this.renderHistory()}
            </div>
        `;
    }

    renderHistory() {
        const dict = window.I18N[this.currentLang];

        if (this.profileHistory.length === 0) {
            return `<ul class="history-list"><li class="empty">${dict.no_games || 'No games played yet'}</li></ul>`;
        }

        return `
            <ul class="history-list">
                ${this.profileHistory.map(g => `
                    <li>
                        <span class="date">${new Date(g.date).toLocaleDateString()}</span>
                        <span class="score">${g.score} pts</span>
                    </li>
                `).join('')}
            </ul>
        `;
    }
}


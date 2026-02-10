// static/js/ui.js - FINAL VERSION

class UI {
    constructor(api) {
        this.api = api;
        this.selectedLevel = 1;
        this.currentLang = localStorage.getItem('lang') || 'en';
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.profileHistory = [];
        this.profilePromos = [];
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
                content.innerHTML = `
                    <div class="profile-guest">
                        <h3>Please login to view profile</h3>
                        <button class="btn-primary" onclick="checkExistingLogin()">Login</button>
                    </div>
                `;
                return;
            }

            auth.innerHTML = `<button class="btn-logout" onclick="logout()">Logout</button>`;
            this.profileHistory = data.history || [];
            this.profilePromos = data.promos || [];

            this.renderProfile(data.player);
        } catch (e) {
            content.innerHTML = '<div class="error">Failed to load profile</div>';
        }
    }

    renderProfile(player) {
        const content = document.getElementById('profile-content');
        const dict = window.I18N[this.currentLang];

        content.innerHTML = `
            <div class="profile-header">
                <h3>${player.name}</h3>
                <p>${player.phone_number}</p>
            </div>
            <div class="profile-actions">
                <button class="btn-tab active" onclick="ui.switchProfileTab('history')">History</button>
                <button class="btn-tab" onclick="ui.switchProfileTab('promos')">Promos</button>
            </div>
            <div id="profile-list-container"></div>
        `;

        this.switchProfileTab('history');
    }

    switchProfileTab(tab) {
        const container = document.getElementById('profile-list-container');
        const dict = window.I18N[this.currentLang];

        document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
        document.querySelector(`.btn-tab:nth-child(${tab === 'history' ? 1 : 2})`).classList.add('active');

        if (tab === 'history') {
            const html = this.profileHistory.length === 0
                ? `<ul class="history-list"><li class="empty">${dict.no_games || 'No games played'}</li></ul>`
                : `<ul class="history-list">${this.profileHistory.map(g => `
                    <li>
                        <span class="date">${new Date(g.date).toLocaleDateString()}</span>
                        <span class="score">${g.score} pts</span>
                    </li>
                `).join('')}</ul>`;
            container.innerHTML = html;
        } else {
            const html = this.profilePromos.length === 0
                ? `<ul class="promo-list"><li class="empty">No promos yet</li></ul>`
                : `<ul class="promo-list">${this.profilePromos.map(p => `
                    <li class="promo-item">
                        <div><code class="code-text">${p.code}</code><br><small>${new Date(p.claimed_at).toLocaleDateString()}</small></div>
                        <button class="btn-copy-small" onclick="copyPromoCode('${p.code}')">Copy</button>
                    </li>
                `).join('')}</ul>`;
            container.innerHTML = html;
        }
    }
}
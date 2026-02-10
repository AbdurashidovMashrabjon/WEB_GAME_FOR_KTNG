// static/js/sounds.js
// Ultimate Sound Manager with Background Music & Ambient Effects

class SoundManager {
    constructor() {
        this.enabled = true;
        this.masterVolume = 1.0;        // 1.0 = on, 0.0 = muted
        this.baseVolume = 0.6;          // General SFX volume
        this.musicVolume = 0.35;        // Lower for background music
        this.ambientVolume = 0.2;

        this.sounds = {};
        this.music = null;
        this.ambient = null;
        this.currentMusicKey = null;
        this.currentAmbientKey = null;

        this.isUnlocked = false;
        this.isInitialized = false;

        this.soundPath = '/static/sounds/';
        this.musicPath = '/static/music/';  // Create this folder and add MP3s

        console.log('SoundManager: Ready');
    }

    init() {
        if (this.isInitialized) return;

        this.preloadSounds();
        this.preloadMusic();
        this.loadPreferences();
        this.applyMasterVolume(); // Sync all sounds with current mute state
        this.setupMobileUnlock();
        this.setupSoundToggleButton();

        this.isInitialized = true;
        console.log('SoundManager: Fully initialized');
    }

    preloadSounds() {
        const soundFiles = {
            'click': 'click.wav',
            'menu_hover': 'menu_hover.wav',
            'card_select': 'card_select.wav',
            'card_flip': 'card_flip.wav',
            'card_shuffle': 'card_shuffle.wav',
            'match_success': 'match_success.wav',
            'match_fail': 'match_fail.wav',
            'combo_low': 'combo_low.wav',
            'combo_medium': 'combo_medium.wav',
            'combo_high': 'combo_high.wav',
            'game_start': 'game_start.wav',
            'game_over': 'game_over.wav',
            'countdown': 'countdown.wav',
            'big_win': 'big_win.wav',
            'promo_win': 'big_win.wav'
        };

        for (const [name, file] of Object.entries(soundFiles)) {
            const audio = new Audio(this.soundPath + file);
            audio.preload = 'auto';
            audio.volume = this.baseVolume * this.masterVolume;
            this.sounds[name] = audio;
        }

        console.log(`Loaded ${Object.keys(this.sounds).length} SFX`);
    }

    preloadMusic() {
        // Add relaxing background tracks (MP3 recommended for broad support)
        // Put these files in /static/music/
        const musicFiles = {
            'menu_chill': 'chill_lofi.mp3',           // Main menu relaxing track
            'menu_calm': 'calm_ambient.mp3',           // Alternative calm menu music
            'game_ambient': 'soft_nature_rain.mp3'     // Subtle rain + birds during game
        };

        this.musicTracks = {};
        for (const [key, file] of Object.entries(musicFiles)) {
            const audio = new Audio(this.musicPath + file);
            audio.loop = true;
            audio.preload = 'metadata';
            audio.volume = 0; // Will be set when playing
            this.musicTracks[key] = audio;
        }

        console.log(`Preloaded ${Object.keys(this.musicTracks).length} music/ambient tracks`);
    }

    loadPreferences() {
        const savedEnabled = localStorage.getItem('soundEnabled');
        if (savedEnabled !== null) {
            this.enabled = savedEnabled === 'true';
            this.masterVolume = this.enabled ? 1.0 : 0.0;
        }

        const savedBase = localStorage.getItem('soundVolume');
        if (savedBase) this.baseVolume = parseFloat(savedBase);

        console.log(`Preferences loaded: Sound ${this.enabled ? 'ON' : 'OFF'}, Volume ${this.baseVolume}`);
    }

    applyMasterVolume() {
        const vol = this.masterVolume;

        // Apply to all preloaded SFX
        Object.values(this.sounds).forEach(s => {
            if (s) s.volume = this.baseVolume * vol;
        });

        // Apply to music & ambient if playing
        if (this.music) this.music.volume = this.musicVolume * vol;
        if (this.ambient) this.ambient.volume = this.ambientVolume * vol;
    }

    setupMobileUnlock() {
        const unlock = () => {
            if (this.isUnlocked) return;

            // Play a silent sound or short click to unlock audio context
            this.play('click', 0);

            // Also try to start music context
            Object.values(this.musicTracks).forEach(track => {
                track.play().catch(() => {});
                track.pause();
                track.currentTime = 0;
            });

            this.isUnlocked = true;
            console.log('Audio context unlocked on mobile');

            document.removeEventListener('touchstart', unlock);
            document.removeEventListener('touchend', unlock);
            document.removeEventListener('click', unlock);
            document.removeEventListener('keydown', unlock);
        };

        document.addEventListener('touchstart', unlock, { once: true, passive: true });
        document.addEventListener('touchend', unlock, { once: true, passive: true });
        document.addEventListener('click', unlock, { once: true, passive: true });
        document.addEventListener('keydown', unlock, { once: true });
    }

    setupSoundToggleButton() {
        const setup = () => {
            const btn = document.getElementById('sound-toggle');
            if (!btn) {
                console.warn('Sound toggle button not found!');
                return;
            }

            // Clean re-attach
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggle();
            });

            newBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggle();
            });

            this.updateToggleIcon();
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setup);
        } else {
            setup();
        }
    }

    play(soundName, volumeMultiplier = 1.0) {
        if (!this.enabled || !this.isUnlocked) return;

        const base = this.sounds[soundName];
        if (!base) {
            console.warn(`Sound not found: ${soundName}`);
            return;
        }

        try {
            const clone = base.cloneNode();
            clone.volume = this.baseVolume * this.masterVolume * volumeMultiplier;
            clone.play().catch(e => {
                if (e.name !== 'NotAllowedError') console.warn('Play failed:', e);
            });
        } catch (e) {
            console.warn('Error playing sound:', e);
        }
    }

    // Background Music Control
    async playMusic(key = 'menu_chill', fadeIn = true) {
        if (!this.enabled || !this.isUnlocked) return;

        // Stop current music
        this.stopMusic();

        const track = this.musicTracks[key];
        if (!track) {
            console.warn(`Music track not found: ${key}`);
            return;
        }

        track.volume = 0;
        track.currentTime = 0;

        if (fadeIn) {
            track.volume = 0;
            await track.play();
            this.fadeTo(track, this.musicVolume * this.masterVolume, 2000);
        } else {
            track.volume = this.musicVolume * this.masterVolume;
            track.play().catch(() => {});
        }

        this.music = track;
        this.currentMusicKey = key;
    }

    stopMusic(fadeOut = true) {
        if (!this.music) return;

        if (fadeOut) {
            this.fadeTo(this.music, 0, 1000).then(() => {
                this.music.pause();
                this.music.currentTime = 0;
                this.music = null;
            });
        } else {
            this.music.pause();
            this.music.currentTime = 0;
            this.music = null;
        }
    }

    // Ambient Nature Sound (e.g., soft rain during game)
    async playAmbient(key = 'game_ambient') {
        if (!this.enabled || !this.isUnlocked) return;

        this.stopAmbient();

        const track = this.musicTracks[key];
        if (!track) return;

        track.volume = 0;
        track.currentTime = 0;
        await track.play();
        this.fadeTo(track, this.ambientVolume * this.masterVolume, 3000);

        this.ambient = track;
        this.currentAmbientKey = key;
    }

    stopAmbient(fadeOut = true) {
        if (!this.ambient) return;

        if (fadeOut) {
            this.fadeTo(this.ambient, 0, 1500).then(() => {
                this.ambient.pause();
                this.ambient = null;
            });
        } else {
            this.ambient.pause();
            this.ambient = null;
        }
    }

    fadeTo(audio, targetVolume, duration) {
        return new Promise(resolve => {
            const startVolume = audio.volume;
            const startTime = performance.now();

            const step = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                audio.volume = startVolume + (targetVolume - startVolume) * progress;

                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    resolve();
                }
            };

            requestAnimationFrame(step);
        });
    }

    // Toggle sound ON/OFF
    toggle() {
        this.enabled = !this.enabled;
        this.masterVolume = this.enabled ? 1.0 : 0.0;

        localStorage.setItem('soundEnabled', this.enabled);

        this.applyMasterVolume();
        this.updateToggleIcon();

        if (this.enabled && this.isUnlocked) {
            setTimeout(() => this.play('click', 0.8), 100);
        }

        console.log(`Sound ${this.enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    updateToggleIcon() {
        const btn = document.getElementById('sound-toggle');
        if (!btn) return;

        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = this.enabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
        }
    }

    // Helper shortcuts
    playClick() { this.play('click', 0.8); }
    playHover() { this.play('menu_hover', 0.6); }
    playCombo(combo) {
        if (combo >= 10) this.play('combo_high', 1.2);
        else if (combo >= 6) this.play('combo_medium', 1.1);
        else if (combo >= 3) this.play('combo_low');
    }
}

// Global instance
window.soundManager = new SoundManager();

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.soundManager.init();
    });
} else {
    window.soundManager.init();
}

// Auto button sounds
setTimeout(() => {
    const buttons = document.querySelectorAll('button:not(#sound-toggle)');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => window.soundManager?.playClick(), { passive: true });
    });

    if (window.matchMedia('(hover: hover)').matches) {
        document.querySelectorAll('.btn-primary, .btn-icon, .btn-level-large').forEach(btn => {
            btn.addEventListener('mouseenter', () => window.soundManager?.playHover(), { passive: true });
        });
    }
}, 500);




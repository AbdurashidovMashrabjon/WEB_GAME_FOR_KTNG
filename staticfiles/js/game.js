// static/js/game.js - DYNAMIC DIFFICULTY VERSION (Admin-Controlled)

class Game {
    constructor(api, ui) {
        this.api = api;
        this.ui = ui;
        this.config = {};
        this.fruitCards = [];
        this.textCards = [];
        this.validPairs = [];
        this.difficultySettings = {}; // NEW: Store admin-configured settings

        this.sessionId = null;
        this.difficultyLevel = 1;

        // Dynamic values (loaded from admin)
        this.basePoints = 5;
        this.levelMultiplier = 2;
        this.comboBonus = 1.5;
        this.comboPenalty = 0.5;
        this.shuffleEnabled = false;
        this.shuffleFrequency = 0;
        this.hintsEnabled = true;
        this.timeSeconds = 180;

        this.score = 0;
        this.combo = 0;
        this.timer = 0;
        this.timerInterval = null;
        this.isPaused = false;

        this.allCards = [];
        this.selectedTextIndex = null;
        this.selectedFruitIndex = null;

        this.stats = { correct: 0, wrong: 0, bestCombo: 0 };
        this.CARDS_PER_GAME = 8; // 8 pairs = 16 cards total

        this.isProcessing = false;
        this.revealedTextCards = new Set();
        this.shuffleInterval = null; // NEW: For auto-shuffle
    }

    async load() {
        try {
            const data = await this.api.getConfig();
            this.config = data.config || {};
            this.fruitCards = data.fruit_cards || [];
            this.textCards = data.text_cards || [];

            // NEW: Load difficulty settings from admin
            this.difficultySettings = {};
            (data.difficulty_settings || []).forEach(setting => {
                this.difficultySettings[setting.level] = setting;
            });

            console.log('Loaded difficulty settings:', this.difficultySettings);

            this.buildValidPairs();
        } catch (e) {
            console.warn("API failed, using dev mode", e);
            this.loadDevModeData();
        }
    }

    buildValidPairs() {
        this.validPairs = this.fruitCards
            .map(fruit => {
                const text = this.textCards.find(t =>
                    t.correct_fruit_code === fruit.code &&
                    t.is_active !== false
                );
                return text ? { fruit, text } : null;
            })
            .filter(Boolean);
    }

    loadDevModeData() {
        this.validPairs = [];
        const names = [
            'Apple', 'Banana', 'Orange', 'Mango',
            'Peach', 'Lemon', 'Strawberry', 'Kiwi',
            'Grape', 'Watermelon', 'Pineapple', 'Cherry'
        ];

        names.forEach((name, i) => {
            const code = `f${i}`;
            const fruit = {
                id: i,
                code,
                title: name,
                image: null
            };
            const text = {
                id: i,
                title: `This is ${name}`,
                correct_fruit_code: code,
                image: null
            };
            this.validPairs.push({ fruit, text });
        });

        // Default settings for dev mode
        this.difficultySettings = {
            1: { level: 1, time_seconds: 180, base_points: 5, level_multiplier: 2, combo_bonus: 1.5, combo_penalty: 0.5, shuffle_enabled: false, hints_enabled: true },
            2: { level: 2, time_seconds: 150, base_points: 15, level_multiplier: 4, combo_bonus: 1.5, combo_penalty: 0.5, shuffle_enabled: true, shuffle_frequency: 15, hints_enabled: false },
            3: { level: 3, time_seconds: 120, base_points: 20, level_multiplier: 6, combo_bonus: 1.5, combo_penalty: 0.5, shuffle_enabled: true, shuffle_frequency: 8, hints_enabled: false }
        };
    }

    async start() {
        this.difficultyLevel = this.ui.selectedLevel || 1;

        // NEW: Load settings for selected difficulty from admin
        const settings = this.difficultySettings[this.difficultyLevel];
        if (settings) {
            this.timeSeconds = settings.time_seconds;
            this.basePoints = settings.base_points;
            this.levelMultiplier = settings.level_multiplier;
            this.comboBonus = settings.combo_bonus;
            this.comboPenalty = settings.combo_penalty;
            this.shuffleEnabled = settings.shuffle_enabled;
            this.shuffleFrequency = settings.shuffle_frequency;
            this.hintsEnabled = settings.hints_enabled;

            console.log(`Starting ${this.difficultyLevel} with settings:`, settings);
        } else {
            console.warn('No settings found for difficulty', this.difficultyLevel);
        }

        try {
            const data = await this.api.startSession('ranked');
            this.sessionId = data.session_id;
        } catch (e) {
            console.warn("Offline mode", e);
        }

        this.reset();
        this.ui.showScreen('game-screen');

        if (window.soundManager) {
            soundManager.stopMusic();
            soundManager.playAmbient('game_ambient');
            soundManager.play('game_start');
        }

        this.startTimer();

        // NEW: Start auto-shuffle if enabled
        if (this.shuffleEnabled && this.shuffleFrequency > 0) {
            this.startAutoShuffle();
        }
    }

    reset() {
        this.score = 0;
        this.combo = 0;
        this.timer = this.timeSeconds; // Use dynamic time from admin
        this.isPaused = false;
        this.isProcessing = false;
        this.selectedTextIndex = null;
        this.selectedFruitIndex = null;
        this.revealedTextCards = new Set();
        this.stats = { correct: 0, wrong: 0, bestCombo: 0 };

        // Clear any existing shuffle interval
        if (this.shuffleInterval) {
            clearInterval(this.shuffleInterval);
            this.shuffleInterval = null;
        }

        this.updateHUD();
        this.generateBoard();
        this.resetPauseButton();
    }

    // NEW: Auto-shuffle functionality
    startAutoShuffle() {
        if (this.shuffleInterval) {
            clearInterval(this.shuffleInterval);
        }

        this.shuffleInterval = setInterval(() => {
            if (!this.isPaused && !this.isProcessing) {
                this.shuffleBoard();
            }
        }, this.shuffleFrequency * 1000);
    }

    generateBoard() {
        const grid = document.getElementById('game-grid');
        if (!grid) return;

        grid.innerHTML = '';
        this.allCards = [];

        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
            padding: 10px;
            max-width: 420px;
            width: 100%;
            margin: 0 auto;
            box-sizing: border-box;
            place-items: center;
        `;

        if (this.validPairs.length < this.CARDS_PER_GAME) {
            grid.innerHTML = `
                <div style="color:#fff;padding:40px;text-align:center;grid-column:1/-1;">
                    <p style="font-size:20px;">Not enough cards!</p>
                    <p>Need at least ${this.CARDS_PER_GAME} pairs.</p>
                </div>
            `;
            return;
        }

        const shuffled = [...this.validPairs];
        this.shuffleArray(shuffled);
        const pairs = shuffled.slice(0, this.CARDS_PER_GAME);

        const cards = [];
        pairs.forEach(pair => {
            cards.push({ data: pair.text, type: 'text', pairCode: pair.fruit.code });
            cards.push({ data: pair.fruit, type: 'fruit', pairCode: pair.fruit.code });
        });

        this.shuffleArray(cards);

        cards.forEach((card, index) => {
            const el = this.createCardElement(card, index);
            grid.appendChild(el);
            this.allCards.push({
                el,
                card,
                active: true
            });
        });

        // Show hint if enabled by admin
        if (this.hintsEnabled) {
            setTimeout(() => this.showHintPair(), 500);
        }
    }

    showHintPair() {
        for (let i = 0; i < this.allCards.length; i++) {
            if (this.allCards[i].card.type === 'text' && this.allCards[i].active) {
                const textSlot = this.allCards[i];
                const pairCode = textSlot.card.pairCode;

                for (let j = 0; j < this.allCards.length; j++) {
                    if (this.allCards[j].card.type === 'fruit' &&
                        this.allCards[j].card.pairCode === pairCode &&
                        this.allCards[j].active) {

                        textSlot.el.classList.add('hint-glow');
                        this.allCards[j].el.classList.add('hint-glow');

                        setTimeout(() => {
                            textSlot.el.classList.remove('hint-glow');
                            this.allCards[j].el.classList.remove('hint-glow');
                        }, 2000);

                        return;
                    }
                }
            }
        }
    }

    createCardElement(cardData, index) {
        const el = document.createElement('div');
        el.className = `card ${cardData.type}-card`;
        el.dataset.index = index;
        el.dataset.pairCode = cardData.pairCode;

        el.style.cssText = `
            width: 85px;
            height: 110px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            font-size: 11px;
            font-weight: 600;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            position: relative;
            overflow: hidden;
            padding: 4px;
            box-sizing: border-box;
            flex-shrink: 0;
        `;

        if (cardData.type === 'text') {
            el.classList.add('hidden-card');
            el.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            el.innerHTML = `
                <div class="question-mark" style="font-size:28px;color:white;">
                    <i class="fas fa-question"></i>
                </div>
            `;
            el.dataset.title = cardData.data.title || '';
            if (cardData.data.image) {
                el.dataset.image = cardData.data.image;
            }
        } else {
            el.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';

            if (cardData.data.image) {
                const img = document.createElement('img');
                img.src = cardData.data.image;
                img.alt = cardData.data.title || 'Fruit';
                img.style.cssText = `
                    max-width: 95%;
                    max-height: 95%;
                    object-fit: contain;
                    border-radius: 4px;
                `;
                el.appendChild(img);
            } else {
                el.innerHTML = `<span style="color:white;padding:4px;text-align:center;font-size:10px;line-height:1.2;word-break:break-word;">${cardData.data.title || 'Fruit'}</span>`;
            }
        }

        el.onclick = () => this.onCardClick(index);

        el.onmouseenter = () => {
            if (this.allCards[index]?.active && !this.isPaused && !this.isProcessing) {
                el.style.transform = 'scale(1.05)';
                el.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
            }
        };
        el.onmouseleave = () => {
            if (!el.classList.contains('selected')) {
                el.style.transform = 'scale(1)';
                el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            }
        };

        return el;
    }

    onCardClick(index) {
        if (this.isPaused || this.isProcessing) return;

        const slot = this.allCards[index];
        if (!slot || !slot.active) return;

        if (slot.card.type === 'text') {
            this.handleTextCardClick(index, slot);
        } else if (this.selectedTextIndex !== null) {
            this.handleFruitCardClick(index, slot);
        }
    }

    handleTextCardClick(index, slot) {
        if (window.soundManager) soundManager.play('card_select');

        if (this.selectedTextIndex === index) {
            slot.el.classList.remove('selected');
            slot.el.style.transform = 'scale(1)';
            this.selectedTextIndex = null;
            return;
        }

        if (this.selectedTextIndex !== null && !this.revealedTextCards.has(this.selectedTextIndex)) {
            const prevSlot = this.allCards[this.selectedTextIndex];
            if (prevSlot) {
                prevSlot.el.classList.remove('selected', 'revealed');
                prevSlot.el.classList.add('hidden-card');
                prevSlot.el.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                prevSlot.el.innerHTML = `
                    <div class="question-mark" style="font-size:28px;color:white;">
                        <i class="fas fa-question"></i>
                    </div>
                `;
                prevSlot.el.style.transform = 'scale(1)';
            }
        }

        this.selectedTextIndex = index;
        slot.el.classList.add('selected');
        slot.el.style.transform = 'scale(1.05)';

        setTimeout(() => {
            if (this.selectedTextIndex === index && slot.active) {
                slot.el.classList.remove('hidden-card');
                slot.el.classList.add('revealed');
                slot.el.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';

                if (slot.el.dataset.image) {
                    const img = document.createElement('img');
                    img.src = slot.el.dataset.image;
                    img.alt = 'Card';
                    img.style.cssText = `
                        max-width: 95%;
                        max-height: 95%;
                        object-fit: contain;
                        border-radius: 4px;
                    `;
                    slot.el.innerHTML = '';
                    slot.el.appendChild(img);
                } else {
                    slot.el.innerHTML = `<span style="color:white;padding:4px;text-align:center;font-size:9px;line-height:1.2;word-break:break-word;">${slot.el.dataset.title || 'Text'}</span>`;
                }

                if (window.soundManager) soundManager.play('card_flip');
            }
        }, 200);
    }

    handleFruitCardClick(index, slot) {
        if (window.soundManager) soundManager.play('card_select');

        this.selectedFruitIndex = index;
        slot.el.classList.add('selected');
        slot.el.style.transform = 'scale(1.05)';

        setTimeout(() => this.checkMatch(), 300);
    }

    checkMatch() {
        this.isProcessing = true;

        const textSlot = this.allCards[this.selectedTextIndex];
        const fruitSlot = this.allCards[this.selectedFruitIndex];

        if (!textSlot || !fruitSlot) {
            this.isProcessing = false;
            return;
        }

        const isMatch = textSlot.card.pairCode === fruitSlot.card.pairCode;

        if (isMatch) {
            this.handleSuccess();
        } else {
            this.handleFailure();
        }
    }

    handleSuccess() {
        // NEW: Use admin-configured scoring
        const points = this.basePoints + this.levelMultiplier + Math.floor(this.combo * this.comboBonus);

        this.score += points;
        this.combo++;
        this.stats.correct++;
        this.stats.bestCombo = Math.max(this.combo, this.stats.bestCombo);

        const textEl = this.allCards[this.selectedTextIndex].el;
        const fruitEl = this.allCards[this.selectedFruitIndex].el;

        this.allCards[this.selectedTextIndex].active = false;
        this.allCards[this.selectedFruitIndex].active = false;

        this.revealedTextCards.add(this.selectedTextIndex);

        textEl.classList.remove('selected', 'revealed');
        textEl.classList.add('matched');
        fruitEl.classList.remove('selected');
        fruitEl.classList.add('matched');

        this.showPointsEarned(points, textEl);

        if (window.soundManager) {
            soundManager.play('match_success');
            soundManager.playCombo(this.combo);
        }

        this.updateHUD();

        setTimeout(() => {
            this.refillMatchedCards();
            this.isProcessing = false;
        }, 800);
    }

    showPointsEarned(points, element) {
        const pointsEl = document.createElement('div');
        pointsEl.textContent = `+${points}`;
        pointsEl.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 22px;
            font-weight: bold;
            color: #ffeb3b;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            animation: floatUp 1s ease-out forwards;
            pointer-events: none;
            z-index: 1000;
        `;

        element.appendChild(pointsEl);
        setTimeout(() => pointsEl.remove(), 1000);
    }

    handleFailure() {
        // NEW: Use admin-configured penalty
        this.combo = Math.floor(this.combo * this.comboPenalty);
        this.stats.wrong++;

        const textEl = this.allCards[this.selectedTextIndex].el;
        const fruitEl = this.allCards[this.selectedFruitIndex].el;

        textEl.classList.add('wrong');
        fruitEl.classList.add('wrong');

        if (window.soundManager) soundManager.play('match_fail');

        setTimeout(() => {
            if (this.difficultyLevel !== 1 || !this.revealedTextCards.has(this.selectedTextIndex)) {
                textEl.classList.remove('selected', 'revealed', 'wrong');
                textEl.classList.add('hidden-card');
                textEl.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                textEl.innerHTML = `
                    <div class="question-mark" style="font-size:28px;color:white;">
                        <i class="fas fa-question"></i>
                    </div>
                `;
            } else {
                textEl.classList.remove('wrong');
            }

            fruitEl.classList.remove('selected', 'wrong');
            fruitEl.style.transform = 'scale(1)';
            textEl.style.transform = 'scale(1)';

            this.selectedTextIndex = null;
            this.selectedFruitIndex = null;
            this.isProcessing = false;
        }, 1500);

        this.updateHUD();
    }

    refillMatchedCards() {
        const currentPairCodes = new Set();
        this.allCards.forEach(slot => {
            if (slot.active) {
                currentPairCodes.add(slot.card.pairCode);
            }
        });

        const availablePairs = this.validPairs.filter(p =>
            !currentPairCodes.has(p.fruit.code)
        );

        const poolPairs = availablePairs.length >= 1
            ? availablePairs
            : this.validPairs;

        const shuffled = [...poolPairs];
        this.shuffleArray(shuffled);

        const newPair = shuffled[0];

        if (this.selectedTextIndex !== null) {
            const slot = this.allCards[this.selectedTextIndex];
            const newTextCard = newPair.text;

            slot.card = {
                data: newTextCard,
                type: 'text',
                pairCode: newPair.fruit.code
            };
            slot.active = true;

            const el = slot.el;
            el.className = 'card text-card hidden-card';
            el.style.cssText = `
                width: 85px;
                height: 110px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                cursor: pointer;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                font-size: 11px;
                font-weight: 600;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                transform: scale(1);
                opacity: 1;
                padding: 4px;
                box-sizing: border-box;
                position: relative;
                overflow: hidden;
                flex-shrink: 0;
            `;
            el.innerHTML = `
                <div class="question-mark" style="font-size:28px;color:white;">
                    <i class="fas fa-question"></i>
                </div>
            `;
            el.dataset.title = newTextCard.title || '';
            el.dataset.pairCode = newPair.fruit.code;
            if (newTextCard.image) {
                el.dataset.image = newTextCard.image;
            }

            this.revealedTextCards.delete(this.selectedTextIndex);
        }

        if (this.selectedFruitIndex !== null) {
            const slot = this.allCards[this.selectedFruitIndex];
            const newFruitCard = newPair.fruit;

            slot.card = {
                data: newFruitCard,
                type: 'fruit',
                pairCode: newPair.fruit.code
            };
            slot.active = true;

            const el = slot.el;
            el.className = 'card fruit-card';
            el.style.cssText = `
                width: 85px;
                height: 110px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                cursor: pointer;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                font-size: 11px;
                font-weight: 600;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
                transform: scale(1);
                opacity: 1;
                padding: 4px;
                box-sizing: border-box;
                position: relative;
                overflow: hidden;
                flex-shrink: 0;
            `;
            el.innerHTML = '';
            el.dataset.pairCode = newPair.fruit.code;

            if (newFruitCard.image) {
                const img = document.createElement('img');
                img.src = newFruitCard.image;
                img.alt = newFruitCard.title || 'Fruit';
                img.style.cssText = `
                    max-width: 95%;
                    max-height: 95%;
                    object-fit: contain;
                    border-radius: 4px;
                `;
                el.appendChild(img);
            } else {
                el.innerHTML = `<span style="color:white;padding:4px;text-align:center;font-size:10px;line-height:1.2;word-break:break-word;">${newFruitCard.title || 'Fruit'}</span>`;
            }
        }

        this.selectedTextIndex = null;
        this.selectedFruitIndex = null;
    }

    shuffleBoard() {
        const active = this.allCards.filter(s => s.active);
        if (active.length < 2) return;

        if (window.soundManager) soundManager.play('card_shuffle');

        this.shuffleArray(this.allCards);

        const grid = document.getElementById('game-grid');
        if (!grid) return;

        grid.innerHTML = '';

        this.allCards.forEach((slot, index) => {
            slot.el.dataset.index = index;
            slot.el.onclick = () => this.onCardClick(index);
            slot.el.classList.add('shuffling');
            grid.appendChild(slot.el);
        });

        setTimeout(() => {
            document.querySelectorAll('.card').forEach(c =>
                c.classList.remove('shuffling')
            );
        }, 600);
    }

    startTimer() {
        clearInterval(this.timerInterval);

        this.timerInterval = setInterval(() => {
            if (this.isPaused) return;

            this.timer--;
            this.updateHUD();

            if (this.timer <= 10 && this.timer > 0) {
                if (window.soundManager) soundManager.play('countdown');
            }

            if (this.timer <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const btn = document.getElementById('pause-btn');

        if (btn) {
            btn.innerHTML = this.isPaused
                ? '<i class="fas fa-play"></i>'
                : '<i class="fas fa-pause"></i>';
        }

        const grid = document.getElementById('game-grid');
        if (grid) {
            grid.style.filter = this.isPaused ? 'blur(5px)' : 'none';
            grid.style.pointerEvents = this.isPaused ? 'none' : 'auto';
        }

        let overlay = document.getElementById('pause-overlay');
        if (this.isPaused) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'pause-overlay';
                overlay.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0,0,0,0.8);
                    color: white;
                    padding: 30px 50px;
                    border-radius: 15px;
                    font-size: 32px;
                    font-weight: bold;
                    z-index: 1000;
                `;
                overlay.textContent = 'PAUSED';
                document.body.appendChild(overlay);
            }
        } else if (overlay) {
            overlay.remove();
        }
    }

    updateHUD() {
        const scoreEl = document.getElementById('score-display');
        const comboEl = document.getElementById('combo-display');
        const timerEl = document.getElementById('timer-display');

        if (scoreEl) {
            scoreEl.textContent = this.score;
            scoreEl.style.animation = 'none';
            setTimeout(() => {
                scoreEl.style.animation = 'pulse 0.3s ease';
            }, 10);
        }

        if (comboEl) {
            comboEl.textContent = this.combo;
            if (this.combo >= 5) {
                comboEl.style.color = '#ffeb3b';
                comboEl.style.fontWeight = 'bold';
            } else {
                comboEl.style.color = '';
                comboEl.style.fontWeight = '';
            }
        }

        if (timerEl) {
            const minutes = Math.floor(Math.max(0, this.timer) / 60);
            const seconds = Math.max(0, this.timer) % 60;
            timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            if (this.timer <= 20) {
                timerEl.classList.add('warning');
                timerEl.style.color = '#ff5252';
            } else {
                timerEl.classList.remove('warning');
                timerEl.style.color = '';
            }
        }
    }

    resetPauseButton() {
        const btn = document.getElementById('pause-btn');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-pause"></i>';
        }

        const grid = document.getElementById('game-grid');
        if (grid) {
            grid.style.filter = 'none';
            grid.style.pointerEvents = 'auto';
        }

        const overlay = document.getElementById('pause-overlay');
        if (overlay) overlay.remove();
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    async endGame() {
        clearInterval(this.timerInterval);

        // NEW: Clear shuffle interval
        if (this.shuffleInterval) {
            clearInterval(this.shuffleInterval);
            this.shuffleInterval = null;
        }

        this.isProcessing = true;

        if (window.soundManager) {
            soundManager.play('game_over');
            soundManager.stopAmbient();
        }

        this.ui.showScreen('game-over-screen');

        const finalScoreEl = document.getElementById('final-score');
        if (finalScoreEl) {
            finalScoreEl.innerHTML = `
                <div style="font-size:48px;font-weight:bold;color:#ffeb3b;margin-bottom:20px;">
                    ${this.score}
                </div>
                <div style="font-size:18px;color:#fff;line-height:1.8;">
                    <p>✅ Correct: ${this.stats.correct}</p>
                    <p>❌ Wrong: ${this.stats.wrong}</p>
                    <p>🔥 Best Combo: ${this.stats.bestCombo}</p>
                    <p>🎯 Accuracy: ${this.getStats().accuracy}%</p>
                </div>
            `;
        }

        if (this.sessionId) {
            try {
                const duration = this.timeSeconds - Math.max(0, this.timer);
                const result = await this.api.finishSession(this.sessionId, {
                    score_balls: this.score,
                    duration: duration,
                    correct_count: this.stats.correct,
                    wrong_count: this.stats.wrong,
                    best_combo: this.stats.bestCombo
                });

                const container = document.getElementById('promos-won-container');
                if (container) {
                    if (result.new_promo_code) {
                        container.innerHTML = `
                            <div class="promo-win-box" style="
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                padding: 30px;
                                border-radius: 15px;
                                margin: 20px 0;
                                text-align: center;
                            ">
                                <h3 style="color:#ffeb3b;font-size:28px;margin-bottom:15px;">
                                    🎉 Congratulations! 🎉
                                </h3>
                                <p style="color:#fff;font-size:18px;margin-bottom:20px;">
                                    You've earned a promo code!
                                </p>
                                <div class="promo-code-display" style="
                                    background: rgba(255,255,255,0.2);
                                    padding: 15px;
                                    border-radius: 10px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    gap: 15px;
                                ">
                                    <code style="
                                        font-size: 24px;
                                        color: #ffeb3b;
                                        font-weight: bold;
                                        letter-spacing: 2px;
                                    ">${result.new_promo_code}</code>
                                    <button class="btn-copy" onclick="copyPromoCode('${result.new_promo_code}')" style="
                                        background: #4caf50;
                                        color: white;
                                        border: none;
                                        padding: 10px 20px;
                                        border-radius: 8px;
                                        cursor: pointer;
                                        font-size: 16px;
                                        font-weight: bold;
                                    ">
                                        Copy
                                    </button>
                                </div>
                            </div>
                        `;
                        if (window.soundManager) soundManager.play('big_win');
                    } else {
                        container.innerHTML = `
                            <p style="color:#fff;font-size:16px;padding:20px;">
                                Keep playing to earn promo codes! 🎮
                            </p>
                        `;
                    }
                }
            } catch (error) {
                console.error("Failed to submit score:", error);
            }
        }
    }

    getStats() {
        return {
            score: this.score,
            combo: this.combo,
            correct: this.stats.correct,
            wrong: this.stats.wrong,
            bestCombo: this.stats.bestCombo,
            accuracy: this.stats.correct + this.stats.wrong > 0
                ? ((this.stats.correct / (this.stats.correct + this.stats.wrong)) * 100).toFixed(1)
                : 0
        };
    }
}

// CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
    }

    @keyframes floatUp {
        0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
        50% { transform: translate(-50%, -100%) scale(1.2); opacity: 1; }
        100% { transform: translate(-50%, -150%) scale(1); opacity: 0; }
    }

    .hint-glow {
        animation: glow 2s ease-in-out;
        box-shadow: 0 0 20px #ffeb3b, 0 0 40px #ffeb3b !important;
    }

    @keyframes glow {
        0%, 100% { box-shadow: 0 0 10px #ffeb3b; }
        50% { box-shadow: 0 0 30px #ffeb3b, 0 0 50px #ffeb3b; }
    }

    .card.matched {
        animation: matchSuccess 0.8s ease forwards;
    }

    @keyframes matchSuccess {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2) rotate(5deg); opacity: 0.8; }
        100% { transform: scale(0.9); opacity: 0.3; }
    }

    .card.wrong {
        animation: shake 0.5s ease;
    }

    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px) rotate(-5deg); }
        75% { transform: translateX(10px) rotate(5deg); }
    }

    .card.shuffling {
        animation: shuffle 0.6s ease;
    }

    @keyframes shuffle {
        0%, 100% { transform: scale(1) rotate(0deg); }
        50% { transform: scale(0.8) rotate(360deg); }
    }

    .card.selected {
        box-shadow: 0 0 20px rgba(255, 235, 59, 0.8) !important;
        border: 2px solid #ffeb3b;
    }

    .card {
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
    }

    @media (max-width: 480px) {
        #game-grid {
            max-width: 100vw !important;
            padding: 8px !important;
        }
    }

    @media (max-width: 360px) {
        .card {
            width: 75px !important;
            height: 100px !important;
            font-size: 10px !important;
        }
    }
`;
document.head.appendChild(style);
// static/js/api.js - COMPLETE BEST VERSION

class API {
    constructor() {
        this.baseURL = '/api';
    }

    /**
     * Get CSRF token from cookie
     * Required for POST, PUT, PATCH, DELETE requests in Django
     */
    _getCSRFToken() {
        const name = 'csrftoken';
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    /**
     * Helper method to get current logged-in user
     * Throws error if no user is logged in
     */
    _getCurrentUser() {
        const user = window.getCurrentUser();
        if (!user || !user.phone) {
            throw new Error("No user logged in");
        }
        return user;
    }

    /**
     * Generic fetch wrapper with error handling and CSRF token
     * @param {string} url - API endpoint URL
     * @param {object} options - Fetch options
     * @returns {Promise} - Response data
     */
    async _fetch(url, options = {}) {
        try {
            // Prepare headers
            const headers = {
                'Content-Type': 'application/json',
                ...options.headers
            };

            // Add CSRF token for non-GET requests
            if (options.method && options.method !== 'GET') {
                const csrfToken = this._getCSRFToken();
                if (csrfToken) {
                    headers['X-CSRFToken'] = csrfToken;
                }
            }

            // Make the request
            // IMPORTANT: include credentials for session-based auth
            const response = await fetch(url, {
                ...options,
                headers,
                credentials: 'include'
            });

            // Handle non-OK responses
            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`;

                // Try to get error details from response
                try {
                    const errorData = await response.json();
                    if (errorData.error) {
                        errorMessage = errorData.error;
                    } else if (errorData.detail) {
                        errorMessage = errorData.detail;
                    }
                } catch (e) {
                    // If response is not JSON, use status text
                    errorMessage = response.statusText || errorMessage;
                }

                throw new Error(errorMessage);
            }

            // Parse and return JSON response
            return await response.json();

        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    /**
     * Get game configuration, fruits, and text cards
     * @returns {Promise<{config: object, fruit_cards: array, text_cards: array}>}
     */
    async getConfig() {
        return this._fetch(`${this.baseURL}/game/config/`);
    }

    /**
     * Start a new game session
     * @param {string} mode - Game mode ('ranked' or 'training')
     * @returns {Promise<{session_id: string, server_time: string, player: object}>}
     */
    async startSession(mode = 'ranked') {
        const user = this._getCurrentUser();

        return this._fetch(`${this.baseURL}/session/start/`, {
            method: 'POST',
            body: JSON.stringify({
                phone_number: user.phone,
                name: user.name,
                mode: mode
            })
        });
    }

    /**
     * Finish a game session and submit score
     * @param {string} sessionId - Session ID
     * @param {object} sessionData - Session data including score, duration, etc.
     * @returns {Promise<{status: string, new_promo_code: string}>}
     */
    async finishSession(sessionId, sessionData) {
        return this._fetch(`${this.baseURL}/session/finish/`, {
            method: 'POST',
            body: JSON.stringify({
                session_id: sessionId,
                score_balls: sessionData.score_balls || 0,
                duration: sessionData.duration || 0,
                correct_count: sessionData.correct_count || 0,
                wrong_count: sessionData.wrong_count || 0,
                best_combo: sessionData.best_combo || 0,
                log_json: sessionData.log_json || {}
            })
        });
    }

    /**
     * Get leaderboard (top 10 players)
     * @returns {Promise<array>} Array of leaderboard entries
     */
    async getLeaderboard() {
        return this._fetch(`${this.baseURL}/leaderboard/`);
    }

    /**
     * Get current player's profile including promos and history
     * @returns {Promise<{player: object, history: array}>}
     */
    async getProfile() {
        const user = this._getCurrentUser();

        return this._fetch(
            `${this.baseURL}/profile/?phone_number=${encodeURIComponent(user.phone)}`
        );
    }

    /**
     * Update player settings (theme, language, etc.)
     * @param {object} settings - Settings to update {theme: 'dark', language: 'en'}
     * @returns {Promise<object>} Updated player data
     */
    async updateSettings(settings) {
        const user = this._getCurrentUser();

        return this._fetch(`${this.baseURL}/profile/`, {
            method: 'PATCH',
            body: JSON.stringify({
                phone_number: user.phone,
                ...settings
            })
        });
    }

    /**
     * Get active tournaments
     * @returns {Promise<array>} Array of tournament objects
     */
    async getTournaments() {
        return this._fetch(`${this.baseURL}/tournaments/`);
    }

    /**
     * Validate game session (anti-cheat)
     * @param {string} sessionId - Session ID to validate
     * @param {object} validationData - Validation data (logs, timestamps, etc.)
     * @returns {Promise<object>} Validation result
     */
    async validateSession(sessionId, validationData) {
        return this._fetch(`${this.baseURL}/session/validate/`, {
            method: 'POST',
            body: JSON.stringify({
                session_id: sessionId,
                ...validationData
            })
        });
    }


    /**
     * Check if user is logged in
     * @returns {boolean} True if user is logged in
     */
    isLoggedIn() {
        try {
            this._getCurrentUser();
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Get current user info without throwing error
     * @returns {object|null} User object or null if not logged in
     */
    getCurrentUserSafe() {
        try {
            return this._getCurrentUser();
        } catch (e) {
            return null;
        }
    }
}

// Make API available globally
window.API = API;

// Export for module systems (Node.js, etc.)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}

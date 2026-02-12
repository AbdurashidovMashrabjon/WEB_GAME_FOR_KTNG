// static/js/main.js

// Entry Point
const api = new API();

// Global user state
let currentUser = null;

// Login submission function
function submitLogin() {
  const name = document.getElementById("login-name").value.trim();
  const phoneDigits = document.getElementById("login-phone").value.trim();

  // Validation
  if (!name) {
    alert("Please enter your name");
    return;
  }

  if (phoneDigits.length !== 9 || !/^\d{9}$/.test(phoneDigits)) {
    alert("Please enter a valid 9-digit phone number");
    return;
  }

  const phone_number = "+998" + phoneDigits;

  // Save to localStorage
  localStorage.setItem("player_name", name);
  localStorage.setItem("player_phone", phone_number);

  // Set current user
  currentUser = {
    name: name,
    phone: phone_number
  };

  // Hide login modal and show app
  document.getElementById("login-modal").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  // Initialize the app
  initApp();
}

// Initialize the application after login
async function initApp() {
  try {
    // Show loading
    document.getElementById('loading').classList.remove('hidden');

    // Init UI (load profile settings)
    if (window.ui) await ui.init();

    // Init Game (load config)
    if (window.game) await game.load();

    // Set background image
    const bg = document.getElementById('game-bg');
    if (bg) {
        bg.style.backgroundImage = "url('/static/images/background.jpg')";
    }

  } catch(e) {
    console.error("Initialization error", e);
    alert("Failed to load game. Please refresh the page.");
  } finally {
    document.getElementById('loading').classList.add('hidden');
    if (window.ui) ui.showScreen('menu-screen');
  }
}

// Check if user is already logged in
function checkExistingLogin() {
  const savedName = localStorage.getItem("player_name");
  const savedPhone = localStorage.getItem("player_phone");

  if (savedName && savedPhone) {
    // User already logged in
    currentUser = {
      name: savedName,
      phone: savedPhone
    };

    // Hide login modal and show app
    document.getElementById("login-modal").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

    // Initialize the app
    initApp();
  } else {
    // Show login modal
    document.getElementById('loading').classList.add('hidden');
    document.getElementById("login-modal").classList.remove("hidden");
  }
}

// Page load event
window.onload = () => {
    // Initialize global objects
    window.ui = new UI(api);
    window.game = new Game(api, window.ui);

    // Check if user is already logged in
    checkExistingLogin();

    // Load pending tickets
    if (typeof loadPendingTickets === 'function') {
        loadPendingTickets();
    }
};

// Global functions for HTML onclick handlers
window.submitLogin = submitLogin;

window.startGameWithLevel = (level) => {
  ui.selectedLevel = level;
  game.start();
};

window.copyPromoCode = (code) => {
    window.copyText(code).then(ok => {
        if(ok) window.showToast("Promo Code Copied!");
    });
};

window.showLevelSelect = () => ui.showScreen('level-screen');

window.showLeaderboard = () => ui.showLeaderboard();

window.showProfile = () => ui.showProfile();

window.showMenu = () => ui.showScreen('menu-screen');

window.togglePause = () => game.togglePause();

window.confirmRestart = () => {
  if(confirm("Restart game?")) {
    game.start(game.currentMode);
  }
};

window.useHint = () => {
  console.log("Hint feature coming soon!");
};

window.shuffleBoard = () => {
  console.log("Shuffle feature coming soon!");
};

// Helper function to get current user
window.getCurrentUser = () => currentUser;

// Logout function with custom multilingual modal
window.logout = () => {
  const lang = localStorage.getItem('lang') || 'en';
  const dict = window.I18N[lang];

  // Create custom modal
  const modal = document.createElement('div');
  modal.className = 'custom-confirm-modal';
  modal.innerHTML = `
    <div class="custom-confirm-overlay"></div>
    <div class="custom-confirm-box">
      <h3>${dict.logout_confirm_title}</h3>
      <div class="custom-confirm-buttons">
        <button class="btn-confirm-cancel" id="confirm-cancel">${dict.logout_confirm_cancel}</button>
        <button class="btn-confirm-ok" id="confirm-ok">${dict.logout_confirm_ok}</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add event listeners
  document.getElementById('confirm-ok').onclick = () => {
    localStorage.removeItem("player_name");
    localStorage.removeItem("player_phone");
    currentUser = null;
    location.reload();
  };

  document.getElementById('confirm-cancel').onclick = () => {
    modal.remove();
  };

  // Close on overlay click
  modal.querySelector('.custom-confirm-overlay').onclick = () => {
    modal.remove();
  };
};
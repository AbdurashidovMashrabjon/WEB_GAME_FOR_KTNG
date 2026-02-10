// static/js/main.js

// Entry Point
const api = new API();
// UI class is not provided in the prompt but main.js references it.
// I will create a dummy UI class in ui.js or assume it exists in ui.js
// Since I need to create all files, I must implement UI.js or inline it.
// The prompt references `static/js/ui.js` in index.html.
// But the user did not provide `ui.js` content.
// I will create a basic UI class here or separate file if I can.
// Wait, the prompt provided main.js which references `UI`.
// I will write main.js as provided.

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

// Logout function
window.logout = () => {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("player_name");
    localStorage.removeItem("player_phone");
    currentUser = null;
    location.reload();
  }
};

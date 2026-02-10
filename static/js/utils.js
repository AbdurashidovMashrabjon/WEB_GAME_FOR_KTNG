// static/js/utils.js

// ===============================
// Toast + Clipboard helpers
// ===============================
window.showToast = function (msg) {
  const root = document.getElementById("toast-root");
  if (!root) {
      // Create root if not exists
      const newRoot = document.createElement('div');
      newRoot.id = 'toast-root';
      document.body.appendChild(newRoot);
  }

  const container = document.getElementById("toast-root");
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<i class="fas fa-check-circle"></i><span>${msg}</span>`;
  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
  }, 1200);

  setTimeout(() => el.remove(), 1500);
};

window.copyText = async function (text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (_) {
    return false;
  }
};

// ===============================
// Cookie Utility
// ===============================
window.getCookie = function (name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};

// ===============================
// Phone Utilities (+998 ONLY)
// ===============================
window.normalizePhone = function (digits) {
  return "+998" + digits.replace(/\D/g, "").slice(0, 9);
};

window.isValidUzPhone = function (phone) {
  return /^\+998\d{9}$/.test(phone);
};

// ===============================
// I18N TRANSLATIONS - UPDATED
// ===============================
window.I18N = {
  en: {
    play_game: "Play Game",
    play_ranked: "Ranked Mode",
    play_training: "Training Mode",
    leaderboard: "Leaderboard",
    profile: "Profile",
    time: "Time",
    balls: "Points",
    combo: "Combo",
    restart: "Restart",
    hint: "Hint",
    shuffle: "Shuffle",
    game_over: "Game Over",
    score: "Score",
    main_menu: "Main Menu",
    back: "Back",
    settings: "Settings",
    pause: "Pause",
    resume: "Resume",

    theme_dark: "Dark Mode",
    theme_light: "Light Mode",

    lang_en: "English",
    lang_uz: "Uzbek",
    lang_ru: "Russian",

    history: "History",
    promos: "Promo Codes",
    promo_codes: "Promo Codes",
    copy: "Copy",

    select_level: "Select Difficulty",
    level_easy: "Easy",
    level_medium: "Medium",
    level_hard: "Hard",

    login_title: "Enter your details",
    login_name: "Your name",
    login_phone: "Phone number",
    login_continue: "Continue",

    error_invalid_phone: "Invalid phone number",
    error_required_fields: "Please fill all fields",
    logout: "Logout",
    games_played: "Games Played",
    recent_games: "Recent Games",
    no_games: "No games played yet",
    login_required: "Please login to view profile",
    congrats: "Congratulations!",
    payout_msg: "We paid to your telegram wallet during 24 hours",
    claim: "CLAIM REWARD",

    // Updated Instructions
    instructions_title: "How to Play",
    instructions_objective: "Objective",
    instructions_objective_text: "Match text cards with their corresponding fruit cards to earn points and win rewards!",
    instructions_howto: "How to Play",
    instructions_step1: "Click on a text card (?) to reveal its description",
    instructions_step2: "Click on the matching fruit card that fits the description",
    instructions_step3: "If correct, both cards disappear, you earn points, and new cards appear",
    instructions_step4: "If wrong, cards reset - but don't worry, no penalty!",
    instructions_scoring: "Scoring System",
    instructions_easy_points: "5 points + hints shown + no shuffling",
    instructions_medium_points: "15 points + occasional shuffling",
    instructions_hard_points: "20 points + frequent shuffling",
    instructions_combo: "🔥 Combo Bonus:",
    instructions_combo_detail: "+2 points for each consecutive match!",
    instructions_time_bonus: "⚡ Time Bonus:",
    instructions_time_bonus_detail: "+5 points when you have more than 1 minute left!",
    instructions_tips: "Pro Tips",
    instructions_tip1: "💡 Easy mode shows hints - perfect for beginners!",
    instructions_tip2: "👀 Fruit cards are always visible - memorize their positions",
    instructions_tip3: "🔥 Build combos for massive bonus points",
    instructions_tip4: "⏰ No penalties for wrong matches - keep playing!",
    instructions_tip5: "🎯 Match cards quickly for better scores",
    instructions_difficulty: "Choose Your Challenge",
    instructions_easy_desc: "Hints visible, more time, no shuffling",
    instructions_medium_desc: "Balanced challenge with occasional shuffles",
    instructions_hard_desc: "Maximum points, frequent shuffling"
  },

  uz: {
    play_game: "O'yinni Boshlash",
    play_ranked: "Reyting",
    play_training: "Mashq",
    leaderboard: "Reytinglar",
    profile: "Profil",
    time: "Vaqt",
    balls: "Ballar",
    combo: "Kombo",
    restart: "Qayta",
    hint: "Yordam",
    shuffle: "Aralashtirish",
    game_over: "O'yin Tugadi",
    score: "Natija",
    main_menu: "Bosh Menyu",
    back: "Orqaga",
    settings: "Sozlamalar",
    pause: "Pauza",
    resume: "Davom etish",

    theme_dark: "Tungi Rejim",
    theme_light: "Kunduzgi Rejim",

    lang_en: "English",
    lang_uz: "O'zbek",
    lang_ru: "Русский",

    history: "Tarix",
    promos: "Promo Kodlar",
    promo_codes: "Promo Kodlar",
    copy: "Nusxalash",

    select_level: "Qiyinlik darajasi",
    level_easy: "Oson",
    level_medium: "O'rta",
    level_hard: "Qiyin",

    login_title: "Ma'lumotlarni kiriting",
    login_name: "Ismingiz",
    login_phone: "Telefon raqam",
    login_continue: "Davom etish",

    error_invalid_phone: "Telefon raqam noto'g'ri",
    error_required_fields: "Barcha maydonlarni to'ldiring",
    logout: "Chiqish",
    games_played: "O'ynalgan o'yinlar",
    recent_games: "So'nggi o'yinlar",
    no_games: "Hozircha o'yinlar yo'q",
    login_required: "Profilni ko'rish uchun kiring",
    congrats: "Tabriklaymiz!",
    payout_msg: "Sizning telegram hamyoningizga 24 soat ichida ballaringiz tushuriladi",
    claim: "MUKOFOTNI OLISH",

    // Updated Instructions
    instructions_title: "Qanday o'ynash kerak",
    instructions_objective: "Maqsad",
    instructions_objective_text: "Matn kartalarini mos meva kartalari bilan birlashtiring va mukofotlar yutib oling!",
    instructions_howto: "O'ynash tartibi",
    instructions_step1: "Matn kartasiga (?) bosing va tavsifini o'qing",
    instructions_step2: "Tavsifga mos keladigan meva kartasini tanlang",
    instructions_step3: "Agar to'g'ri bo'lsa, kartalar yo'qoladi, ball olasiz va yangilari paydo bo'ladi",
    instructions_step4: "Agar noto'g'ri bo'lsa, kartalar qaytadi - lekin jazo yo'q!",
    instructions_scoring: "Ball hisoblash",
    instructions_easy_points: "5 ball + maslahatlar + aralashtirilmaydi",
    instructions_medium_points: "15 ball + ba'zan aralashadi",
    instructions_hard_points: "20 ball + tez-tez aralashadi",
    instructions_combo: "🔥 Kombo Bonusi:",
    instructions_combo_detail: "Har bir ketma-ket mos keltirish uchun +2 ball!",
    instructions_time_bonus: "⚡ Vaqt Bonusi:",
    instructions_time_bonus_detail: "1 daqiqadan ko'p vaqt qolsa +5 ball!",
    instructions_tips: "Muhim maslahatlar",
    instructions_tip1: "💡 Oson rejimda maslahatlar ko'rsatiladi - yangi boshlovchilar uchun!",
    instructions_tip2: "👀 Meva kartalari doim ko'rinadi - joylarini eslab qoling",
    instructions_tip3: "🔥 Kombo yarating va ko'p ball to'plang",
    instructions_tip4: "⏰ Noto'g'ri javob uchun jazo yo'q - davom eting!",
    instructions_tip5: "🎯 Tezroq mos keltiring va ko'proq ball oling",
    instructions_difficulty: "Qiyinlikni tanlang",
    instructions_easy_desc: "Maslahatlar bor, ko'proq vaqt, aralashish yo'q",
    instructions_medium_desc: "O'rtacha qiyinlik, ba'zan aralashadi",
    instructions_hard_desc: "Maksimal ball, tez-tez aralashadi"
  },

  ru: {
    play_game: "Играть",
    play_ranked: "Рейтинг",
    play_training: "Тренировка",
    leaderboard: "Лидеры",
    profile: "Профиль",
    time: "Время",
    balls: "Очки",
    combo: "Комбо",
    restart: "Заново",
    hint: "Подсказка",
    shuffle: "Перемешать",
    game_over: "Игра окончена",
    score: "Счет",
    main_menu: "Главное меню",
    back: "Назад",
    settings: "Настройки",
    pause: "Пауза",
    resume: "Продолжить",

    theme_dark: "Темная тема",
    theme_light: "Светлая тема",

    lang_en: "English",
    lang_uz: "O'zbek",
    lang_ru: "Русский",

    history: "История",
    promos: "Промокоды",
    promo_codes: "Промокоды",
    copy: "Копировать",

    select_level: "Сложность",
    level_easy: "Легко",
    level_medium: "Средне",
    level_hard: "Сложно",

    login_title: "Введите данные",
    login_name: "Ваше имя",
    login_phone: "Номер телефона",
    login_continue: "Продолжить",

    error_invalid_phone: "Неверный номер телефона",
    error_required_fields: "Заполните все поля",
    logout: "Выйти",
    games_played: "Игр сыграно",
    recent_games: "Недавние игры",
    no_games: "Игр пока нет",
    login_required: "Войдите, чтобы просмотреть профиль",
    congrats: "Поздравляем!",
    payout_msg: "Мы переведем средства на ваш Telegram-кошелек в течение 24 часов",
    claim: "ПОЛУЧИТЬ НАГРАДУ",

    // Updated Instructions
    instructions_title: "Как играть",
    instructions_objective: "Цель",
    instructions_objective_text: "Сопоставляйте текстовые карты с картами фруктов и выигрывайте награды!",
    instructions_howto: "Как играть",
    instructions_step1: "Нажмите на текстовую карту (?), чтобы увидеть описание",
    instructions_step2: "Нажмите на подходящую карту с фруктом",
    instructions_step3: "Если правильно, карты исчезают, вы получаете очки и появляются новые",
    instructions_step4: "Если неправильно, карты возвращаются - но штрафа нет!",
    instructions_scoring: "Система очков",
    instructions_easy_points: "5 очков + подсказки + без перемешивания",
    instructions_medium_points: "15 очков + редкое перемешивание",
    instructions_hard_points: "20 очков + частое перемешивание",
    instructions_combo: "🔥 Бонус за комбо:",
    instructions_combo_detail: "+2 очка за каждое последовательное совпадение!",
    instructions_time_bonus: "⚡ Бонус за скорость:",
    instructions_time_bonus_detail: "+5 очков, когда осталось больше 1 минуты!",
    instructions_tips: "Полезные советы",
    instructions_tip1: "💡 В легком режиме показаны подсказки - идеально для новичков!",
    instructions_tip2: "👀 Карты с фруктами всегда видны - запоминайте позиции",
    instructions_tip3: "🔥 Собирайте комбо для максимальных очков",
    instructions_tip4: "⏰ Нет штрафов за ошибки - продолжайте играть!",
    instructions_tip5: "🎯 Делайте совпадения быстрее для лучших результатов",
    instructions_difficulty: "Выберите сложность",
    instructions_easy_desc: "Подсказки видны, больше времени, нет перемешивания",
    instructions_medium_desc: "Сбалансированная сложность с редким перемешиванием",
    instructions_hard_desc: "Максимум очков, частое перемешивание"
  }
};

// ===============================
// I18N APPLY FUNCTION
// ===============================
window.applyI18N = function (lang) {
  const dict = window.I18N[lang] || window.I18N.en;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) {
      el.innerHTML = dict[key];
    }
  });

  localStorage.setItem("lang", lang);

  // Dispatch event so other components can react
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
};
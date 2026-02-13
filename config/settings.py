# config/settings.py
import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "django-insecure-3wa3^4p_9oxuy3_k-2qn5pn9b9=+0^z*rfjogdfg8egmb&w3s2s1f&i$ulx-oo")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get("DJANGO_DEBUG", "True") == "True"

ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    'mine-boxed-kitty-fort.trycloudflare.com',
    # Add your production domain(s) here in production
    # '.yourdomain.com',
]

# Application definition
INSTALLED_APPS = [
    'jazzmin',                      # Must come before django.contrib.admin
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'rest_framework',
    'corsheaders',

    # Your apps
    'core',
    'admin_api',
    'rewards',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ────────────────────────────────────────────────
#                  DATABASE
# ────────────────────────────────────────────────

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'webgame_db'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', '2003'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# Use dj-database-url in production (recommended)
# DATABASES['default'] = dj_database_url.config(default='postgres://postgres:2003@localhost:5432/webgame_db', conn_max_age=600)

# ────────────────────────────────────────────────
#             AUTHENTICATION & SECURITY
# ────────────────────────────────────────────────

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

AUTH_USER_MODEL = 'core.Player'

# ────────────────────────────────────────────────
#                 INTERNATIONALIZATION
# ────────────────────────────────────────────────

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Tashkent'           # ← better default for Uzbekistan
USE_I18N = True
USE_TZ = True

# ────────────────────────────────────────────────
#                   STATIC & MEDIA
# ────────────────────────────────────────────────

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ────────────────────────────────────────────────
#                 REST FRAMEWORK
# ────────────────────────────────────────────────

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        # 'rest_framework.authentication.TokenAuthentication',  # ← add if you want to support token auth too
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',  # useful in dev
    ],
}

# ────────────────────────────────────────────────
#                    CORS & CSRF
# ────────────────────────────────────────────────

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',          # Vite default port
    # Add production frontend URL(s)
    # 'https://your-frontend-domain.com',
]

# Remove this in production — very insecure
# CORS_ALLOW_ALL_ORIGINS = True

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    # 'https://your-frontend-domain.com',
]

CSRF_COOKIE_NAME = 'csrftoken'
CSRF_COOKIE_HTTPONLY = False          # needed so React can read it
CSRF_COOKIE_SAMESITE = 'Lax'          # 'None' + SECURE=True only with HTTPS
CSRF_COOKIE_SECURE = False            # → True in production with HTTPS

SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = False         # → True in production with HTTPS

# ────────────────────────────────────────────────
#                     JAZZMIN
# ────────────────────────────────────────────────

JAZZMIN_SETTINGS = {
    "site_title": "Fruit Game Admin",
    "site_header": "Fruit Game Administration",
    "site_brand": "Fruit Game",
    "welcome_sign": "Welcome to Fruit Game Admin",
    "copyright": "Fruit Game Ltd",

    "search_model": ["core.Player", "core.GameSession"],

    "topmenu_links": [
        {"name": "Home", "url": "admin:index", "permissions": ["auth.view_user"]},
        {"model": "core.Player"},
        {"app": "core"},
    ],

    "show_sidebar": True,
    "navigation_expanded": True,

    "hide_apps": ["rewards"],

    "icons": {
        "auth": "fas fa-users-cog",
        "auth.user": "fas fa-user",
        "auth.Group": "fas fa-users",
        "core": "fas fa-gamepad",
        "core.Player": "fas fa-user-circle",
        "core.GameSession": "fas fa-play-circle",
        "core.FruitCard": "fas fa-apple-alt",
        "core.DifficultySettings": "fas fa-sliders-h",
        "core.GameConfiguration": "fas fa-cog",  # ← typo fix: GameConfig → GameConfiguration?
        "core.TextCard": "fas fa-file-alt",
    },

    "changeform_format": "vertical_tabs",
    "changeform_format_overrides": {
        "core.difficultysettings": "vertical_tabs",
        "core.gameconfiguration": "vertical_tabs",
        "core.player": "vertical_tabs",
        "core.gamesession": "vertical_tabs",
    },

    "show_ui_builder": False,
    "custom_js": None,
    "custom_css": None,
    "related_modal_active": True,
    "use_google_fonts_cdn": True,
    "language_chooser": False,
}

# ────────────────────────────────────────────────
#                   OTHER SETTINGS
# ────────────────────────────────────────────────

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Recommended in development
INTERNAL_IPS = [
    '127.0.0.1',
]

# Optional: login redirect
LOGIN_REDIRECT_URL = '/admin/'
LOGOUT_REDIRECT_URL = '/admin/login/'
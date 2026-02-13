# admin_api/urls.py
from django.urls import path
from django.views.decorators.csrf import csrf_exempt

from . import views

urlpatterns = [
    # Authentication
    path('auth/login/',    csrf_exempt(views.AdminLoginView.as_view()),   name='admin-login'),
    path('auth/logout/',   csrf_exempt(views.AdminLogoutView.as_view()),  name='admin-logout'),
    path('auth/profile/',  views.AdminProfileView.as_view(),              name='admin-profile'),  # NO csrf_exempt → protected

    # Difficulty
    path('difficulty/',             csrf_exempt(views.DifficultySettingsView.as_view()), name='difficulty-list'),
    path('difficulty/<int:pk>/',    csrf_exempt(views.DifficultySettingsView.as_view()), name='difficulty-detail'),

    # Config
    path('config/',                 views.GameConfigView.as_view(),       name='game-config'),

    # Cards
    path('cards/fruits/',           csrf_exempt(views.FruitCardsView.as_view()),   name='fruit-cards-list'),
    path('cards/fruits/<int:pk>/',  csrf_exempt(views.FruitCardsView.as_view()),   name='fruit-card-detail'),
    path('cards/texts/',            csrf_exempt(views.TextCardsView.as_view()),    name='text-cards-list'),
    path('cards/texts/<int:pk>/',   csrf_exempt(views.TextCardsView.as_view()),    name='text-card-detail'),

    # Analytics
    path('analytics/overview/',     views.AnalyticsOverviewView.as_view(), name='analytics-overview'),
    path('analytics/players/',      views.PlayerAnalyticsView.as_view(),    name='analytics-players'),

    # Players
    path('players/',                csrf_exempt(views.PlayersManagementView.as_view()), name='players-list'),
    path('players/<int:pk>/',       csrf_exempt(views.PlayersManagementView.as_view()), name='player-detail'),

    # Promos
    path('promos/',                 csrf_exempt(views.PromoCodesView.as_view()), name='promos-list'),

    # Preview
    path('preview/settings/',       csrf_exempt(views.PreviewGameSettingsView.as_view()), name='preview-settings'),
]
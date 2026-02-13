# core/urls.py
from django.urls import path
from .api_views import UserGameConfigView     # ← direct import from api_views.py

from .views import (                          # your other views
    ConfigView,
    SessionStartView,
    SessionFinishView,
    LeaderboardView,
    PlayerProfileView,
)

urlpatterns = [
    path('game/config/', UserGameConfigView.as_view(), name='game-config'),

    path('config/', ConfigView.as_view(), name='config'),
    path('session/start/', SessionStartView.as_view(), name='session-start'),
    path('session/finish/', SessionFinishView.as_view(), name='session-finish'),
    path('leaderboard/', LeaderboardView.as_view(), name='leaderboard'),
    path('profile/', PlayerProfileView.as_view(), name='profile'),
]
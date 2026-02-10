# core/urls.py - ADD THESE VOTING URLS TO YOUR EXISTING urls.py

from django.urls import path
from core.views import (
    # ... your existing views ...
    ConfigView,
    SessionStartView,
    SessionFinishView,
    LeaderboardView,
    PlayerProfileView,
    TournamentView,

)

urlpatterns = [
    # Existing routes
    path('config/', ConfigView.as_view(), name='config'),
    path('session/start/', SessionStartView.as_view(), name='session-start'),
    path('session/finish/', SessionFinishView.as_view(), name='session-finish'),
    path('leaderboard/', LeaderboardView.as_view(), name='leaderboard'),
    path('profile/', PlayerProfileView.as_view(), name='profile'),
    path('tournaments/', TournamentView.as_view(), name='tournaments'),

]




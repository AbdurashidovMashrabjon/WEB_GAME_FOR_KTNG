# core/views.py  (or core/api_views.py)

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import F

from .models import GameConfig, FruitCard, TextCard, DifficultySettings


# core/api_views.py (or wherever it is)

# core/api_views.py (or wherever it is)

class UserGameConfigView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # Global config (your existing code)
        config_obj = GameConfig.load()
        config_data = {
            'maintenance_mode': config_obj.maintenance_mode,
            'promo_score_threshold': config_obj.promo_score_threshold,
            'timer_seconds': config_obj.timer_seconds,
            'version': config_obj.config_version,
            # ... add others if needed
        }

        # Fruit cards (unchanged)
        fruit_cards = FruitCard.objects.filter(is_active=True).order_by('order').values(
            'id', 'code', 'title', 'image', 'is_active', 'weight', 'order'
        )

        # Text cards – keep your renamed annotation
        text_cards = TextCard.objects.filter(is_active=True).select_related('correct_fruit').order_by('order').values(
            'id', 'title', 'code', 'image', 'is_active', 'weight', 'order',
            correct_fruit_pk=F('correct_fruit__id'),          # safe rename
            correct_fruit_code=F('correct_fruit__code'),
        )

        # Difficulty settings – FIXED: use 'difficulty_level' instead of 'level'
        difficulty_settings = DifficultySettings.objects.filter(is_active=True).order_by('order').values(
            'id',
            'difficulty_level',                             # ← changed from 'level'
            'time_seconds',
            'base_points',
            'level_multiplier',
            'combo_bonus_per_match',
            'combo_penalty_on_wrong',
            'shuffle_enabled',
            'shuffle_frequency',
            'hints_enabled',
            'is_active',
            'order',
            names=F('name_en'),                             # or 'names' if it's JSONField
            # name_uz=F('name_uz'), name_ru=F('name_ru')   # if separate fields
        )

        return Response({
            'config': config_data,
            'fruit_cards': list(fruit_cards),
            'text_cards': list(text_cards),
            'difficulty_settings': list(difficulty_settings),
        })
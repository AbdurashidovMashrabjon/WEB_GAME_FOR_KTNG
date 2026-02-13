# core/views.py - FINAL PRODUCTION VERSION (December 2025)

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.utils import timezone
from django.contrib.auth import login
from django.db import transaction
import traceback
from .models import (
    GameConfig, FruitCard, TextCard, GameSession,
    Player, Tournament
)
from .serializers import (
    GameConfigSerializer, FruitCardSerializer, TextCardSerializer,
    GameSessionStartSerializer, GameSessionFinishSerializer,
    LeaderboardEntrySerializer, PlayerSerializer,
    PlayerSettingsSerializer, TournamentSerializer
)


from django.http import JsonResponse
from .models import DifficultySettings


class ConfigView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        config = GameConfig.load()
        fruits = FruitCard.objects.filter(is_active=True)
        texts = TextCard.objects.filter(is_active=True)

        # Get difficulty settings
        difficulty_settings = DifficultySettings.objects.filter(is_active=True).order_by('order')

        difficulty_data = []
        for setting in difficulty_settings:
            difficulty_data.append({
                'level': setting.difficulty_level,
                'time_seconds': setting.time_seconds,
                'base_points': setting.base_points,
                'level_multiplier': setting.level_multiplier,
                'combo_bonus': setting.combo_bonus_per_match,
                'combo_penalty': setting.combo_penalty_on_wrong,
                'shuffle_enabled': setting.shuffle_enabled,
                'shuffle_frequency': setting.shuffle_frequency,
                'hints_enabled': setting.hints_enabled,
            })

        return Response({
            "config": GameConfigSerializer(config).data,
            "fruit_cards": FruitCardSerializer(fruits, many=True, context={'request': request}).data,
            "text_cards": TextCardSerializer(texts, many=True, context={'request': request}).data,
            "difficulty_settings": difficulty_data,  # ← ADD THIS LINE
        })

# ====================== SESSION START ======================
class SessionStartView(APIView):
    permission_classes = [permissions.AllowAny]

    # Map frontend mode strings to integer difficulty values
    DIFFICULTY_MAP = {
        "easy": 1,
        "medium": 2,
        "hard": 3,
        "ranked": 4,
        "training": 4,  # fallback if needed
    }

    def post(self, request):
        serializer = GameSessionStartSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        phone = serializer.validated_data["phone_number"]
        name = serializer.validated_data["name"]
        mode = serializer.validated_data.get("mode", "ranked").lower()

        # Convert mode string to integer difficulty
        difficulty = self.DIFFICULTY_MAP.get(mode, 4)  # default to ranked = 4

        # Get or create player
        player, created = Player.objects.get_or_create(
            phone_number=phone,
            defaults={"name": name}
        )
        if not created and player.name != name:
            player.name = name

        player.last_login = timezone.now()
        player.save()

        # Log in the player
        login(request, player, backend='django.contrib.auth.backends.ModelBackend')

        # Create session with INTEGER difficulty
        session = GameSession.objects.create(
            player=player,
            difficulty=difficulty
        )

        return Response({
            "session_id": session.session_id,
            "server_time": timezone.now().isoformat(),
            "player": PlayerSerializer(player).data,
        }, status=status.HTTP_201_CREATED)


# ====================== SESSION FINISH ======================
class SessionFinishView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = GameSessionFinishSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        session_id = serializer.validated_data["session_id"]

        try:
            session = GameSession.objects.select_related('player').get(
                session_id=session_id,
                player=request.user  # Security: only own session
            )
        except GameSession.DoesNotExist:
            return Response({"error": "Session not found or not yours"}, status=status.HTTP_404_NOT_FOUND)

        if session.ended_at:
            return Response({"error": "Session already finished"}, status=status.HTTP_400_BAD_REQUEST)

        # Update session
        session.score_balls = serializer.validated_data["score_balls"]
        session.duration = serializer.validated_data["duration"]
        session.correct_count = serializer.validated_data.get("correct_count", 0)
        session.wrong_count = serializer.validated_data.get("wrong_count", 0)
        session.best_combo = serializer.validated_data.get("best_combo", 0)
        session.ended_at = timezone.now()
        session.save()

        new_promo_code = None
        config = GameConfig.load()

        if session.score_balls >= config.promo_score_threshold:
            from rewards.models import PromoCode

            try:
                with transaction.atomic():
                    promo = PromoCode.objects.select_for_update() \
                        .filter(is_used=False).first()

                    if promo:
                        promo.is_used = True
                        promo.player = session.player
                        promo.claimed_at = timezone.now()
                        promo.save()
                        new_promo_code = promo.code
            except Exception as e:
                print(f"[PROMO ERROR] {e}")
                traceback.print_exc()

        return Response({
            "status": "success",
            "new_promo_code": new_promo_code,
        })


# ====================== LEADERBOARD ======================
class LeaderboardView(APIView):
    permission_classes = [permissions.AllowAny]

    # Integer values for difficulty
    DIFFICULTY_MAP = {
        "easy": 1,
        "medium": 2,
        "hard": 3,
        "ranked": 4,
    }
    DEFAULT_DIFFICULTY = 4  # Ranked leaderboard by default

    def get(self, request):
        difficulty_param = request.query_params.get("difficulty")

        qs = GameSession.objects.filter(ended_at__isnull=False)

        if difficulty_param:
            try:
                if difficulty_param.isdigit():
                    difficulty = int(difficulty_param)
                else:
                    difficulty = self.DIFFICULTY_MAP.get(difficulty_param.lower())
                    if difficulty is None:
                        return Response(
                            {"error": "Invalid difficulty. Use: easy, medium, hard, ranked or number 1-4"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                qs = qs.filter(difficulty=difficulty)
            except ValueError:
                return Response({"error": "Invalid difficulty value"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            qs = qs.filter(difficulty=self.DEFAULT_DIFFICULTY)  # Only ranked by default

        # Top 10: highest score, then fastest (lowest duration)
        top_10 = qs.order_by('-score_balls', 'duration')[:10]

        return Response(LeaderboardEntrySerializer(top_10, many=True).data)


# ====================== PLAYER PROFILE ======================
class PlayerProfileView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        phone = request.query_params.get("phone_number")

        if phone:
            player, _ = Player.objects.get_or_create(
                phone_number=phone,
                defaults={"name": "Guest"}
            )
            player.last_login = timezone.now()
            player.save()
        elif request.user.is_authenticated:
            player = request.user
        else:
            return Response({"player": None, "history": [], "promos": []})

        history = GameSession.objects.filter(player=player) \
            .order_by('-started_at')[:20] \
            .values('started_at', 'score_balls', 'difficulty', 'duration')

        history_data = [
            {
                "date": h["started_at"],
                "score": h["score_balls"],
                "difficulty": h["difficulty"],
                "duration": h["duration"],
            }
            for h in history
        ]

        from rewards.models import PromoCode
        promos = PromoCode.objects.filter(player=player) \
            .order_by('-claimed_at') \
            .values('code', 'claimed_at')

        promo_data = [{"code": p['code'], "claimed_at": p['claimed_at']} for p in promos]

        return Response({
            "player": PlayerSerializer(player).data,
            "history": history_data,
            "promos": promo_data,
        })

    def patch(self, request):
        if not request.user.is_authenticated:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = PlayerSettingsSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ====================== TOURNAMENT ======================
class TournamentView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        tournaments = Tournament.objects.filter(active=True)
        return Response(TournamentSerializer(tournaments, many=True).data)



def get_difficulty_settings(request):
    """
    API endpoint to fetch all difficulty settings.
    Frontend will use this to get dynamic game parameters.
    """
    settings = DifficultySettings.objects.filter(is_active=True).order_by('order')

    data = []
    for setting in settings:
        data.append({
            'difficulty_level': setting.difficulty_level,
            'names': {
                'en': setting.name_en,
                'uz': setting.name_uz,
                'ru': setting.name_ru,
            },
            'descriptions': {
                'en': setting.description_en,
                'uz': setting.description_uz,
                'ru': setting.description_ru,
            },
            'parameters': {
                'time_seconds': setting.time_seconds,
                'base_points': setting.base_points,
                'level_multiplier': setting.level_multiplier,
                'combo_bonus': setting.combo_bonus_per_match,
                'combo_penalty': setting.combo_penalty_on_wrong,
                'shuffle_enabled': setting.shuffle_enabled,
                'shuffle_frequency': setting.shuffle_frequency,
                'hints_enabled': setting.hints_enabled,
            },
            'visual': {
                'card_color_text': setting.card_color_text,
                'card_color_fruit': setting.card_color_fruit,
            }
        })

    return JsonResponse({
        'success': True,
        'difficulty_settings': data
    })


# Add this to your existing config endpoint (or modify it)
def get_config(request):
    """
    Modified config endpoint that includes difficulty settings
    """
    from .models import GameConfig, FruitCard, TextCard, DifficultySettings

    config = GameConfig.load()

    # Get difficulty settings
    difficulty_settings = DifficultySettings.objects.filter(is_active=True).order_by('order')

    difficulty_data = []
    for setting in difficulty_settings:
        difficulty_data.append({
            'level': setting.difficulty_level,
            'names': {
                'en': setting.name_en,
                'uz': setting.name_uz,
                'ru': setting.name_ru,
            },
            'descriptions': {
                'en': setting.description_en,
                'uz': setting.description_uz,
                'ru': setting.description_ru,
            },
            'time_seconds': setting.time_seconds,
            'base_points': setting.base_points,
            'level_multiplier': setting.level_multiplier,
            'combo_bonus': setting.combo_bonus_per_match,
            'combo_penalty': setting.combo_penalty_on_wrong,
            'shuffle_enabled': setting.shuffle_enabled,
            'shuffle_frequency': setting.shuffle_frequency,
            'hints_enabled': setting.hints_enabled,
            'card_color_text': setting.card_color_text,
            'card_color_fruit': setting.card_color_fruit,
        })

    # Get active cards
    fruits = list(FruitCard.objects.filter(is_active=True).values(
        'id', 'title', 'code', 'image', 'weight'
    ))

    texts = list(TextCard.objects.filter(is_active=True).select_related('correct_fruit').values(
        'id', 'title', 'code', 'image', 'weight', 'correct_fruit__code'
    ))

    # Rename correct_fruit__code to correct_fruit_code
    for text in texts:
        text['correct_fruit_code'] = text.pop('correct_fruit__code')

    return JsonResponse({
        'config': {
            'maintenance_mode': config.maintenance_mode,
            'promo_score_threshold': config.promo_score_threshold,
        },
        'difficulty_settings': difficulty_data,
        'fruit_cards': fruits,
        'text_cards': texts
    })



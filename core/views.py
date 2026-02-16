# core/views.py - COMPLETE FIXED VERSION

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.utils import timezone
from django.contrib.auth import login
from django.db import transaction
import traceback
from .models import (
    GameConfig, FruitCard, TextCard, GameSession,
    Player, Tournament, DifficultySettings
)
from .serializers import (
    GameConfigSerializer, FruitCardSerializer, TextCardSerializer,
    GameSessionStartSerializer, GameSessionFinishSerializer,
    LeaderboardEntrySerializer, PlayerSerializer,
    PlayerSettingsSerializer, TournamentSerializer
)

from django.http import JsonResponse


# ====================== CONFIG (FIXED - RETURNS DIFFICULTY SETTINGS) ======================
class ConfigView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        config = GameConfig.load()
        fruits = FruitCard.objects.filter(is_active=True)
        texts = TextCard.objects.filter(is_active=True)

        # ✅ Get difficulty settings from admin panel
        difficulty_settings = DifficultySettings.objects.filter(is_active=True).order_by('order')

        difficulty_data = []
        for setting in difficulty_settings:
            difficulty_data.append({
                'level': setting.difficulty_level,  # ← KEY FIX: Use 'level' not 'difficulty_level'
                'time_seconds': setting.time_seconds,
                'base_points': setting.base_points,
                'level_multiplier': setting.level_multiplier,
                'combo_bonus': setting.combo_bonus_per_match,
                'combo_penalty': setting.combo_penalty_on_wrong,
                'shuffle_enabled': setting.shuffle_enabled,
                'shuffle_frequency': setting.shuffle_frequency,
                'hints_enabled': setting.hints_enabled,
                'is_active': setting.is_active,
                'order': setting.order,
                'names': {
                    'en': setting.name_en,
                    'uz': setting.name_uz,
                    'ru': setting.name_ru,
                },
                'descriptions': {
                    'en': setting.description_en,
                    'uz': setting.description_uz,
                    'ru': setting.description_ru,
                }
            })

        return Response({
            "config": GameConfigSerializer(config).data,
            "fruit_cards": FruitCardSerializer(fruits, many=True, context={'request': request}).data,
            "text_cards": TextCardSerializer(texts, many=True, context={'request': request}).data,
            "difficulty_settings": difficulty_data,  # ← KEY FIX: Added this line
        })


# ====================== SESSION START ======================
class SessionStartView(APIView):
    permission_classes = [permissions.AllowAny]

    DIFFICULTY_MAP = {
        "easy": 1,
        "medium": 2,
        "hard": 3,
        "ranked": 4,
        "training": 4,
    }

    def post(self, request):
        serializer = GameSessionStartSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        phone = serializer.validated_data["phone_number"]
        name = serializer.validated_data["name"]
        mode = serializer.validated_data.get("mode", "ranked").lower()

        difficulty = self.DIFFICULTY_MAP.get(mode, 4)

        player, created = Player.objects.get_or_create(
            phone_number=phone,
            defaults={"name": name}
        )
        if not created and player.name != name:
            player.name = name

        player.last_login = timezone.now()
        player.save()

        login(request, player, backend='django.contrib.auth.backends.ModelBackend')

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
                player=request.user
            )
        except GameSession.DoesNotExist:
            return Response({"error": "Session not found or not yours"}, status=status.HTTP_404_NOT_FOUND)

        if session.ended_at:
            return Response({"error": "Session already finished"}, status=status.HTTP_400_BAD_REQUEST)

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

    DIFFICULTY_MAP = {
        "easy": 1,
        "medium": 2,
        "hard": 3,
        "ranked": 4,
    }
    DEFAULT_DIFFICULTY = 4

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
            qs = qs.filter(difficulty=self.DEFAULT_DIFFICULTY)

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





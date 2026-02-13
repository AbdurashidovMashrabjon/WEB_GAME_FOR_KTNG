# admin_api/views.py - FINAL COMPLETE WORKING VERSION
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth import authenticate, login, logout
from django.db.models import Count, Avg, Sum, Q, F, Max
from django.utils import timezone
from datetime import timedelta
import json

from core.models import (
    DifficultySettings, GameConfig, FruitCard, TextCard,
    GameSession, Player, Tournament
)
from rewards.models import PromoCode


# Custom permission classes
class IsAdminUser(permissions.BasePermission):
    """Only allow admin users"""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_staff


# ====================== AUTHENTICATION ======================
class AdminLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        phone = request.data.get('phone_number')
        password = request.data.get('password')

        if not phone or not password:
            return Response(
                {'error': 'Phone number and password required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, username=phone, password=password)

        if user and user.is_staff:
            login(request, user)
            return Response({
                'success': True,
                'user': {
                    'name': user.name,
                    'phone': user.phone_number,
                    'is_superuser': user.is_superuser,
                    'permissions': {
                        'can_manage_users': user.is_superuser,
                        'can_manage_content': True,
                        'can_manage_settings': user.is_superuser,
                        'can_view_analytics': True,
                    }
                }
            })

        return Response(
            {'error': 'Invalid credentials or insufficient permissions'},
            status=status.HTTP_401_UNAUTHORIZED
        )


class AdminLogoutView(APIView):
    permission_classes = [permissions.AllowAny]  # Changed from IsAdminUser

    def post(self, request):
        logout(request)
        return Response({'success': True})


class AdminProfileView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        user = request.user
        return Response({
            'name': user.name,
            'phone': user.phone_number,
            'is_superuser': user.is_superuser,
            'permissions': {
                'can_manage_users': user.is_superuser,
                'can_manage_content': True,
                'can_manage_settings': user.is_superuser,
                'can_view_analytics': True,
            }
        })


# ====================== DIFFICULTY SETTINGS ======================
class DifficultySettingsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        """Get all difficulty settings"""
        settings = DifficultySettings.objects.all().order_by('order')
        data = []

        for setting in settings:
            data.append({
                'id': setting.id,
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
                'card_colors': {
                    'text': setting.card_color_text,
                    'fruit': setting.card_color_fruit,
                },
                'is_active': setting.is_active,
                'order': setting.order,
            })

        return Response(data)

    def post(self, request):
        """Create new difficulty setting"""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superusers can create difficulty settings'},
                status=status.HTTP_403_FORBIDDEN
            )

        data = request.data

        # Check if level already exists
        level = int(data.get('level', 1))
        if DifficultySettings.objects.filter(difficulty_level=level).exists():
            return Response(
                {'error': 'Difficulty level already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

        setting = DifficultySettings.objects.create(
            difficulty_level=level,
            name_en=data.get('names', {}).get('en', 'New Level'),
            name_uz=data.get('names', {}).get('uz', 'Yangi Daraja'),
            name_ru=data.get('names', {}).get('ru', 'Новый Уровень'),
            description_en=data.get('descriptions', {}).get('en', ''),
            description_uz=data.get('descriptions', {}).get('uz', ''),
            description_ru=data.get('descriptions', {}).get('ru', ''),
            time_seconds=int(data.get('time_seconds', 180)),
            base_points=int(data.get('base_points', 5)),
            level_multiplier=int(data.get('level_multiplier', 2)),
            combo_bonus_per_match=float(data.get('combo_bonus', 1.5)),
            combo_penalty_on_wrong=float(data.get('combo_penalty', 0.5)),
            shuffle_enabled=bool(data.get('shuffle_enabled', False)),
            shuffle_frequency=int(data.get('shuffle_frequency', 0)),
            hints_enabled=bool(data.get('hints_enabled', True)),
            card_color_text=data.get('card_colors', {}).get('text',
                                                            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'),
            card_color_fruit=data.get('card_colors', {}).get('fruit',
                                                             'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'),
            is_active=bool(data.get('is_active', True)),
            order=int(data.get('order', 0)),
        )

        return Response({'success': True, 'id': setting.id}, status=status.HTTP_201_CREATED)

    def put(self, request, pk):
        """Update difficulty setting"""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superusers can update difficulty settings'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            setting = DifficultySettings.objects.get(pk=pk)
        except DifficultySettings.DoesNotExist:
            return Response({'error': 'Setting not found'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data

        # Update fields with proper type conversion
        if 'names' in data:
            setting.name_en = data['names'].get('en', setting.name_en)
            setting.name_uz = data['names'].get('uz', setting.name_uz)
            setting.name_ru = data['names'].get('ru', setting.name_ru)

        if 'descriptions' in data:
            setting.description_en = data['descriptions'].get('en', setting.description_en)
            setting.description_uz = data['descriptions'].get('uz', setting.description_uz)
            setting.description_ru = data['descriptions'].get('ru', setting.description_ru)

        if 'time_seconds' in data:
            setting.time_seconds = int(data['time_seconds'])
        if 'base_points' in data:
            setting.base_points = int(data['base_points'])
        if 'level_multiplier' in data:
            setting.level_multiplier = int(data['level_multiplier'])
        if 'combo_bonus' in data:
            setting.combo_bonus_per_match = float(data['combo_bonus'])
        if 'combo_penalty' in data:
            setting.combo_penalty_on_wrong = float(data['combo_penalty'])
        if 'shuffle_enabled' in data:
            setting.shuffle_enabled = bool(data['shuffle_enabled'])
        if 'shuffle_frequency' in data:
            setting.shuffle_frequency = int(data['shuffle_frequency'])
        if 'hints_enabled' in data:
            setting.hints_enabled = bool(data['hints_enabled'])

        if 'card_colors' in data:
            setting.card_color_text = data['card_colors'].get('text', setting.card_color_text)
            setting.card_color_fruit = data['card_colors'].get('fruit', setting.card_color_fruit)

        if 'is_active' in data:
            setting.is_active = bool(data['is_active'])
        if 'order' in data:
            setting.order = int(data['order'])

        setting.save()

        return Response({'success': True})

    def delete(self, request, pk):
        """Delete difficulty setting"""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superusers can delete difficulty settings'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            setting = DifficultySettings.objects.get(pk=pk)
            setting.delete()
            return Response({'success': True})
        except DifficultySettings.DoesNotExist:
            return Response({'error': 'Setting not found'}, status=status.HTTP_404_NOT_FOUND)


# ====================== GAME CONFIG ======================
class GameConfigView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        config = GameConfig.load()
        return Response({
            'maintenance_mode': config.maintenance_mode,
            'promo_score_threshold': config.promo_score_threshold,
            'timer_seconds': config.timer_seconds,
            'version': config.config_version,
        })

    def put(self, request):
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superusers can update game config'},
                status=status.HTTP_403_FORBIDDEN
            )

        config = GameConfig.load()

        if 'maintenance_mode' in request.data:
            config.maintenance_mode = bool(request.data['maintenance_mode'])
        if 'promo_score_threshold' in request.data:
            config.promo_score_threshold = int(request.data['promo_score_threshold'])

        config.save()

        return Response({'success': True})


# Helper function to convert string booleans
def parse_bool(value):
    """Convert string 'true'/'false' to boolean"""
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ('true', '1', 'yes')
    return bool(value)


# ====================== CARDS MANAGEMENT ======================
class FruitCardsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        cards = FruitCard.objects.all().order_by('order')
        data = []

        for card in cards:
            data.append({
                'id': card.id,
                'title': card.title,
                'code': card.code,
                'image': request.build_absolute_uri(card.image.url) if card.image else None,
                'is_active': card.is_active,
                'weight': card.weight,
                'order': card.order,
            })

        return Response(data)

    def post(self, request):
        # Handle multipart form data
        data = request.data
        image = request.FILES.get('image')

        # Convert string booleans to actual booleans
        is_active = parse_bool(data.get('is_active', True))

        card = FruitCard.objects.create(
            title=data.get('title'),
            code=data.get('code'),
            image=image,
            is_active=is_active,
            weight=int(data.get('weight', 1)),
            order=int(data.get('order', 0)),
        )

        return Response({'success': True, 'id': card.id}, status=status.HTTP_201_CREATED)

    def put(self, request, pk):
        try:
            card = FruitCard.objects.get(pk=pk)
        except FruitCard.DoesNotExist:
            return Response({'error': 'Card not found'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data

        if 'title' in data:
            card.title = data['title']
        if 'is_active' in data:
            card.is_active = parse_bool(data['is_active'])
        if 'weight' in data:
            card.weight = int(data['weight'])
        if 'order' in data:
            card.order = int(data['order'])

        # Handle image upload
        if 'image' in request.FILES:
            card.image = request.FILES['image']

        card.save()

        return Response({'success': True})

    def delete(self, request, pk):
        try:
            card = FruitCard.objects.get(pk=pk)
            card.delete()
            return Response({'success': True})
        except FruitCard.DoesNotExist:
            return Response({'error': 'Card not found'}, status=status.HTTP_404_NOT_FOUND)


class TextCardsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        cards = TextCard.objects.all().select_related('correct_fruit').order_by('order')
        data = []

        for card in cards:
            data.append({
                'id': card.id,
                'title': card.title,
                'code': card.code,
                'image': request.build_absolute_uri(card.image.url) if card.image else None,
                'correct_fruit': {
                    'id': card.correct_fruit.id,
                    'code': card.correct_fruit.code,
                    'title': card.correct_fruit.title,
                } if card.correct_fruit else None,
                'is_active': card.is_active,
                'weight': card.weight,
                'order': card.order,
            })

        return Response(data)

    def post(self, request):
        data = request.data

        # Get fruit
        fruit = None
        fruit_id = data.get('correct_fruit_id')
        if fruit_id and fruit_id != 'null' and fruit_id != '':
            try:
                fruit = FruitCard.objects.get(pk=int(fruit_id))
            except (FruitCard.DoesNotExist, ValueError):
                return Response({'error': 'Fruit card not found'}, status=status.HTTP_400_BAD_REQUEST)

        # Handle image upload
        image = request.FILES.get('image')

        # Convert string boolean
        is_active = parse_bool(data.get('is_active', True))

        card = TextCard.objects.create(
            title=data.get('title'),
            code=data.get('code'),
            image=image,
            correct_fruit=fruit,
            is_active=is_active,
            weight=int(data.get('weight', 1)),
            order=int(data.get('order', 0)),
        )

        return Response({'success': True, 'id': card.id}, status=status.HTTP_201_CREATED)

    def put(self, request, pk):
        try:
            card = TextCard.objects.get(pk=pk)
        except TextCard.DoesNotExist:
            return Response({'error': 'Card not found'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data

        if 'title' in data:
            card.title = data['title']
        if 'is_active' in data:
            card.is_active = parse_bool(data['is_active'])
        if 'weight' in data:
            card.weight = int(data['weight'])
        if 'order' in data:
            card.order = int(data['order'])

        # Update fruit
        if 'correct_fruit_id' in data:
            fruit_id = data['correct_fruit_id']
            if fruit_id and fruit_id != 'null' and fruit_id != '':
                try:
                    card.correct_fruit = FruitCard.objects.get(pk=int(fruit_id))
                except (FruitCard.DoesNotExist, ValueError):
                    return Response({'error': 'Fruit card not found'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                card.correct_fruit = None

        # Handle image upload
        if 'image' in request.FILES:
            card.image = request.FILES['image']

        card.save()

        return Response({'success': True})

    def delete(self, request, pk):
        try:
            card = TextCard.objects.get(pk=pk)
            card.delete()
            return Response({'success': True})
        except TextCard.DoesNotExist:
            return Response({'error': 'Card not found'}, status=status.HTTP_404_NOT_FOUND)


# ====================== ANALYTICS ======================
class AnalyticsOverviewView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)

        total_players = Player.objects.count()
        total_sessions = GameSession.objects.count()
        active_sessions = GameSession.objects.filter(started_at__gte=start_date).count()

        total_promos = PromoCode.objects.count()
        claimed_promos = PromoCode.objects.filter(is_used=True).count()

        difficulty_stats = []
        for level in [1, 2, 3]:
            stats = GameSession.objects.filter(
                difficulty=level,
                ended_at__isnull=False
            ).aggregate(
                avg_score=Avg('score_balls'),
                total_games=Count('id'),
                avg_duration=Avg('duration'),
            )

            difficulty_stats.append({
                'level': level,
                'avg_score': round(stats['avg_score'] or 0, 2),
                'total_games': stats['total_games'],
                'avg_duration': round(stats['avg_duration'] or 0, 2),
            })

        daily_data = []
        for i in range(days):
            date = timezone.now().date() - timedelta(days=i)
            count = GameSession.objects.filter(
                started_at__date=date
            ).count()
            daily_data.append({
                'date': str(date),
                'sessions': count,
            })
        daily_data.reverse()

        return Response({
            'overview': {
                'total_players': total_players,
                'total_sessions': total_sessions,
                'active_sessions_period': active_sessions,
                'total_promos': total_promos,
                'claimed_promos': claimed_promos,
                'claim_rate': round((claimed_promos / total_promos * 100) if total_promos > 0 else 0, 2),
            },
            'difficulty_stats': difficulty_stats,
            'daily_sessions': daily_data,
        })


class PlayerAnalyticsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        top_players = Player.objects.annotate(
            total_games=Count('sessions'),
            best_score=Max('sessions__score_balls'),
            avg_score=Avg('sessions__score_balls'),
        ).order_by('-best_score')[:20]

        data = []
        for player in top_players:
            data.append({
                'id': player.id,
                'name': player.name,
                'phone': player.phone_number,
                'total_games': player.total_games,
                'best_score': player.best_score or 0,
                'avg_score': round(player.avg_score or 0, 2),
                'created_at': player.created_at,
            })

        return Response(data)


# ====================== PLAYER MANAGEMENT ======================
class PlayersManagementView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        search = request.query_params.get('search', '')
        page = int(request.query_params.get('page', 1))
        per_page = int(request.query_params.get('per_page', 20))

        players = Player.objects.all()

        if search:
            players = players.filter(
                Q(name__icontains=search) | Q(phone_number__icontains=search)
            )

        total = players.count()
        players = players.annotate(
            total_games=Count('sessions'),
            best_score=Max('sessions__score_balls'),
        ).order_by('-created_at')[(page - 1) * per_page:page * per_page]

        data = []
        for player in players:
            data.append({
                'id': player.id,
                'name': player.name,
                'phone': player.phone_number,
                'total_games': player.total_games,
                'best_score': player.best_score or 0,
                'is_staff': player.is_staff,
                'created_at': player.created_at,
            })

        return Response({
            'players': data,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page,
        })

    def put(self, request, pk):
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superusers can manage players'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            player = Player.objects.get(pk=pk)
        except Player.DoesNotExist:
            return Response({'error': 'Player not found'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data

        if 'is_active' in data:
            player.is_active = parse_bool(data['is_active'])

        if 'is_staff' in data:
            player.is_staff = parse_bool(data['is_staff'])

        player.save()

        return Response({'success': True})


# ====================== PROMO CODES ======================
class PromoCodesView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        codes = PromoCode.objects.all().select_related('player').order_by('-created_at')

        data = []
        for code in codes:
            data.append({
                'id': code.id,
                'code': code.code,
                'is_used': code.is_used,
                'player': {
                    'id': code.player.id,
                    'name': code.player.name,
                } if code.player else None,
                'claimed_at': code.claimed_at,
                'created_at': code.created_at,
            })

        return Response(data)

    def post(self, request):
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superusers can generate promo codes'},
                status=status.HTTP_403_FORBIDDEN
            )

        count = int(request.data.get('count', 1))
        codes = []

        import random
        import string

        for _ in range(count):
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            promo = PromoCode.objects.create(code=code)
            codes.append({
                'id': promo.id,
                'code': promo.code,
            })

        return Response({
            'success': True,
            'codes': codes,
        }, status=status.HTTP_201_CREATED)


# ====================== PREVIEW ======================
class PreviewGameSettingsView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        settings = request.data

        example_matches = 8
        example_time = int(settings.get('time_seconds', 180))
        base_points = int(settings.get('base_points', 5))
        multiplier = int(settings.get('level_multiplier', 2))
        combo_bonus = float(settings.get('combo_bonus', 1.5))

        total_score = 0
        for i in range(example_matches):
            combo = i + 1
            points = base_points + multiplier + int(combo * combo_bonus)
            total_score += points

        return Response({
            'preview': {
                'total_score_perfect': total_score,
                'average_points_per_match': round(total_score / example_matches, 2),
                'time_per_match': round(example_time / example_matches, 2),
                'estimated_difficulty': 'Easy' if base_points < 10 else 'Medium' if base_points < 20 else 'Hard',
            }
        })
from rest_framework import serializers
from .models import (
    GameConfig,
    FruitCard,
    TextCard,
    GameSession,
    Player,
    Tournament,
)
import re


# =========================
# HELPERS
# =========================
def validate_uz_phone(value):
    """Validate Uzbekistan phone number format: +998 followed by 9 digits"""
    if not re.match(r'^\+998\d{9}$', value):
        raise serializers.ValidationError(
            "Phone number must be in format +998XXXXXXXXX"
        )
    return value


# =========================
# CARDS
# =========================
class FruitCardSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = FruitCard
        fields = [
            'id',
            'code',           # assuming your model has a code or name field
            'image',
            'is_active',
            'order',          # adjust these fields based on your actual FruitCard model
            # Add any other fields like 'name', 'weight', etc. if they exist
        ]

    def get_image(self, obj):
        """Return full absolute URL for the image"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class TextCardSerializer(serializers.ModelSerializer):
    correct_fruit_code = serializers.CharField(
        source='correct_fruit.code',
        read_only=True
    )
    image = serializers.SerializerMethodField()

    class Meta:
        model = TextCard
        fields = [
            'id',
            'code',
            'title',
            'image',
            'weight',
            'order',
            'correct_fruit_code',
            # Add 'is_active' if it exists
        ]

    def get_image(self, obj):
        """Return full absolute URL for the image"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


# =========================
# GAME CONFIG
# =========================
class GameConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameConfig
        fields = '__all__'  # Safe here: no manually declared fields


# =========================
# PLAYER
# =========================
class PlayerSerializer(serializers.ModelSerializer):
    """Full player info for responses"""

    class Meta:
        model = Player
        fields = [
            'name',
            'phone_number',
            'theme',
            'language',
            'created_at',
            'last_login'
        ]
        read_only_fields = ['created_at', 'last_login']


class PlayerSettingsSerializer(serializers.ModelSerializer):
    """For updating player preferences only"""

    class Meta:
        model = Player
        fields = ['theme', 'language']


# =========================
# GAME SESSIONS
# =========================
class GameSessionStartSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    phone_number = serializers.CharField(validators=[validate_uz_phone])
    mode = serializers.ChoiceField(
        choices=['ranked', 'training'],
        default='ranked'
    )


class GameSessionFinishSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
    score_balls = serializers.IntegerField(min_value=0)
    duration = serializers.FloatField(min_value=0)
    correct_count = serializers.IntegerField(min_value=0, required=False, default=0)
    wrong_count = serializers.IntegerField(min_value=0, required=False, default=0)
    best_combo = serializers.IntegerField(min_value=0, required=False, default=0)
    log_json = serializers.JSONField(required=False)


class LeaderboardEntrySerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='player.name', read_only=True)
    phone_number = serializers.CharField(source='player.phone_number', read_only=True)
    # Optional: format dates nicely
    started_at = serializers.DateTimeField(format='%Y-%m-%d %H:%M', read_only=True)

    class Meta:
        model = GameSession
        fields = [
            'session_id',
            'name',                  # player's name
            'phone_number',          # optional: hide if privacy concern
            'score_balls',
            'duration',
            'correct_count',
            'wrong_count',
            'best_combo',
            'started_at',
            'ended_at',
            'difficulty',
        ]
        # Do NOT use '__all__' when you have custom fields like 'name'


# =========================
# TOURNAMENT
# =========================
class TournamentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tournament
        fields = ['id', 'active', 'prize_pool', 'created_at', 'name', 'start_date', 'end_date']
        # Add any other fields your Tournament model has
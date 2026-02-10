# core/models.py
from django.db import models
from django.core.validators import MinValueValidator
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
import uuid
import re
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _
from django.utils import timezone


# =====================================================
# GameConfig
# =====================================================
class GameConfig(models.Model):
    """
    Singleton model for game configuration.
    Only one instance should exist.
    """
    config_version = models.PositiveIntegerField(default=1, editable=False)
    maintenance_mode = models.BooleanField(
        default=False,
        help_text=_("Enable to put the game in maintenance mode")
    )
    timer_seconds = models.PositiveIntegerField(
        default=60,
        help_text=_("Game duration in seconds"),
        validators=[MinValueValidator(10)]
    )
    promo_score_threshold = models.PositiveIntegerField(
        default=100,
        help_text=_("Score required to earn a promo code"),
        validators=[MinValueValidator(1)]
    )

    class Meta:
        verbose_name = _("Game Configuration")
        verbose_name_plural = _("Game Configuration")

    def save(self, *args, **kwargs):
        self.pk = 1
        if self.pk and GameConfig.objects.filter(pk=1).exists():
            self.config_version = GameConfig.objects.get(pk=1).config_version + 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Config v{self.config_version}"

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

# =====================================================
# FruitCard
# =====================================================
class FruitCard(models.Model):
    title = models.CharField(max_length=100)
    image = models.ImageField(upload_to='fruits/', blank=True, null=True)
    code = models.CharField(max_length=50, unique=True)
    is_active = models.BooleanField(default=True)
    weight = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'title']
        indexes = [
            models.Index(fields=['is_active', 'weight']),
            models.Index(fields=['order']),
        ]

    def __str__(self):
        return self.title

# =====================================================
# TextCard
# =====================================================
class TextCard(models.Model):
    title = models.CharField(max_length=100)
    image = models.ImageField(upload_to='texts/', blank=True, null=True)
    correct_fruit = models.ForeignKey(
        FruitCard,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='text_cards'
    )
    code = models.CharField(max_length=50, unique=True)
    is_active = models.BooleanField(default=True)
    weight = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'title']
        indexes = [
            models.Index(fields=['is_active', 'weight']),
            models.Index(fields=['correct_fruit']),
            models.Index(fields=['order']),
        ]

    def __str__(self):
        return self.title

# =====================================================
# Player (Custom User Model)
# =====================================================
def uzbek_phone_validator(value):
    pattern = r'^\+998\d{9}$'
    if not re.match(pattern, value):
        raise ValidationError(_("Phone number must be in format +998XXXXXXXXX"))

class PlayerManager(BaseUserManager):
    def create_user(self, phone_number, name, password=None, **extra_fields):
        if not phone_number:
            raise ValueError('The Phone Number must be set')
        player = self.model(phone_number=phone_number, name=name, **extra_fields)
        if password:
            player.set_password(password)
        else:
            player.set_unusable_password()
        player.save(using=self._db)
        return player

    def create_superuser(self, phone_number, name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(phone_number, name, password, **extra_fields)

class Player(AbstractBaseUser, PermissionsMixin):
    THEME_CHOICES = [('light', _('Light')), ('dark', _('Dark'))]
    LANGUAGE_CHOICES = [('en', _('English')), ('uz', _('Uzbek')), ('ru', _('Russian'))]

    name = models.CharField(max_length=100, verbose_name=_("Name"))
    phone_number = models.CharField(
        max_length=13,
        unique=True,
        validators=[uzbek_phone_validator],
        db_index=True,
        verbose_name=_("Phone Number")
    )
    theme = models.CharField(max_length=20, default='dark', choices=THEME_CHOICES)
    language = models.CharField(max_length=10, default='en', choices=LANGUAGE_CHOICES)
    
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)

    objects = PlayerManager()

    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = ['name']

    class Meta:
        verbose_name = _("Player")
        verbose_name_plural = _("Players")
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.phone_number})"

    def get_total_sessions(self):
        return self.sessions.count()

    def get_best_score(self):
        best = self.sessions.order_by('-score_balls').first()
        return best.score_balls if best else 0

# =====================================================
# GameSession
# =====================================================
class GameSession(models.Model):
    # Removed Mode choices, defaults to Ranked behavior
    DIFFICULTY_CHOICES = [(1, _('Easy')), (2, _('Medium')), (3, _('Hard'))]
    ANTI_CHEAT_STATUS_CHOICES = [
        ('clean', _('Clean')), ('ok', _('OK')),
        ('suspicious', _('Suspicious')), ('flagged', _('Flagged')), ('rejected', _('Rejected')),
    ]

    session_id = models.CharField(max_length=100, unique=True, editable=False)
    player = models.ForeignKey(
        Player, on_delete=models.CASCADE, null=True, blank=True,
        related_name='sessions'
    )
    user_identifier = models.CharField(max_length=100, blank=True, null=True)
    # Mode is now always implied to be ranked/standard
    difficulty = models.IntegerField(choices=DIFFICULTY_CHOICES, default=1)
    score_balls = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    correct_count = models.IntegerField(default=0)
    wrong_count = models.IntegerField(default=0)
    best_combo = models.IntegerField(default=0)
    anti_cheat_status = models.CharField(
        max_length=50, choices=ANTI_CHEAT_STATUS_CHOICES, default='clean'
    )
    log_json = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['-score_balls']),
            models.Index(fields=['-started_at']),
        ]

    def save(self, *args, **kwargs):
        if not self.session_id:
            self.session_id = str(uuid.uuid4())
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Session {str(self.session_id)[:8]}... — {self.score_balls} pts"

# =====================================================
# Tournament
# =====================================================
class Tournament(models.Model):
    active = models.BooleanField(default=True)
    prize_pool = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Tournament ({'Active' if self.active else 'Inactive'}) - {self.prize_pool}"




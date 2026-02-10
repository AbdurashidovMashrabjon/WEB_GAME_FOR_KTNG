# core/admin.py
from django.contrib import admin
from django.db.models import Count, Max, Sum, Avg
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.contrib import messages
from django.http import HttpResponse
from django.urls import reverse
from django.utils import timezone
import csv
import json
from .models import GameConfig, FruitCard, TextCard, Player, GameSession, Tournament



# =====================================================
# Custom Filters
# =====================================================
class DifficultyFilter(admin.SimpleListFilter):
    title = 'Difficulty'
    parameter_name = 'difficulty'

    def lookups(self, request, model_admin):
        return (
            ('1', 'Easy'),
            ('2', 'Medium'),
            ('3', 'Hard'),
            ('4', 'Ranked'),
        )

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(difficulty=self.value())
        return queryset


# =====================================================
# GameConfig - Singleton
# =====================================================
@admin.register(GameConfig)
class GameConfigAdmin(admin.ModelAdmin):
    list_display = ('config_version', 'maintenance_mode', 'timer_seconds', 'promo_score_threshold', 'status_badge')
    readonly_fields = ('config_version',)  # Removed 'updated_at' - field doesn't exist
    fieldsets = (
        ('General Settings', {
            'fields': ('maintenance_mode', 'timer_seconds', 'promo_score_threshold')
        }),
        ('Info', {
            'fields': ('config_version',),
            'description': '<p style="color:#666;font-style:italic">Version increments automatically on save.</p>'
        }),
    )

    def status_badge(self, obj):
        if obj.maintenance_mode:
            return mark_safe(
                '<span style="background:#dc3545;color:white;padding:6px 14px;border-radius:12px;font-weight:600;">'
                'MAINTENANCE</span>'
            )
        return mark_safe(
            '<span style="background:#28a745;color:white;padding:6px 14px;border-radius:12px;font-weight:600;">'
            'ACTIVE</span>'
        )
    status_badge.short_description = 'Status'

    def has_add_permission(self, request):
        return not GameConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    def save_model(self, request, obj, form, change):
        if change:
            obj.config_version += 1
        super().save_model(request, obj, form, change)
        messages.success(request, 'Game configuration updated successfully!')


# =====================================================
# FruitCard
# =====================================================
@admin.register(FruitCard)
class FruitCardAdmin(admin.ModelAdmin):
    list_display = ('title', 'code', 'image_preview', 'is_active', 'weight', 'order', 'text_cards_count')
    list_filter = ('is_active', 'weight')
    search_fields = ('title', 'code')
    list_editable = ('is_active', 'weight', 'order')
    ordering = ('order', 'title')
    actions = ['activate_selected', 'deactivate_selected']

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(text_cards_total=Count('text_cards'))

    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="width:60px;height:60px;object-fit:cover;border-radius:10px;border:2px solid #e2e8f0;" />',
                obj.image.url
            )
        return mark_safe('<span style="color:#aaa;font-style:italic">No image</span>')
    image_preview.short_description = 'Image'

    def text_cards_count(self, obj):
        count = getattr(obj, 'text_cards_total', 0)
        url = reverse('admin:core_textcard_changelist') + f'?correct_fruit__id__exact={obj.id}'
        if count == 0:
            return format_html('<a href="{}" style="color:#dc3545;font-weight:600">0</a>', url)
        return format_html('<a href="{}" style="color:#28a745;font-weight:600">{}</a>', url, count)
    text_cards_count.short_description = 'Text Cards'

    def activate_selected(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} fruit card(s) activated.', messages.SUCCESS)
    activate_selected.short_description = 'Activate selected'

    def deactivate_selected(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} fruit card(s) deactivated.', messages.WARNING)
    deactivate_selected.short_description = 'Deactivate selected'


# =====================================================
# TextCard
# =====================================================
@admin.register(TextCard)
class TextCardAdmin(admin.ModelAdmin):
    list_display = ('title', 'code', 'correct_fruit', 'image_preview', 'is_active', 'weight', 'order')
    list_filter = ('is_active', 'correct_fruit', 'weight')
    search_fields = ('title', 'code', 'correct_fruit__title')
    list_editable = ('is_active', 'weight', 'order')
    ordering = ('order', 'title')
    actions = ['activate_selected', 'deactivate_selected']
    raw_id_fields = ('correct_fruit',)

    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="width:60px;height:60px;object-fit:cover;border-radius:10px;border:2px solid #e2e8f0;" />',
                obj.image.url
            )
        return mark_safe('<span style="color:#aaa;font-style:italic">No image</span>')
    image_preview.short_description = 'Image'

    def activate_selected(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} text card(s) activated.', messages.SUCCESS)

    def deactivate_selected(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} text card(s) deactivated.', messages.WARNING)


# =====================================================
# Inlines
# =====================================================
class GameSessionInline(admin.TabularInline):
    model = GameSession
    fields = ('session_link', 'difficulty_badge', 'score_balls', 'duration_display', 'started_at')
    readonly_fields = fields
    ordering = ('-started_at',)
    extra = 0
    can_delete = False
    max_num = 20

    def session_link(self, obj):
        if obj.pk:
            url = reverse('admin:core_gamesession_change', args=[obj.pk])
            return format_html('<a href="{}" target="_blank"><code>{}</code></a>', url, str(obj.session_id)[:12] + '...')
        return '-'
    session_link.short_description = 'Session'

    def difficulty_badge(self, obj):
        colors = {1: '#28a745', 2: '#ffc107', 3: '#dc3545', 4: '#9c27b0'}
        labels = {1: 'Easy', 2: 'Medium', 3: 'Hard', 4: 'Ranked'}
        color = colors.get(obj.difficulty, '#6c757d')
        label = labels.get(obj.difficulty, 'Unknown')
        return mark_safe(f'<span style="background:{color};color:white;padding:4px 10px;border-radius:8px;font-size:11px;">{label}</span>')
    difficulty_badge.short_description = 'Mode'

    def duration_display(self, obj):
        if obj.duration:
            m, s = divmod(int(obj.duration), 60)
            return f"{m}m {s:02d}s"
        return '-'
    duration_display.short_description = 'Time'


# =====================================================
# Player Admin
# =====================================================
@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone_number', 'theme', 'language', 'total_sessions', 'best_score_display', 'total_playtime', 'last_login')
    list_filter = ('theme', 'language', 'created_at', 'last_login')
    search_fields = ('name', 'phone_number')
    readonly_fields = ('created_at', 'last_login', 'stats_summary')
    inlines = [GameSessionInline]
    date_hierarchy = 'created_at'
    actions = ['export_as_csv']

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            total_sessions=Count('sessions'),
            best_score=Max('sessions__score_balls'),
            total_duration=Sum('sessions__duration')
        )

    def total_sessions(self, obj):
        return obj.total_sessions or 0
    total_sessions.short_description = 'Sessions'

    def best_score_display(self, obj):
        score = obj.best_score or 0
        if score > 0:
            return mark_safe(f'<strong style="color:#f59e0b;font-size:1.1em">🏆 {score}</strong>')
        return '—'
    best_score_display.short_description = 'Best Score'

    def total_playtime(self, obj):
        seconds = obj.total_duration or 0
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        if hours > 0:
            return f"{hours}h {minutes}m"
        return f"{minutes}m"
    total_playtime.short_description = 'Playtime'

    def stats_summary(self, obj):
        sessions = obj.sessions.all()[:100]
        if not sessions:
            return mark_safe('<p><em>No games played yet.</em></p>')

        stats = sessions.aggregate(
            total=Count('id'),
            best=Max('score_balls'),
            avg=Avg('score_balls'),
            total_time=Sum('duration')
        )

        hours = int(stats['total_time'] or 0) // 3600
        mins = (int(stats['total_time'] or 0) % 3600) // 60

        html = f"""
        <div style="background:#f8f9fa;padding:18px;border-radius:12px;border-left:4px solid #007bff;">
            <h4 style="margin-top:0;color:#007bff">Player Statistics</h4>
            <ul style="margin:10px 0;padding-left:20px;">
                <li><strong>Sessions Played:</strong> {stats['total']}</li>
                <li><strong>Best Score:</strong> <span style="color:#f59e0b;font-weight:bold">🏆 {stats['best'] or 0}</span></li>
                <li><strong>Average Score:</strong> {round(stats['avg'] or 0, 1)}</li>
                <li><strong>Total Playtime:</strong> {hours}h {mins}m</li>
            </ul>
        </div>
        """
        return mark_safe(html)
    stats_summary.short_description = 'Summary'

    def export_as_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="players_{timezone.now().strftime("%Y%m%d")}.csv"'
        writer = csv.writer(response)
        writer.writerow(['Name', 'Phone', 'Theme', 'Language', 'Sessions', 'Best Score', 'Playtime (sec)', 'Created', 'Last Login'])
        for player in queryset:
            writer.writerow([
                player.name,
                player.phone_number,
                player.theme,
                player.language,
                player.total_sessions or 0,
                player.best_score or 0,
                player.total_duration or 0,
                player.created_at,
                player.last_login or '-'
            ])
        return response
    export_as_csv.short_description = 'Export Selected as CSV'


# =====================================================
# GameSession Admin
# =====================================================
@admin.register(GameSession)
class GameSessionAdmin(admin.ModelAdmin):
    list_display = ('session_short', 'player_link', 'difficulty_badge', 'score_display', 'duration_display', 'started_at', 'anti_cheat_status')
    list_filter = (DifficultyFilter, 'anti_cheat_status', 'started_at', 'ended_at')
    search_fields = ('session_id', 'player__name', 'player__phone_number')
    readonly_fields = ('session_id', 'player', 'started_at', 'ended_at', 'log_json_pretty')
    date_hierarchy = 'started_at'
    actions = ['export_as_csv']
    list_per_page = 50

    def session_short(self, obj):
        return format_html('<code style="font-size:11px">{}</code>', str(obj.session_id)[:16] + '...')
    session_short.short_description = 'Session ID'

    def player_link(self, obj):
        if obj.player:
            url = reverse('admin:core_player_change', args=[obj.player.pk])
            return format_html('<a href="{}"><strong>{}</strong><br><small>{}</small></a>', url, obj.player.name, obj.player.phone_number)
        return '-'
    player_link.short_description = 'Player'

    def difficulty_badge(self, obj):
        colors = {1: '#28a745', 2: '#ffc107', 3: '#dc3545', 4: '#9c27b0'}
        labels = {1: 'Easy', 2: 'Medium', 3: 'Hard', 4: 'Ranked'}
        color = colors.get(obj.difficulty, '#6c757d')
        label = labels.get(obj.difficulty, '?')
        return mark_safe(f'<span style="background:{color};color:white;padding:5px 12px;border-radius:10px;font-weight:600">{label}</span>')
    difficulty_badge.short_description = 'Mode'

    def score_display(self, obj):
        return format_html('<strong style="font-size:1.2em;color:#007bff">{}</strong>', obj.score_balls)
    score_display.short_description = 'Score'

    def duration_display(self, obj):
        if obj.duration:
            m, s = divmod(int(obj.duration), 60)
            return f"{m}:{s:02d}"
        return '-'
    duration_display.short_description = 'Time'

    def log_json_pretty(self, obj):
        if obj.log_json:
            try:
                pretty = json.dumps(obj.log_json, indent=2, ensure_ascii=False)
                return format_html(
                    '<pre style="background:#f8f9fa;padding:15px;border-radius:8px;font-size:12px;max-height:500px;overflow:auto;border:1px solid #ddd;">{}</pre>',
                    pretty
                )
            except:
                return 'Invalid JSON'
        return '-'
    log_json_pretty.short_description = 'Game Log (JSON)'

    def export_as_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="sessions_{timezone.now().strftime("%Y%m%d_%H%M")}.csv"'
        writer = csv.writer(response)
        writer.writerow(['Session ID', 'Player Name', 'Phone', 'Mode', 'Score', 'Duration (s)', 'Started At', 'Anti-Cheat'])
        for session in queryset.select_related('player'):
            writer.writerow([
                session.session_id,
                session.player.name if session.player else '-',
                session.player.phone_number if session.player else '-',
                session.get_difficulty_display(),
                session.score_balls,
                session.duration or 0,
                session.started_at,
                session.anti_cheat_status
            ])
        return response
    export_as_csv.short_description = 'Export Selected as CSV'

    def has_add_permission(self, request):
        return False


# =====================================================
# Tournament - Fixed to match your actual model
# =====================================================
@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    list_display = ('id', 'prize_pool', 'active', 'created_at')  # Only existing fields
    list_filter = ('active', 'created_at')
    search_fields = ('prize_pool',)
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)

    fieldsets = (
        ('Tournament Details', {
            'fields': ('prize_pool', 'active')
        }),
        ('Metadata', {
            'fields': ('created_at',),
        }),
    )





# =====================================================
# Admin Site Branding
# =====================================================
admin.site.site_header = 'Fruit Match Game - Admin Panel'
admin.site.site_title = 'Fruit Game Admin'
admin.site.index_title = 'Welcome to Game Management Dashboard'





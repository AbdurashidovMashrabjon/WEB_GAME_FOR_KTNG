from django.db import models
from core.models import Player


class PromoCode(models.Model):
    code = models.CharField(max_length=20, unique=True)
    is_used = models.BooleanField(default=False)
    player = models.ForeignKey(Player, on_delete=models.SET_NULL, null=True, blank=True)
    claimed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.code
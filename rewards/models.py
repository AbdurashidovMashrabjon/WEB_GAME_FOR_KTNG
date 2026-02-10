from django.db import models
from django.conf import settings

class PromoCode(models.Model):
    """
    Pool of unique promo codes to be distributed to players.
    """
    code = models.CharField(max_length=50, unique=True)
    is_used = models.BooleanField(default=False)
    player = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='promo_codes'
    )
    claimed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        status = "Used" if self.is_used else "Available"
        return f"{self.code} ({status})"

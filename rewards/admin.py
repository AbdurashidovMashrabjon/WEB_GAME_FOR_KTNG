from django.contrib import admin
from django.shortcuts import render, redirect
from django.urls import path
from django.contrib import messages
from django.http import HttpResponseRedirect
from django.utils.html import format_html
import csv
import io

from .models import PromoCode

@admin.register(PromoCode)
class PromoCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'status_badge', 'player', 'claimed_at', 'created_at')
    list_filter = ('is_used', 'created_at')
    search_fields = ('code', 'player__name', 'player__phone_number')
    readonly_fields = ('claimed_at', 'player')
    
    change_list_template = "admin/rewards/promocode/change_list.html"

    def status_badge(self, obj):
        if obj.is_used:
            return format_html(
                '<span style="background:#dc3545;color:white;padding:3px 10px;border-radius:10px;font-size:12px;">{}</span>',
                "Used"
            )
        return format_html(
            '<span style="background:#28a745;color:white;padding:3px 10px;border-radius:10px;font-size:12px;">{}</span>',
            "Available"
        )

    status_badge.short_description = "Status"

    def get_urls(self):
        urls = super().get_urls()
        my_urls = [
            path('import-csv/', self.import_csv),
        ]
        return my_urls + urls

    def import_csv(self, request):
        if request.method == "POST":
            csv_file = request.FILES["csv_file"]
            decoded_file = csv_file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.reader(io_string)
            
            created_count = 0
            existing_count = 0
            
            for row in reader:
                if not row: continue
                code = row[0].strip()
                if not code: continue
                
                if PromoCode.objects.filter(code=code).exists():
                    existing_count += 1
                else:
                    PromoCode.objects.create(code=code)
                    created_count += 1
            
            self.message_user(request, f"Imported {created_count} new codes. Skipped {existing_count} duplicates.")
            return HttpResponseRedirect("../")
            
        return redirect("..")










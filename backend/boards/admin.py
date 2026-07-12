from django.contrib import admin

from .models import Board, BoardMembership, Card, Column


class ColumnInline(admin.TabularInline):
    model = Column
    extra = 0


@admin.register(Board)
class BoardAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "owner", "created_at")
    inlines = [ColumnInline]


@admin.register(Column)
class ColumnAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "board", "position")
    list_filter = ("board",)


@admin.register(Card)
class CardAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "column", "position")
    list_filter = ("column__board",)


admin.site.register(BoardMembership)

"""
Common serializers used across the backend application.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class BaseUserSerializer(serializers.ModelSerializer):
    """
    Base serializer for user representation in API responses.
    Provides consistent user data format across all apps.
    """

    user_id = serializers.IntegerField(source="pk", read_only=True)
    name = serializers.CharField(source="username", read_only=True)
    email = serializers.EmailField(read_only=True)
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["user_id", "name", "email", "profile_picture"]
        read_only_fields = fields

    def get_profile_picture(self, obj):
        """Return the profile picture URL or None."""
        return obj.profile_picture.url if obj.profile_picture else None

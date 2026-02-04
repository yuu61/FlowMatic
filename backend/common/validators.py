"""
Common validators used across the backend application.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


def validate_unique_user_ids(user_ids, field_name="user_ids"):
    """
    Validate that user IDs are unique.

    Args:
        user_ids: List of user IDs to validate
        field_name: Name of the field for error messages

    Returns:
        List of unique user IDs

    Raises:
        serializers.ValidationError: If duplicate IDs found
    """
    if not user_ids:
        return []

    seen = set()
    unique_ids = []
    for uid in user_ids:
        if uid in seen:
            raise serializers.ValidationError({field_name: f"Duplicate user ID: {uid}"})
        seen.add(uid)
        unique_ids.append(uid)
    return unique_ids


def validate_users_exist(user_ids):
    """
    Validate that all user IDs correspond to existing users.

    Args:
        user_ids: List of user IDs to validate

    Returns:
        List of User objects

    Raises:
        serializers.ValidationError: If any user doesn't exist
    """
    if not user_ids:
        return []

    users = list(User.objects.filter(pk__in=user_ids))
    if len(users) != len(user_ids):
        found_ids = {u.pk for u in users}
        missing = [uid for uid in user_ids if uid not in found_ids]
        raise serializers.ValidationError({"user_ids": f"Users not found: {missing}"})
    return users


def validate_users_in_project(user_ids, project, field_name="assigned_user_ids"):
    """
    Validate that all users are members of the specified project.

    Args:
        user_ids: List of user IDs to validate
        project: Project instance to check membership against
        field_name: Name of the field for error messages

    Raises:
        serializers.ValidationError: If any user is not a project member
    """
    if not user_ids:
        return

    member_ids = set(
        project.members.filter(pk__in=user_ids).values_list("pk", flat=True)
    )
    if member_ids != set(user_ids):
        not_members = [uid for uid in user_ids if uid not in member_ids]
        raise serializers.ValidationError({
            field_name: f"Users not in project: {not_members}"
        })


def validate_date_range(
    start_date, end_date, start_field="start_date", end_field="end_date"
):
    """
    Validate that end_date is not before start_date.

    Args:
        start_date: Start date
        end_date: End date
        start_field: Field name for start date (for error messages)
        end_field: Field name for end date (for error messages)

    Raises:
        serializers.ValidationError: If end_date is before start_date
    """
    if start_date and end_date and end_date < start_date:
        raise serializers.ValidationError({
            end_field: f"{end_field} cannot be before {start_field}."
        })

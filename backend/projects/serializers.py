from django.contrib.auth import get_user_model
from rest_framework import serializers

from common.constants import TASK_STATUS_DONE
from common.serializers import BaseUserSerializer

from .models import Project

User = get_user_model()

# Alias for backward compatibility
MemberSerializer = BaseUserSerializer


class ProjectProgressMixin:
    """Mixin providing get_progress method for project serializers.

    Note: For optimal performance, use prefetch_related('tasks') on the queryset
    when serializing multiple projects to avoid N+1 queries.
    """

    def get_progress(self, obj):
        """Calculate project progress as percentage of completed tasks.

        If tasks are prefetched, uses the cached data to avoid additional queries.
        Otherwise, uses a single aggregated query for efficiency.
        """
        # Check if tasks are already prefetched to avoid additional queries
        if "tasks" in getattr(obj, "_prefetched_objects_cache", {}):
            # Use prefetched data - no additional queries
            tasks = obj.tasks.all()
            total_tasks = len(tasks)
            if total_tasks == 0:
                return 0
            completed_tasks = sum(1 for t in tasks if t.status == TASK_STATUS_DONE)
            return int((completed_tasks / total_tasks) * 100)

        # Not prefetched - use single aggregated query instead of two separate queries
        from django.db.models import Count, Q

        aggregated = obj.tasks.aggregate(
            total=Count("task_id"),
            completed=Count("task_id", filter=Q(status=TASK_STATUS_DONE)),
        )
        total_tasks = aggregated["total"]
        if total_tasks == 0:
            return 0
        return int((aggregated["completed"] / total_tasks) * 100)


class ProjectListSerializer(ProjectProgressMixin, serializers.ModelSerializer):
    members = MemberSerializer(many=True, read_only=True)
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "project_id",
            "title",
            "description",
            "start_date",
            "deadline",
            "progress",
            "status",
            "members",
        ]


class ProjectResponseSerializer(ProjectProgressMixin, serializers.ModelSerializer):
    members = MemberSerializer(many=True, read_only=True)
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "project_id",
            "title",
            "description",
            "start_date",
            "deadline",
            "progress",
            "status",
            "members",
        ]
        read_only_fields = ["project_id"]


class ProjectCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(allow_blank=True, required=False)
    start_date = serializers.DateTimeField()
    deadline = serializers.DateTimeField()
    progress = serializers.IntegerField(required=False, default=0)
    status = serializers.ChoiceField(
        choices=[(c[0], c[1]) for c in Project.status_choices], default="planning"
    )
    members = serializers.PrimaryKeyRelatedField(
        many=True, queryset=User.objects.all(), required=False, default=[]
    )

    default_error_messages = {
        "invalid_date_range": "deadline must be greater than or equal to start_date.",
        "blank_title": "title may not be blank.",
        "invalid_progress": "progress must be between 0 and 100.",
        "invalid_status": "invalid status value.",
    }

    def validate(self, attrs):
        title = attrs.get("title", "").strip()
        if "title" in attrs and not title:
            self.fail("blank_title")
        if title:
            attrs["title"] = title

        start_date = attrs.get("start_date")
        deadline = attrs.get("deadline")
        if start_date and deadline and deadline < start_date:
            self.fail("invalid_date_range")

        attrs.pop("progress", None)

        status = attrs.get("status")
        if status:
            valid_statuses = [c[0] for c in Project.status_choices]
            if status not in valid_statuses:
                self.fail("invalid_status")

        return attrs

    def create(self, validated_data):
        members = validated_data.pop("members", [])
        project = Project.objects.create(**validated_data)
        if members:
            project.members.set(members)
        return project

    def update(self, instance, validated_data):
        members = validated_data.pop("members", None)
        validated_data.pop("progress", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if members is not None:
            instance.members.set(members)

        return instance

    def validate_members(self, value):
        # Validate members are unique
        if value:
            user_ids = [user.pk for user in value]
            if len(user_ids) != len(set(user_ids)):
                raise serializers.ValidationError(
                    "Duplicate member IDs are not allowed."
                )
        return value

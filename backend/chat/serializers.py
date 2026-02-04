from django.contrib.auth import get_user_model
from rest_framework import serializers

from projects.models import Project

from .models import ChatRoom, ChatRoomUser, Message

User = get_user_model()


class ChatRoomResponseSerializer(serializers.ModelSerializer):
    """Serializer for ChatRoom responses.

    Note: For optimal performance, use prefetch_related('members') on the queryset
    when serializing multiple chat rooms to avoid N+1 queries.
    Example: ChatRoom.objects.prefetch_related('members')
    """

    project_id = serializers.UUIDField(source="project.project_id", read_only=True)
    members = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ("chatroom_id", "project_id", "name", "members")

    def get_members(self, obj: ChatRoom) -> list[dict]:
        """Get chat room members.

        Uses prefetched data if available to avoid N+1 queries.
        When iterating over members, ensure prefetch_related('members') is used
        on the queryset for optimal performance with multiple chat rooms.
        """
        # Access prefetched members if available, otherwise this will query
        # Note: Callers should use prefetch_related('members') on the queryset
        members = obj.members.all()
        return [
            {
                "user_id": member.pk,
                "name": member.username,
                "email": member.email,
                "profile_picture": member.profile_picture.url
                if member.profile_picture
                else None,
            }
            for member in members
        ]


class ChatRoomCreateSerializer(serializers.Serializer):
    name = serializers.CharField(
        max_length=255,
        allow_blank=True,
        required=False,
        default="",
        help_text="Name of the chat room.",
    )
    members = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False,
        help_text="List of user IDs to include in the chat room.",
    )

    default_error_messages = {
        "duplicate_members": "Duplicate user IDs are not allowed.",
        "invalid_members": "Some users do not exist.",
        "not_in_project": "All members must be assigned to the project.",
    }

    def validate(self, attrs: dict) -> dict:
        project: Project = self.context["project"]
        member_ids = attrs["members"]
        seen = set()
        unique_member_ids = []
        for member_id in member_ids:
            if member_id in seen:
                self.fail("duplicate_members")
            seen.add(member_id)
            unique_member_ids.append(member_id)

        members = list(User.objects.filter(pk__in=unique_member_ids))
        if len(members) != len(unique_member_ids):
            self.fail("invalid_members")

        assigned_user_ids = set(
            project.members.filter(pk__in=unique_member_ids).values_list(
                "pk", flat=True
            )
        )
        if assigned_user_ids != set(unique_member_ids):
            self.fail("not_in_project")

        attrs["member_objects"] = members
        return attrs

    def create(self, validated_data: dict) -> ChatRoom:
        project: Project = self.context["project"]
        members = validated_data.pop("member_objects")
        name = validated_data.pop("name", "")

        chatroom = ChatRoom.objects.create(project=project, name=name)
        ChatRoomUser.objects.bulk_create([
            ChatRoomUser(chatroom=chatroom, user=member) for member in members
        ])
        chatroom.refresh_from_db()
        return chatroom


class MessageSerializer(serializers.ModelSerializer):
    chatroom_id = serializers.UUIDField(source="chatroom.chatroom_id", read_only=True)
    user_id = serializers.IntegerField(source="user.pk", read_only=True)
    name = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = (
            "message_id",
            "chatroom_id",
            "user_id",
            "name",
            "email",
            "profile_picture",
            "content",
            "timestamp",
        )

    def get_profile_picture(self, obj):
        return obj.user.profile_picture.url if obj.user.profile_picture else None


class MessageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating chat messages.

    Security Note: Always uses the authenticated user (request.user) as the
    message author to prevent user impersonation attacks.
    """

    class Meta:
        model = Message
        fields = ["content"]

    default_error_messages = {
        "not_in_chatroom": "The user is not a member of this chat room.",
        "blank_content": "Message content cannot be blank.",
    }

    def validate(self, attrs: dict) -> dict:
        request = self.context["request"]
        chatroom: ChatRoom = self.context["chatroom"]

        content = attrs["content"].strip()
        if not content:
            self.fail("blank_content")
        attrs["content"] = content

        # Security: Always use authenticated user to prevent impersonation
        user = request.user

        is_member = chatroom.members.filter(pk=user.pk).exists()
        if not is_member:
            self.fail("not_in_chatroom")

        attrs["user"] = user
        attrs["chatroom"] = chatroom
        return attrs

    def create(self, validated_data: dict) -> Message:
        message = Message.objects.create(**validated_data)
        return message


class MessageUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["content"]  # 編集できるのはメッセージ内容のみ

    def validate_content(self, value):
        if not value.strip():
            raise serializers.ValidationError("Message content cannot be blank.")
        return value

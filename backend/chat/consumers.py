import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model

from common.constants import ERROR_INVALID_JSON

from .models import ChatRoom, Message

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        if self.scope["user"].is_anonymous:
            await self.close()
            return

        self.project_id = self.scope["url_route"]["kwargs"]["project_id"]
        self.chatroom_id = self.scope["url_route"]["kwargs"]["chatroom_id"]
        self.room_group_name = f"chat_{self.chatroom_id}"

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name, self.channel_name
            )

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(
                text_data=json.dumps({
                    "type": "error",
                    "message": ERROR_INVALID_JSON,
                })
            )
            return

        message_type = text_data_json.get("type", "message")

        if message_type == "join_room":
            await self.handle_join_room()
        elif message_type == "message":
            await self.handle_message(text_data_json)
        elif message_type == "typing":
            await self.handle_typing(text_data_json)

    async def handle_join_room(self):
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        chatroom = await self.get_chatroom()
        if not chatroom:
            await self.send(
                text_data=json.dumps({"type": "error", "message": "Chatroom not found"})
            )
            return

        messages = await self.get_messages(chatroom)

        for message in messages:
            await self.send(
                text_data=json.dumps({
                    "type": "message",
                    "message": self._format_message_dict(message),
                })
            )

        await self.send(text_data=json.dumps({"type": "history_complete"}))

    async def handle_message(self, text_data_json):
        content = text_data_json.get("content")

        if not content or not content.strip():
            return

        try:
            message = await self.save_message(content)
        except PermissionError as err:
            await self.send(
                text_data=json.dumps({"type": "error", "message": str(err)})
            )
            return

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": self._format_message_dict(message),
            },
        )

    async def handle_typing(self, text_data_json):
        user_id = text_data_json.get("user_id")
        is_typing = text_data_json.get("is_typing", False)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "user_typing",
                "user_id": user_id,
                "is_typing": is_typing,
            },
        )

    async def chat_message(self, event):
        message = event["message"]
        await self.send(text_data=json.dumps({"type": "message", "message": message}))

    async def user_typing(self, event):
        await self.send(
            text_data=json.dumps({
                "type": "typing",
                "user_id": event["user_id"],
                "is_typing": event["is_typing"],
            })
        )

    def _format_message_dict(self, message):
        """Format a message object into a dictionary for JSON serialization."""
        return {
            "message_id": str(message.message_id),
            "chatroom_id": str(message.chatroom.chatroom_id),
            "user_id": message.user.pk,
            "name": message.user.username,
            "email": message.user.email,
            "profile_picture": message.user.profile_picture.url
            if message.user.profile_picture
            else None,
            "content": message.content,
            "timestamp": message.timestamp.isoformat(),
        }

    @database_sync_to_async
    def get_chatroom(self):
        try:
            return ChatRoom.objects.get(
                chatroom_id=self.chatroom_id, project__project_id=self.project_id
            )
        except ChatRoom.DoesNotExist:
            return None

    @database_sync_to_async
    def get_messages(self, chatroom):
        return list(chatroom.messages.all().select_related("user", "chatroom"))

    @database_sync_to_async
    def save_message(self, content):
        try:
            chatroom = ChatRoom.objects.get(
                chatroom_id=self.chatroom_id, project__project_id=self.project_id
            )

            if not chatroom.members.filter(pk=self.scope["user"].pk).exists():
                raise PermissionError("User is not a member of this chatroom")

            message = Message.objects.create(
                chatroom=chatroom, user=self.scope["user"], content=content
            )
        except ChatRoom.DoesNotExist as err:
            raise ValueError("Invalid chatroom") from err
        else:
            return message

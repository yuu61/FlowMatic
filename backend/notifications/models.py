from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ("task", "Task"),
        ("project", "Project"),
        ("chat", "Chat"),
        ("event", "Event"),
        ("system", "System"),
    ]

    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications"
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    related_object_id = models.CharField(max_length=255, null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["recipient", "is_read", "-created_at"],
                name="notif_recip_read_created_idx",
            ),
        ]

    def __str__(self):
        recipient_str = str(self.recipient)
        return f"{self.title} - {recipient_str}"

"""
Common constants used across the backend application.
"""

# Pagination defaults
DEFAULT_PAGE_SIZE = 20

# Permission error messages
ERROR_NOT_PROJECT_MEMBER = "You are not a member of this project."
ERROR_NOT_ASSIGNED_TO_PROJECT = "You are not assigned to this project."
ERROR_NOT_CHATROOM_MEMBER = "You are not a member of this chat room."
ERROR_CANNOT_EDIT_OTHERS = "You can only edit or delete your own {resource}."

# Validation error messages
ERROR_PAGINATION_INTEGERS = "page and per_page must be integers."
ERROR_PAGINATION_POSITIVE = "page and per_page must be greater than zero."
ERROR_INVALID_JSON = "Invalid JSON format"

# Notification types - reference these instead of hardcoding strings
NOTIFICATION_TYPE_TASK = "task"
NOTIFICATION_TYPE_PROJECT = "project"
NOTIFICATION_TYPE_CHAT = "chat"
NOTIFICATION_TYPE_EVENT = "event"

# Task status
TASK_STATUS_DONE = "done"

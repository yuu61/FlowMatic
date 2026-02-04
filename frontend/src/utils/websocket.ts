import { WS_BASE_URL } from "../constants";

/**
 * Creates an authenticated WebSocket connection.
 *
 * Authentication is handled automatically via httpOnly cookies.
 * The browser includes cookies in the WebSocket handshake request,
 * and the server extracts the JWT from the cookie.
 *
 * Security Benefits:
 * - Token is stored in httpOnly cookie (not accessible via JavaScript)
 * - Cookie is automatically sent with WebSocket handshake
 * - Protected against XSS attacks
 *
 * @param path - WebSocket path (e.g., "/ws/chat/project-id/room-id/")
 * @returns WebSocket instance with authentication via cookies
 */
export function createAuthenticatedWebSocket(path: string): WebSocket {
  const wsUrl = `${WS_BASE_URL}${path}`;
  // Cookies are automatically included in WebSocket handshake
  return new WebSocket(wsUrl);
}

/**
 * Builds a WebSocket path for chat rooms.
 *
 * @param projectId - Project UUID
 * @param chatroomId - Chatroom UUID
 * @returns Formatted WebSocket path
 */
export function buildChatWebSocketPath(projectId: string, chatroomId: string): string {
  return `/ws/chat/${projectId}/${chatroomId}/`;
}

/**
 * Builds a WebSocket path for notifications.
 *
 * @returns Formatted WebSocket path
 */
export function buildNotificationWebSocketPath(): string {
  return "/ws/notifications/";
}

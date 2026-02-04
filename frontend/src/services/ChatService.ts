import api from "../api";
import type { ChatMessage, Chatroom } from "../types";
import { apiWrapper } from "../utils/apiWrapper";

export interface ChatroomFormData {
  name: string;
  description?: string;
}

export interface MessageFormData {
  content: string;
  user_id?: number;
}

export interface MessagesResponse {
  messages: ChatMessage[];
  page: number;
  per_page: number;
  total_pages: number;
  total_count: number;
}

interface ChatroomsResponse {
  chatrooms: Chatroom[];
}

export function createChatroom(
  projectId: string,
  chatroomData: ChatroomFormData,
): Promise<Chatroom> {
  return apiWrapper(
    () => api.post(`/api/projects/${projectId}/chatrooms/`, chatroomData),
    "Create chatroom",
  );
}

export async function getChatrooms(projectId: string): Promise<Chatroom[]> {
  const data = await apiWrapper<ChatroomsResponse>(
    () => api.get(`/api/projects/${projectId}/chatrooms/`),
    "Get chatrooms",
  );
  return data.chatrooms;
}

export function getChatroomById(chatroomId: string): Promise<Chatroom> {
  return apiWrapper(() => api.get(`/api/chatrooms/${chatroomId}/`), "Get chatroom by ID");
}

export function updateChatroom(
  chatroomId: string,
  chatroomData: Partial<ChatroomFormData>,
): Promise<Chatroom> {
  return apiWrapper(
    () => api.put(`/api/chatrooms/${chatroomId}/`, chatroomData),
    "Update chatroom",
  );
}

export async function deleteChatroom(chatroomId: string): Promise<void> {
  await apiWrapper(() => api.delete(`/api/chatrooms/${chatroomId}/`), "Delete chatroom");
}

export function getMessages(
  projectId: string,
  chatroomId: string,
  page = 1,
  perPage = 20,
): Promise<MessagesResponse> {
  return apiWrapper(
    () =>
      api.get(`/api/projects/${projectId}/chatrooms/${chatroomId}/messages/`, {
        params: {
          p: page,
          per_page: perPage,
        },
      }),
    "Get messages",
  );
}

export function postMessage(
  projectId: string,
  chatroomId: string,
  messageData: MessageFormData,
): Promise<ChatMessage> {
  return apiWrapper(
    () => api.post(`/api/projects/${projectId}/chatrooms/${chatroomId}/messages/`, messageData),
    "Post message",
  );
}

import api from "../api";
import type { ChatMessage } from "../types";

// ========================================
// Chatroom Types
// ========================================
export interface Chatroom {
  chatroom_id: string;
  project_id: string;
  name: string;
  description: string;
  created_at: string;
}

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

// ========================================
// API Functions
// ========================================
export async function createChatroom(
  projectId: string,
  chatroomData: ChatroomFormData,
): Promise<Chatroom> {
  try {
    const response = await api.post(`/api/projects/${projectId}/chatrooms/`, chatroomData);
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function getChatrooms(projectId: string): Promise<Chatroom[]> {
  try {
    const response = await api.get(`/api/projects/${projectId}/chatrooms/`);
    return response.data.chatrooms;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function getChatroomById(chatroomId: string): Promise<Chatroom> {
  try {
    const response = await api.get(`/api/chatrooms/${chatroomId}/`);
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function updateChatroom(
  chatroomId: string,
  chatroomData: Partial<ChatroomFormData>,
): Promise<Chatroom> {
  try {
    const response = await api.put(`/api/chatrooms/${chatroomId}/`, chatroomData);
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function deleteChatroom(chatroomId: string): Promise<void> {
  try {
    await api.delete(`/api/chatrooms/${chatroomId}/`);
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

/**
 * Get messages from a chatroom with pagination
 */
export async function getMessages(
  projectId: string,
  chatroomId: string,
  page = 1,
  perPage = 20,
): Promise<MessagesResponse> {
  try {
    const response = await api.get(`/api/projects/${projectId}/chatrooms/${chatroomId}/messages/`, {
      params: {
        p: page,
        per_page: perPage,
      },
    });
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

/**
 * Post a message to a chatroom
 */
export async function postMessage(
  projectId: string,
  chatroomId: string,
  messageData: MessageFormData,
): Promise<ChatMessage> {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/chatrooms/${chatroomId}/messages/`,
      messageData,
    );
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

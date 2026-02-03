import api from "../api";
import type { CalendarEvent, EventFormData } from "../types";

export async function createEvent(
  projectId: string,
  eventData: EventFormData,
): Promise<CalendarEvent> {
  try {
    const response = await api.post(`/api/projects/${projectId}/events/`, eventData);
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function getEvents(projectId: string): Promise<CalendarEvent[]> {
  try {
    const response = await api.get(`/api/projects/${projectId}/events/`);
    return response.data.events;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function updateEvent(
  projectId: string,
  eventId: string,
  eventData: Partial<EventFormData>,
): Promise<CalendarEvent> {
  try {
    const response = await api.put(`/api/projects/${projectId}/events/${eventId}/`, eventData);
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function deleteEvent(projectId: string, eventId: string): Promise<void> {
  try {
    await api.delete(`/api/projects/${projectId}/events/${eventId}/`);
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

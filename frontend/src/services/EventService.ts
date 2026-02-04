import api from "../api";
import type { CalendarEvent, EventFormData } from "../types";
import { apiWrapper } from "../utils/apiWrapper";

interface EventsResponse {
  events: CalendarEvent[];
}

export function createEvent(projectId: string, eventData: EventFormData): Promise<CalendarEvent> {
  return apiWrapper(
    () => api.post(`/api/projects/${projectId}/events/`, eventData),
    "Create event",
  );
}

export async function getEvents(projectId: string): Promise<CalendarEvent[]> {
  const data = await apiWrapper<EventsResponse>(
    () => api.get(`/api/projects/${projectId}/events/`),
    "Get events",
  );
  return data.events;
}

export function updateEvent(
  projectId: string,
  eventId: string,
  eventData: Partial<EventFormData>,
): Promise<CalendarEvent> {
  return apiWrapper(
    () => api.put(`/api/projects/${projectId}/events/${eventId}/`, eventData),
    "Update event",
  );
}

export async function deleteEvent(projectId: string, eventId: string): Promise<void> {
  await apiWrapper(
    () => api.delete(`/api/projects/${projectId}/events/${eventId}/`),
    "Delete event",
  );
}

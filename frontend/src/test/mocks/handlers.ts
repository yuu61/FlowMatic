import { http, HttpResponse } from "msw";

const API_BASE_URL = "http://localhost:8000";

export const handlers = [
  // Auth endpoints
  http.get(`${API_BASE_URL}/api/auth/csrf/`, () => {
    return HttpResponse.json({ csrfToken: "mock-csrf-token" });
  }),

  http.get(`${API_BASE_URL}/api/auth/status/`, () => {
    return HttpResponse.json({
      authenticated: true,
      user: { id: 1, username: "testuser", email: "test@example.com", date_joined: "2024-01-01T00:00:00.000Z" },
    });
  }),

  http.post(`${API_BASE_URL}/api/auth/refresh/`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.post(`${API_BASE_URL}/api/auth/logout/`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Users endpoints
  http.get(`${API_BASE_URL}/api/users/`, () => {
    return HttpResponse.json([
      { id: 1, username: "user1", email: "user1@example.com", profile_picture: null, date_joined: "2024-01-01T00:00:00.000Z" },
      { id: 2, username: "user2", email: "user2@example.com", profile_picture: null, date_joined: "2024-01-01T00:00:00.000Z" },
    ]);
  }),

  http.patch(`${API_BASE_URL}/api/users/update/`, () => {
    return HttpResponse.json({
      id: 1,
      username: "testuser",
      email: "test@example.com",
      profile_picture: null,
      date_joined: "2024-01-01T00:00:00.000Z",
    });
  }),

  http.put(`${API_BASE_URL}/api/users/me/password/`, () => {
    return HttpResponse.json({ message: "Password changed successfully" });
  }),

  // Projects endpoints
  http.get(`${API_BASE_URL}/api/projects/`, () => {
    return HttpResponse.json({
      projects: [
        {
          project_id: "proj-1",
          title: "Project 1",
          description: "Test project",
          owner: 1,
          created_at: "2024-01-01",
          start_date: "2024-01-01",
          deadline: "2024-12-31",
          status: "in_progress",
          progress: 50,
          members: [],
        },
      ],
    });
  }),

  http.get(`${API_BASE_URL}/api/projects/:projectId/`, ({ params }) => {
    const { projectId } = params;
    return HttpResponse.json({
      project_id: projectId,
      title: "Project 1",
      description: "Test project",
      owner: 1,
      created_at: "2024-01-01",
      start_date: "2024-01-01",
      deadline: "2024-12-31",
      status: "in_progress",
      progress: 50,
      members: [],
    });
  }),

  http.post(`${API_BASE_URL}/api/projects/`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      {
        project_id: "new-proj-id",
        title: body["title"],
        description: body["description"] || "",
        owner: 1,
        created_at: new Date().toISOString(),
        start_date: body["start_date"] || null,
        deadline: body["deadline"] || null,
        status: body["status"] || "planning",
        progress: 0,
        members: [],
      },
      { status: 201 },
    );
  }),

  http.put(`${API_BASE_URL}/api/projects/:projectId/`, async ({ params, request }) => {
    const { projectId } = params;
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      project_id: projectId,
      title: body["title"] || "Project 1",
      description: body["description"] || "Test project",
      owner: 1,
      created_at: "2024-01-01",
      start_date: body["start_date"] || "2024-01-01",
      deadline: body["deadline"] || "2024-12-31",
      status: body["status"] || "in_progress",
      progress: body["progress"] ?? 50,
      members: [],
    });
  }),
];

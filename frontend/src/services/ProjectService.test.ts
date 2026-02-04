import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "../test/mocks/server";
import { createProject, getProjectById, getProjects, updateProject } from "./ProjectService";

const API_BASE_URL = "http://localhost:8000";

describe("ProjectService", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createProject", () => {
    it("should create a new project successfully", async () => {
      const newProject = await createProject({
        title: "New Project",
        description: "A test project",
      });

      expect(newProject.project_id).toBe("new-proj-id");
      expect(newProject.title).toBe("New Project");
      expect(newProject.description).toBe("A test project");
      expect(newProject.status).toBe("planning");
    });

    it("should include optional fields when provided", async () => {
      let capturedBody: Record<string, unknown> | null = null;

      server.use(
        http.post(`${API_BASE_URL}/api/projects/`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;

          return HttpResponse.json(
            {
              project_id: "new-proj-id",
              title: capturedBody["title"],
              description: capturedBody["description"],
              owner: 1,
              created_at: "2024-01-01T00:00:00.000Z",
              start_date: capturedBody["start_date"],
              deadline: capturedBody["deadline"],
              status: capturedBody["status"],
              progress: 0,
              members: [],
            },
            { status: 201 },
          );
        }),
      );

      const newProject = await createProject({
        title: "Project with dates",
        description: "Has start and deadline",
        start_date: "2024-01-01",
        deadline: "2024-12-31",
        status: "in_progress",
      });

      // リクエストボディのアサーション
      expect(capturedBody).not.toBeNull();
      expect(capturedBody?.start_date).toBe("2024-01-01");
      expect(capturedBody?.deadline).toBe("2024-12-31");
      expect(capturedBody?.status).toBe("in_progress");

      // レスポンスのアサーション
      expect(newProject.start_date).toBe("2024-01-01");
      expect(newProject.deadline).toBe("2024-12-31");
      expect(newProject.status).toBe("in_progress");
    });

    it("should throw error when validation fails (400)", async () => {
      server.use(
        http.post(`${API_BASE_URL}/api/projects/`, () => {
          return HttpResponse.json({ error: "Title is required" }, { status: 400 });
        }),
      );

      await expect(createProject({ title: "" })).rejects.toThrow();
    });

    it("should throw error when not authenticated (401)", async () => {
      server.use(
        http.post(`${API_BASE_URL}/api/projects/`, () => {
          return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
        }),
      );

      await expect(createProject({ title: "Test Project" })).rejects.toThrow();
    });

    it("should throw error when permission denied (403)", async () => {
      server.use(
        http.post(`${API_BASE_URL}/api/projects/`, () => {
          return HttpResponse.json({ error: "Forbidden" }, { status: 403 });
        }),
      );

      await expect(createProject({ title: "Test Project" })).rejects.toThrow();
    });

    it("should throw error on network failure", async () => {
      server.use(
        http.post(`${API_BASE_URL}/api/projects/`, () => {
          return HttpResponse.networkError();
        }),
      );

      await expect(createProject({ title: "Test Project" })).rejects.toThrow();
    });
  });

  describe("getProjects", () => {
    it("should return project list on success", async () => {
      const projects = await getProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0]).toHaveProperty("project_id", "proj-1");
      expect(projects[0]).toHaveProperty("title", "Project 1");
    });

    it("should handle empty project list", async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/projects/`, () => {
          return HttpResponse.json({ projects: [] });
        }),
      );

      const projects = await getProjects();

      expect(projects).toEqual([]);
    });

    it("should throw error on failure", async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/projects/`, () => {
          return HttpResponse.json({ error: "Server error" }, { status: 500 });
        }),
      );

      await expect(getProjects()).rejects.toThrow();
    });
  });

  describe("getProjectById", () => {
    it("should return single project on success", async () => {
      const project = await getProjectById("proj-1");

      expect(project.project_id).toBe("proj-1");
      expect(project.title).toBe("Project 1");
    });

    it("should throw error for non-existent project (404)", async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/projects/:projectId/`, () => {
          return HttpResponse.json({ error: "Project not found" }, { status: 404 });
        }),
      );

      await expect(getProjectById("non-existent")).rejects.toThrow();
    });
  });

  describe("updateProject", () => {
    it("should update project successfully", async () => {
      const updatedProject = await updateProject("proj-1", {
        title: "Updated Title",
        progress: 75,
      });

      expect(updatedProject.project_id).toBe("proj-1");
      expect(updatedProject.title).toBe("Updated Title");
      expect(updatedProject.progress).toBe(75);
    });

    it("should handle partial updates", async () => {
      let capturedBody: Record<string, unknown> | null = null;

      server.use(
        http.put(`${API_BASE_URL}/api/projects/:projectId/`, async ({ params, request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;

          return HttpResponse.json({
            project_id: params["projectId"],
            title: "Project 1",
            description: "Test project",
            owner: 1,
            created_at: "2024-01-01",
            start_date: "2024-01-01",
            deadline: "2024-12-31",
            status: "completed",
            progress: 100,
            members: [],
          });
        }),
      );

      const updatedProject = await updateProject("proj-1", {
        progress: 100,
      });

      // リクエストボディのアサーション（部分更新の確認）
      expect(capturedBody).not.toBeNull();
      expect(capturedBody?.progress).toBe(100);
      expect(capturedBody?.title).toBeUndefined();

      // レスポンスのアサーション
      expect(updatedProject.progress).toBe(100);
      expect(updatedProject.status).toBe("completed");
    });
  });
});

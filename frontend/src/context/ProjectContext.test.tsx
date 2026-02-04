import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CURRENT_PROJECT_ID } from "../constants";
import { getProjects } from "../services/ProjectService";
import type { Project } from "../types";
import { AuthProvider } from "./AuthContext";
import { ProjectProvider, useProject } from "./ProjectContext";

// Mock the api module
vi.mock("../api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  initializeCsrf: vi.fn().mockResolvedValue(undefined),
}));

// Mock ProjectService
vi.mock("../services/ProjectService", () => ({
  getProjects: vi.fn(),
}));

const mockedGetProjects = getProjects as ReturnType<typeof vi.fn>;

const mockProjects: Project[] = [
  {
    project_id: "proj-1",
    title: "Project 1",
    description: "First project",
    start_date: "2024-01-01",
    deadline: "2024-12-31",
    status: "in_progress",
    progress: 50,
    members: [],
  },
  {
    project_id: "proj-2",
    title: "Project 2",
    description: "Second project",
    start_date: "2024-02-01",
    deadline: "2024-11-30",
    status: "planning",
    progress: 0,
    members: [],
  },
];

describe("useProject", () => {
  it("should throw error when used outside of ProjectProvider", () => {
    expect(() => {
      renderHook(() => useProject());
    }).toThrow("useProject must be used within a ProjectProvider");
  });
});

describe("ProjectProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("should fetch projects when authorized", async () => {
    mockedGetProjects.mockResolvedValue(mockProjects);

    // Use a simpler approach - mock the api directly
    const api = await import("../api");
    (api.default.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      data: { authenticated: true, user: { id: 1, username: "test", date_joined: "2024-01-01" } },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>
        <ProjectProvider>{children}</ProjectProvider>
      </AuthProvider>
    );

    const { result } = renderHook(() => useProject(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedGetProjects).toHaveBeenCalled();
    expect(result.current.projects).toEqual(mockProjects);
  });

  it("should restore previously selected project from localStorage", async () => {
    localStorage.setItem(CURRENT_PROJECT_ID, "proj-2");
    mockedGetProjects.mockResolvedValue(mockProjects);

    const api = await import("../api");
    (api.default.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      data: { authenticated: true, user: { id: 1, username: "test", date_joined: "2024-01-01" } },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>
        <ProjectProvider>{children}</ProjectProvider>
      </AuthProvider>
    );

    const { result } = renderHook(() => useProject(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currentProject?.project_id).toBe("proj-2");
  });

  it("should fall back to first project if saved project not found", async () => {
    localStorage.setItem(CURRENT_PROJECT_ID, "non-existent");
    mockedGetProjects.mockResolvedValue(mockProjects);

    const api = await import("../api");
    (api.default.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      data: { authenticated: true, user: { id: 1, username: "test", date_joined: "2024-01-01" } },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>
        <ProjectProvider>{children}</ProjectProvider>
      </AuthProvider>
    );

    const { result } = renderHook(() => useProject(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currentProject?.project_id).toBe("proj-1");
  });

  it("should save project ID to localStorage when changing project", async () => {
    mockedGetProjects.mockResolvedValue(mockProjects);

    const api = await import("../api");
    (api.default.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      data: { authenticated: true, user: { id: 1, username: "test", date_joined: "2024-01-01" } },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>
        <ProjectProvider>{children}</ProjectProvider>
      </AuthProvider>
    );

    const { result } = renderHook(() => useProject(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.handleProjectChange("proj-2");
    });

    expect(result.current.currentProject?.project_id).toBe("proj-2");
    expect(localStorage.getItem(CURRENT_PROJECT_ID)).toBe("proj-2");
  });

  it("should set error state when fetch fails", async () => {
    const error = new Error("Failed to fetch projects");
    mockedGetProjects.mockRejectedValue(error);

    const api = await import("../api");
    (api.default.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      data: { authenticated: true, user: { id: 1, username: "test", date_joined: "2024-01-01" } },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>
        <ProjectProvider>{children}</ProjectProvider>
      </AuthProvider>
    );

    const { result } = renderHook(() => useProject(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
  });

  it("should update project in context correctly", async () => {
    mockedGetProjects.mockResolvedValue(mockProjects);

    const api = await import("../api");
    (api.default.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      data: { authenticated: true, user: { id: 1, username: "test", date_joined: "2024-01-01" } },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>
        <ProjectProvider>{children}</ProjectProvider>
      </AuthProvider>
    );

    const { result } = renderHook(() => useProject(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updatedProject: Project = {
      ...mockProjects[0]!,
      title: "Updated Project 1",
      progress: 75,
    };

    act(() => {
      result.current.updateProjectInContext(updatedProject);
    });

    expect(result.current.projects[0]?.title).toBe("Updated Project 1");
    expect(result.current.currentProject?.progress).toBe(75);
  });

  describe("refreshProjects", () => {
    it("should update projects list when refreshProjects is called", async () => {
    mockedGetProjects.mockResolvedValue(mockProjects);

    const api = await import("../api");
    (api.default.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      data: { authenticated: true, user: { id: 1, username: "test", date_joined: "2024-01-01" } },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>
        <ProjectProvider>{children}</ProjectProvider>
      </AuthProvider>
    );

    const { result } = renderHook(() => useProject(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.projects).toEqual(mockProjects);

    // Setup new projects for refresh
    const refreshedProjects: Project[] = [
      {
        project_id: "proj-1",
        title: "Updated Project 1",
        description: "Updated first project",
        start_date: "2024-01-01",
        deadline: "2024-12-31",
        status: "completed",
        progress: 100,
        members: [],
      },
      {
        project_id: "proj-3",
        title: "Project 3",
        description: "Third project",
        start_date: "2024-03-01",
        deadline: "2024-10-31",
        status: "in_progress",
        progress: 25,
        members: [],
      },
    ];

    mockedGetProjects.mockResolvedValue(refreshedProjects);

    await act(async () => {
      await result.current.refreshProjects();
    });

    expect(result.current.projects).toEqual(refreshedProjects);
  });

  it("should update currentProject when it exists in refreshed list", async () => {
    mockedGetProjects.mockResolvedValue(mockProjects);

    const api = await import("../api");
    (api.default.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      data: { authenticated: true, user: { id: 1, username: "test", date_joined: "2024-01-01" } },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>
        <ProjectProvider>{children}</ProjectProvider>
      </AuthProvider>
    );

    const { result } = renderHook(() => useProject(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Current project should be proj-1
    expect(result.current.currentProject?.project_id).toBe("proj-1");
    expect(result.current.currentProject?.title).toBe("Project 1");

    // Setup refreshed projects with updated proj-1
    const refreshedProjects: Project[] = [
      {
        project_id: "proj-1",
        title: "Refreshed Project 1",
        description: "Refreshed first project",
        start_date: "2024-01-01",
        deadline: "2024-12-31",
        status: "completed",
        progress: 100,
        members: [],
      },
      {
        project_id: "proj-2",
        title: "Project 2",
        description: "Second project",
        start_date: "2024-02-01",
        deadline: "2024-11-30",
        status: "planning",
        progress: 0,
        members: [],
      },
    ];

    mockedGetProjects.mockResolvedValue(refreshedProjects);

    await act(async () => {
      await result.current.refreshProjects();
    });

    expect(result.current.currentProject?.project_id).toBe("proj-1");
    expect(result.current.currentProject?.title).toBe("Refreshed Project 1");
    expect(result.current.currentProject?.progress).toBe(100);
  });

  it("should set error state when refreshProjects fails", async () => {
    mockedGetProjects.mockResolvedValue(mockProjects);

    const api = await import("../api");
    (api.default.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      data: { authenticated: true, user: { id: 1, username: "test", date_joined: "2024-01-01" } },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>
        <ProjectProvider>{children}</ProjectProvider>
      </AuthProvider>
    );

    const { result } = renderHook(() => useProject(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Initial state should have no error
    expect(result.current.error).toBeNull();

    // Setup error for refresh
    const refreshError = new Error("Failed to refresh projects");
    mockedGetProjects.mockRejectedValue(refreshError);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await act(async () => {
      await result.current.refreshProjects();
    });

    expect(result.current.error).toEqual(refreshError);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to refresh projects:", refreshError);

    consoleErrorSpy.mockRestore();
  });
  });
});

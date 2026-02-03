import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

import { CURRENT_PROJECT_ID } from "../constants";
import { getProjects } from "../services/ProjectService";
import type { Project } from "../types";
import { useAuth } from "./AuthContext";

// ========================================
// Context Types
// ========================================
interface ProjectContextValue {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  currentProject: Project | null;
  setCurrentProject: React.Dispatch<React.SetStateAction<Project | null>>;
  updateProjectInContext: (updatedProject: Project) => void;
  handleProjectChange: (projectId: string) => void;
  refreshProjects: () => Promise<void>;
  loading: boolean;
  error: Error | null;
}

interface ProjectProviderProps {
  children: ReactNode;
}

// ========================================
// Context
// ========================================
const ProjectContext = createContext<ProjectContextValue | null>(null);

export const ProjectProvider = ({ children }: ProjectProviderProps) => {
  const { isAuthorized } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isAuthorized === null) return;
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    void fetchProjects();
  }, [isAuthorized]);

  const fetchProjects = async () => {
    try {
      const fetchedProjects = await getProjects();
      setProjects(fetchedProjects);

      const savedProjectId = localStorage.getItem(CURRENT_PROJECT_ID);

      // Try to restore previously selected project
      if (savedProjectId) {
        const restored = fetchedProjects.find((p: Project) => p.project_id === savedProjectId);

        if (restored) {
          setCurrentProject(restored);
          setLoading(false);
          return;
        }
      }

      // Fallback: use first project
      if (fetchedProjects.length > 0) {
        const firstProject = fetchedProjects[0];
        if (firstProject) {
          setCurrentProject(firstProject);
          localStorage.setItem(CURRENT_PROJECT_ID, firstProject.project_id);
        }
      }

      setLoading(false);
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  };

  const refreshProjects = async () => {
    try {
      const fetchedProjects = await getProjects();
      setProjects(fetchedProjects);

      // Update current project if it exists in the refreshed list
      if (currentProject) {
        const updatedCurrentProject = fetchedProjects.find(
          (p: Project) => p.project_id === currentProject.project_id,
        );

        if (updatedCurrentProject) {
          setCurrentProject(updatedCurrentProject);
        }
      }
    } catch (err) {
      console.error("Failed to refresh projects:", err);
      setError(err as Error);
    }
  };

  const updateProjectInContext = (updatedProject: Project) => {
    setProjects((prevProjects) =>
      prevProjects.map((p) => (p.project_id === updatedProject.project_id ? updatedProject : p)),
    );

    setCurrentProject((prev) =>
      prev?.project_id === updatedProject.project_id ? updatedProject : prev,
    );
  };

  const handleProjectChange = (projectId: string) => {
    const selected = projects.find((p) => p.project_id === projectId);

    if (selected) {
      setCurrentProject(selected);
      localStorage.setItem(CURRENT_PROJECT_ID, projectId);
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        setProjects,
        currentProject,
        setCurrentProject,
        updateProjectInContext,
        handleProjectChange,
        refreshProjects,
        loading,
        error,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useProject = (): ProjectContextValue => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
};

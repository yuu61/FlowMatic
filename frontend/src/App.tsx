import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import NewProjectForm from "./components/NewProjectForm";
import NewTaskForm from "./components/NewTaskForm";
import ProtectedRoutes from "./components/ProtectedRoutes";
import { ProjectProvider } from "./context/ProjectContext";
import AccountSettings from "./pages/AccountSettings";
import Calendar from "./pages/Calendar";
import Chat from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import Files from "./pages/Files";
import GanttChart from "./pages/GanttChart";
import Login from "./pages/Login";
import MemberInvitationModal from "./pages/MemberInvitationModal";
import Project from "./pages/Project";
import ProjectDetail from "./pages/ProjectDetail";
import Register from "./pages/Register";
import Task from "./pages/Task";

function App() {
  return (
    <BrowserRouter>
      <ProjectProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoutes />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/project" element={<Project />} />
              <Route path="/project/new" element={<NewProjectForm />} />
              <Route path="/task" element={<Task />} />
              <Route path="/task/new" element={<NewTaskForm />} />
              <Route path="/task/:taskId/edit" element={<NewTaskForm />} />
              <Route path="/invite" element={<MemberInvitationModal />} />
              <Route path="/account" element={<AccountSettings />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/files" element={<Files />} />
              <Route path="/gantt-chart" element={<GanttChart />} />
              <Route path="/project/:projectId/edit" element={<ProjectDetail />} />
            </Route>
          </Route>

          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ProjectProvider>
    </BrowserRouter>
  );
}

export default App;

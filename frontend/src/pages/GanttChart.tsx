import "@svar-ui/react-gantt/all.css";
import "../styles/gantt-svar.css";

import { faPlusCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { TID } from "@svar-ui/react-gantt";
import { Gantt } from "@svar-ui/react-gantt";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import ProjectRequired from "../components/ProjectRequired";
import { CURRENT_PROJECT_ID, TASK_PRIORITY, TASK_STATUS } from "../constants";
import { useAuth } from "../context/AuthContext";
import { useProject } from "../context/ProjectContext";
import { getTasks, updateTask } from "../services/TaskService";
import type { Task as ApiTask, TaskStatus, TaskUser } from "../types";

type ViewMode = "day" | "week" | "month";

interface SvarGanttTask {
  id: TID;
  text: string;
  start: Date;
  end: Date;
  duration: number;
  progress: number;
  type: "task" | "summary" | "milestone";
  open?: boolean;
  parent?: TID;
  // Custom properties
  originalTask: ApiTask;
  isAssignedToMe: boolean;
}

interface TasksApiResponse {
  tasks?: ApiTask[];
  task_id?: string;
}

interface GanttApi {
  on: (event: string, handler: (ev: UpdateTaskEvent) => void) => void;
  exec: (action: string, payload: unknown) => void;
}

interface UpdateTaskEvent {
  id: TID;
  task: Partial<SvarGanttTask>;
  source?: string;
}

const SCALES_CONFIG: Record<ViewMode, Array<{ unit: string; step: number; format: string }>> = {
  day: [
    { unit: "month", step: 1, format: "MMMM yyyy" },
    { unit: "day", step: 1, format: "d" },
  ],
  week: [
    { unit: "month", step: 1, format: "MMMM yyyy" },
    { unit: "week", step: 1, format: "w" },
  ],
  month: [
    { unit: "year", step: 1, format: "yyyy" },
    { unit: "month", step: 1, format: "MMMM" },
  ],
};

export default function GanttChart() {
  const { user } = useAuth();
  const { projects, currentProject } = useProject();
  const currentProjectId = localStorage.getItem(CURRENT_PROJECT_ID);
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [tasks, setTasks] = useState<SvarGanttTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const apiRef = useRef<GanttApi | null>(null);

  const transformTasksForGantt = useCallback(
    (tasksData: ApiTask[]): SvarGanttTask[] => {
      const taskArray = Array.isArray(tasksData) ? tasksData : [];

      if (taskArray.length === 0) {
        return [];
      }

      return taskArray
        .map((task): SvarGanttTask | null => {
          if (!task || !task.task_id) {
            console.warn("Invalid task data:", task);
            return null;
          }

          let startDate: Date, endDate: Date;
          try {
            endDate = new Date(task.deadline);
            startDate = new Date(task.start_date);
          } catch (_error) {
            console.error("Error parsing dates for task:", task.task_id, _error);
            endDate = new Date();
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
          }

          // Calculate duration in days
          const duration = Math.max(
            1,
            Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
          );

          // Check if user exists and if this task is assigned to the current user
          let users: TaskUser[] = [];

          if (task.users && Array.isArray(task.users)) {
            users = task.users;
          } else if (
            (task as unknown as { assigned_users?: TaskUser[] }).assigned_users &&
            Array.isArray((task as unknown as { assigned_users?: TaskUser[] }).assigned_users)
          ) {
            users = (task as unknown as { assigned_users: TaskUser[] }).assigned_users;
          } else if (
            (task as unknown as { assigned_user_ids?: number[] }).assigned_user_ids &&
            Array.isArray((task as unknown as { assigned_user_ids?: number[] }).assigned_user_ids)
          ) {
            users = (task as unknown as { assigned_user_ids: number[] }).assigned_user_ids.map(
              (id) => ({ user_id: id }) as TaskUser,
            );
          }

          const assignedUserIds = users
            .map((u) => u?.user_id)
            .filter((id): id is number => id !== null && id !== undefined);

          const isAssignedToMe = user?.id ? assignedUserIds.includes(user.id) : false;

          return {
            id: task.task_id,
            text: task.name,
            start: startDate,
            end: endDate,
            duration,
            progress: 0,
            type: "task",
            open: true,
            originalTask: task,
            isAssignedToMe,
          };
        })
        .filter((task): task is SvarGanttTask => task !== null);
    },
    [user],
  );

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!currentProjectId) return;
      const response = (await getTasks(currentProjectId)) as ApiTask[] | TasksApiResponse;

      let tasksData: ApiTask[] = [];

      if (
        response &&
        typeof response === "object" &&
        !Array.isArray(response) &&
        "tasks" in response &&
        response.tasks
      ) {
        tasksData = response.tasks;
      } else if (
        response &&
        typeof response === "object" &&
        !Array.isArray(response) &&
        "task_id" in response &&
        response.task_id
      ) {
        tasksData = [response as unknown as ApiTask];
      } else if (Array.isArray(response)) {
        tasksData = response;
      }

      const transformedTasks = transformTasksForGantt(tasksData);
      setTasks(transformedTasks);
    } catch (err) {
      setError((err as Error).message);
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [currentProjectId, transformTasksForGantt]);

  useEffect(() => {
    if (!currentProject || !user) return;
    void fetchTasks();
  }, [currentProject, user, fetchTasks]);

  const handleTaskUpdate = useCallback(
    async (taskId: TID, updatedFields: Partial<SvarGanttTask>) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      if (!task.isAssignedToMe) {
        alert("このタスクは担当者ではないため変更できません");
        // Revert changes by re-fetching
        void fetchTasks();
        return;
      }

      try {
        setIsUpdating(true);

        const newStart = updatedFields.start || task.start;
        const newEnd = updatedFields.end || task.end;

        const updateData = {
          name: task.originalTask?.name || task.text,
          description: task.originalTask?.description || "",
          start_date: newStart instanceof Date ? newStart.toISOString() : newStart,
          deadline: newEnd instanceof Date ? newEnd.toISOString() : newEnd,
          priority: task.originalTask?.priority || TASK_PRIORITY.MEDIUM,
          status: task.originalTask?.status || TASK_STATUS.TODO,
        };

        if (!currentProjectId) return;
        await updateTask(currentProjectId, String(taskId), updateData);

        // Update local state
        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  ...updatedFields,
                  originalTask: {
                    ...t.originalTask,
                    start_date: updateData.start_date,
                    deadline: updateData.deadline,
                  },
                }
              : t,
          ),
        );

        alert("✅ タスクの日付を更新しました");
      } catch (err) {
        console.error("Error updating task:", err);
        // Revert by re-fetching
        void fetchTasks();
        alert(
          "❌ タスクの更新に失敗しました\n" +
            ((err as Error).message || "サーバーエラーが発生しました"),
        );
      } finally {
        setIsUpdating(false);
      }
    },
    [tasks, currentProjectId, fetchTasks],
  );

  const handleProgressChange = useCallback(
    async (taskId: TID, progress: number) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      if (!task.isAssignedToMe) {
        alert("このタスクは担当者ではないため変更できません");
        void fetchTasks();
        return;
      }

      try {
        setIsUpdating(true);

        let status: string = TASK_STATUS.TODO;
        if (progress === 100) status = TASK_STATUS.DONE;
        else if (progress >= 75) status = "testing";
        else if (progress >= 60) status = "in_review";
        else if (progress >= 40) status = TASK_STATUS.IN_PROGRESS;
        else if (progress >= 10) status = "pending";

        const updateData = {
          name: task.originalTask?.name || task.text,
          description: task.originalTask?.description || "",
          start_date: task.originalTask?.start_date || task.start.toISOString(),
          deadline: task.originalTask?.deadline || task.end.toISOString(),
          priority: task.originalTask?.priority || TASK_PRIORITY.MEDIUM,
          status: status,
        };

        if (!currentProjectId) return;
        await updateTask(currentProjectId, String(taskId), updateData);

        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  progress,
                  originalTask: {
                    ...t.originalTask,
                    status: status as TaskStatus,
                  },
                }
              : t,
          ),
        );

        alert("✅ 進捗を更新しました");
      } catch (err) {
        console.error("Error updating progress:", err);
        void fetchTasks();
        alert(
          "❌ 進捗の更新に失敗しました\n" +
            ((err as Error).message || "サーバーエラーが発生しました"),
        );
      } finally {
        setIsUpdating(false);
      }
    },
    [tasks, currentProjectId, fetchTasks],
  );

  const initGantt = useCallback(
    (api: GanttApi) => {
      apiRef.current = api;

      // Listen for task updates (drag & drop, resize)
      api.on("update-task", (ev: UpdateTaskEvent) => {
        const { id, task: updatedTask } = ev;

        // Check if dates changed
        if (updatedTask.start || updatedTask.end || updatedTask.duration) {
          void handleTaskUpdate(id, updatedTask);
        }

        // Check if progress changed
        if (updatedTask.progress !== undefined) {
          void handleProgressChange(id, updatedTask.progress);
        }
      });
    },
    [handleTaskUpdate, handleProgressChange],
  );

  const handleRefresh = () => {
    void fetchTasks();
  };

  // Check project selection
  if (!projects || projects.length === 0 || !currentProject) {
    return (
      <ProjectRequired
        icon="📊"
        title="プロジェクトが選択されていません"
        description={
          <>
            ガントチャートを表示するには、
            <br />
            まずプロジェクトを作成、または選択してください。
          </>
        }
      />
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-semibold">タイムライン</h1>
        {isUpdating && (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>更新中...</span>
          </div>
        )}
      </div>

      <div className="bg-white w-xs p-6 rounded-lg shadow-md mb-4">
        <div className="flex items-center justify-between">
          <label htmlFor="viewMode" className="font-bold text-xl">
            表示モード：
          </label>
          <select
            id="viewMode"
            className="border rounded px-3 py-2 text-lg"
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            value={viewMode}
          >
            <option value="day">日単位</option>
            <option value="week">週単位</option>
            <option value="month">月単位</option>
          </select>
        </div>
      </div>

      <div className="pb-6 flex flex-col items-center">
        <div className="flex gap-10 font-bold">
          <div className="flex items-center gap-3">
            <div className="w-8 h-4 bg-[#4285f4] rounded"></div>
            <span className="text-lg">タスク全体</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow-md gantt-container">
        {loading ? (
          <div className="bg-gray-100 text-gray-600 p-10 text-center rounded">
            <h1 className="text-2xl font-semibold">読み込み中...</h1>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-10 text-center rounded">
            <h1 className="text-2xl font-semibold">エラーが発生しました</h1>
            <p className="text-base mt-2">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              再試行
            </button>
          </div>
        ) : tasks.length > 0 ? (
          <>
            <div style={{ height: "500px" }}>
              <Gantt
                tasks={tasks}
                scales={SCALES_CONFIG[viewMode]}
                init={initGantt}
                cellWidth={viewMode === "day" ? 40 : viewMode === "week" ? 80 : 120}
                cellHeight={40}
                columns={[
                  { id: "text", header: "タスク名", width: 200 },
                  { id: "start", header: "開始日", width: 100, align: "center" },
                  { id: "duration", header: "期間", width: 60, align: "center" },
                ]}
              />
            </div>
            <div className="mt-4 text-sm font-semibold text-gray-500 text-center">
              <p>（※）自分の担当タスクのみドラッグして変更できます</p>
            </div>
          </>
        ) : (
          <div className="bg-gray-100 text-gray-600 p-8 text-center rounded flex flex-col gap-4">
            <h1 className="text-2xl font-semibold">データがありません</h1>
            <h3 className="text-lg font-bold">タスクを追加してください。</h3>

            <Link to="/task/new">
              <button
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800
              text-white font-bold text-lg rounded-xl transition cursor-pointer"
              >
                <FontAwesomeIcon icon={faPlusCircle} />
                新規タスク
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

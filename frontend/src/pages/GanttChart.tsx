import "frappe-gantt-react/node_modules/frappe-gantt/src/gantt.scss";
import "../styles/gantt-custom.css";

import { faPlusCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FrappeGantt, ViewMode } from "frappe-gantt-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import ProjectRequired from "../components/ProjectRequired";
import { CURRENT_PROJECT_ID } from "../constants";
import { useAuth } from "../context/AuthContext";
import { useProject } from "../context/ProjectContext";
import { getTasks, updateTask } from "../services/TaskService";
import type { Task as ApiTask, TaskStatus, TaskUser } from "../types";

// Extended Gantt task type with additional properties for this component
interface GanttTask {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  custom_class?: string;
  dependencies?: string;
  draggable: boolean;
  originalTask: ApiTask;
}

// API response type for tasks endpoint
interface TasksApiResponse {
  tasks?: ApiTask[];
  task_id?: string;
}

export default function GanttChart() {
  const { user } = useAuth();
  const { projects, currentProject } = useProject();
  const currentProjectId = localStorage.getItem(CURRENT_PROJECT_ID);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const ganttContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentProject || !user) return;
    void fetchTasks();
  }, [currentProject, user]);

  useEffect(() => {
    if (tasks.length > 0 && ganttContainerRef.current) {
      setTimeout(() => {
        disableNonAssignedTaskDragging();
      }, 100);
    }
  }, [tasks, user?.id]);

  const disableNonAssignedTaskDragging = () => {
    const ganttElement = ganttContainerRef.current?.querySelector(".gantt");
    if (!ganttElement) {
      console.log("Gantt element not found");
      return;
    }

    const bars = ganttElement.querySelectorAll(".bar-wrapper");

    bars.forEach((barWrapper, index) => {
      const bar = barWrapper.querySelector(".bar") as HTMLElement | null;
      if (!bar) {
        console.log(`Bar not found for wrapper ${index}`);
        return;
      }

      const taskId = bar.getAttribute("data-task-id");
      const task = tasks.find((t) => t.id === taskId);

      if (!task) {
        console.log(`Task not found for ID: ${taskId}`);
        return;
      }

      console.log(`Task ${taskId} (${task.name}): draggable=${task.draggable}`);

      const barWrapperEl = barWrapper as HTMLElement;

      if (!task.draggable) {
        bar.style.pointerEvents = "none";
        bar.style.cursor = "default";

        const handles = barWrapper.querySelectorAll(".bar-handle");
        handles.forEach((handle) => {
          const handleEl = handle as HTMLElement;
          handleEl.style.pointerEvents = "none";
          handleEl.style.cursor = "default";
          handleEl.style.display = "none";
        });

        barWrapperEl.style.pointerEvents = "none";
      } else {
        bar.style.pointerEvents = "auto";
        bar.style.cursor = "move";

        const handles = barWrapper.querySelectorAll(".bar-handle");
        handles.forEach((handle) => {
          const handleEl = handle as HTMLElement;
          handleEl.style.pointerEvents = "auto";
          handleEl.style.cursor = "ew-resize";
          handleEl.style.display = "block";
        });

        barWrapperEl.style.pointerEvents = "auto";
      }
    });
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!currentProjectId) return;
      const response = (await getTasks(currentProjectId)) as ApiTask[] | TasksApiResponse;
      console.log("API Response:", response);

      // Handle different response formats
      let tasksData: ApiTask[] = [];

      // If response is an object with a 'tasks' property
      if (
        response &&
        typeof response === "object" &&
        !Array.isArray(response) &&
        "tasks" in response &&
        response.tasks
      ) {
        tasksData = response.tasks;
        console.log("Extracted tasks from response.tasks");
      }
      // If response is an object that's actually a single task
      else if (
        response &&
        typeof response === "object" &&
        !Array.isArray(response) &&
        "task_id" in response &&
        response.task_id
      ) {
        tasksData = [response as unknown as ApiTask]; // Wrap single task in array
        console.log("Wrapped single task in array");
      }
      // If response is already an array
      else if (Array.isArray(response)) {
        tasksData = response;
        console.log("Response is already an array");
      }

      console.log("Tasks data to transform:", tasksData);

      const transformedTasks = transformTasksForGantt(tasksData);
      setTasks(transformedTasks);
    } catch (err) {
      setError((err as Error).message);
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const transformTasksForGantt = (tasksData: ApiTask[]): GanttTask[] => {
    // Ensure we always work with an array
    const taskArray = Array.isArray(tasksData) ? tasksData : [];

    if (taskArray.length === 0) {
      console.log("No tasks to transform");
      return [];
    }

    console.log("Transforming tasks:", {
      totalTasks: taskArray.length,
      user: user,
      firstTask: taskArray[0],
    });

    return taskArray
      .map((task): GanttTask | null => {
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
          // Use fallback dates
          endDate = new Date();
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
        }

        // Check if user exists and if this task is assigned to the current user
        // Handle different possible structures for users
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
          // If it's just an array of IDs, convert to objects
          users = (task as unknown as { assigned_user_ids: number[] }).assigned_user_ids.map(
            (id) => ({ user_id: id }) as TaskUser,
          );
        }

        const assignedUserIds = users
          .map((u) => u?.user_id)
          .filter((id): id is number => id != null);

        const isAssignedToMe = user?.id ? assignedUserIds.includes(user.id) : false;

        console.log("Task transformation:", {
          taskId: task.task_id,
          taskName: task.name,
          users: users,
          assignedUserIds: assignedUserIds,
          currentUserId: user?.id,
          isAssignedToMe: isAssignedToMe,
        });

        return {
          id: task.task_id,
          name: task.name,
          start: startDate.toISOString().split("T")[0],
          end: endDate.toISOString().split("T")[0],
          progress: 0,
          // progress: progressMap[task.status] || 0,
          custom_class: isAssignedToMe ? "assigned-to-me" : "not-assigned",
          originalTask: task,
          draggable: isAssignedToMe,
        } as GanttTask;
      })
      .filter((task): task is GanttTask => task != null); // Filter out any null tasks
  };

  const formatDateForAPI = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toISOString();
  };

  const formatDateForGantt = (isoDateString: string): string => {
    const date = new Date(isoDateString);
    return date.toISOString().split("T")[0] ?? "";
  };

  const handleDateChange = async (task: GanttTask, start: string, end: string) => {
    if (!task.draggable) {
      console.warn("Attempted to drag non-assigned task:", task.id);
      alert("このタスクは担当者ではないため変更できません");
      return;
    }

    try {
      setIsUpdating(true);

      const startDate = formatDateForAPI(start);
      const endDate = formatDateForAPI(end);

      console.log("Updating task dates:", {
        taskId: task.id,
        startDate,
        endDate,
        projectId: currentProjectId,
        user: user?.id,
        draggable: task.draggable,
      });

      const originalTask = task.originalTask || tasks.find((t) => t.id === task.id)?.originalTask;

      const updateData = {
        name: originalTask?.name || task.name,
        description: originalTask?.description || "",
        start_date: startDate,
        deadline: endDate,
        priority: originalTask?.priority || "medium",
        status: originalTask?.status || "todo",
      };

      if (!currentProjectId) return;
      await updateTask(currentProjectId, task.id, updateData);

      setTasks((prevTasks) =>
        prevTasks.map(
          (t): GanttTask =>
            t.id === task.id
              ? {
                  ...t,
                  start: start,
                  end: end,
                  originalTask: {
                    ...t.originalTask,
                    start_date: startDate,
                    deadline: endDate,
                  },
                }
              : t,
        ),
      );

      alert("✅ タスクの日付を更新しました");
    } catch (err) {
      console.error("Error updating task:", err);

      setTasks((prevTasks) =>
        prevTasks.map(
          (t): GanttTask =>
            t.id === task.id
              ? {
                  ...t,
                  start: t.originalTask?.start_date
                    ? formatDateForGantt(t.originalTask.start_date)
                    : t.start,
                  end: t.originalTask?.deadline
                    ? formatDateForGantt(t.originalTask.deadline)
                    : t.end,
                }
              : t,
        ),
      );

      alert(
        "❌ タスクの更新に失敗しました\n" +
          ((err as Error).message || "サーバーエラーが発生しました"),
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleProgressChange = async (task: GanttTask, progress: number) => {
    if (!task.draggable) {
      console.warn("Attempted to change progress of non-assigned task:", task.id);
      alert("このタスクは担当者ではないため変更できません");
      return;
    }

    try {
      setIsUpdating(true);

      let status = "todo";
      if (progress === 100) status = "done";
      else if (progress >= 75) status = "testing";
      else if (progress >= 60) status = "in_review";
      else if (progress >= 40) status = "in_progress";
      else if (progress >= 10) status = "pending";

      console.log("Updating task progress:", {
        taskId: task.id,
        progress,
        status,
        projectId: currentProjectId,
        user: user?.id,
        draggable: task.draggable,
      });

      const originalTask = task.originalTask || tasks.find((t) => t.id === task.id)?.originalTask;

      const updateData = {
        name: originalTask?.name || task.name,
        description: originalTask?.description || "",
        start_date: originalTask?.start_date || formatDateForAPI(task.start),
        deadline: originalTask?.deadline || formatDateForAPI(task.end),
        priority: originalTask?.priority || "medium",
        status: status,
        // assigned_user_ids: originalTask?.assigned_user_ids || [],
      };

      if (!currentProjectId) return;
      await updateTask(currentProjectId, task.id, updateData);

      setTasks((prevTasks) =>
        prevTasks.map(
          (t): GanttTask =>
            t.id === task.id
              ? {
                  ...t,
                  progress: progress,
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

      const originalStatus = task.originalTask?.status || "todo";
      const progressMap: Record<string, number> = {
        done: 100,
        testing: 75,
        in_review: 60,
        in_progress: 40,
        pending: 10,
        todo: 0,
      };

      setTasks((prevTasks) =>
        prevTasks.map(
          (t): GanttTask =>
            t.id === task.id
              ? {
                  ...t,
                  progress: progressMap[originalStatus] || 0,
                }
              : t,
        ),
      );

      alert(
        "❌ 進捗の更新に失敗しました\n" +
          ((err as Error).message || "サーバーエラーが発生しました"),
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRefresh = () => {
    void fetchTasks();
  };

  /* console.log("Chart start date:", chartStartDate);
  console.log("Chart end date:", chartEndDate);
  console.log("User ID:", user?.id);
  console.log("Tasks with draggable status:", tasks.map(t => ({
    id: t.id, 
    name: t.name, 
    draggable: t.draggable,
    users: t.originalTask?.users,
    assignedUserIds: t.originalTask?.users?.map(u => u.user_id) || []
  })));
 */

  // プロジェクトが存在しない、または選択されていない場合
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

      <div className="bg-white w-xs p-6 rounded-lg shadow-md">
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
            <option value={ViewMode.Day}>日単位</option>
            <option value={ViewMode.Week}>週単位</option>
            <option value={ViewMode.Month}>月単位</option>
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

      <div className="bg-white p-4 rounded shadow-md" ref={ganttContainerRef}>
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
            <FrappeGantt
              tasks={tasks as unknown as import("frappe-gantt-react").Task[]}
              viewMode={viewMode}
              onClick={(task) => {
                const ganttTask = task as unknown as GanttTask;
                const isMine = ganttTask.draggable;
                console.log(
                  "クリック:",
                  task,
                  `担当者: ${isMine ? "自分" : "他人"}`,
                  `User ID: ${user?.id}`,
                  `Assigned Users: ${
                    ganttTask.originalTask?.users
                      ?.map((u) => `${u.name} (${u.user_id})`)
                      .join(", ") || "None"
                  }`,
                );
                if (!isMine) {
                  alert("このタスクは担当者ではないため変更できません");
                }
              }}
              onDateChange={(task, start, end) =>
                handleDateChange(task as unknown as GanttTask, String(start), String(end))
              }
              onProgressChange={(task, progress) =>
                handleProgressChange(task as unknown as GanttTask, progress)
              }
              onTasksChange={(newTasks) => console.log("変更:", newTasks)}
            />
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

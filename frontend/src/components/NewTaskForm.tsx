import { MobileDateTimePicker } from "@mui/x-date-pickers";
import { Dayjs } from "dayjs";
import dayjs from "dayjs";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useProject } from "../context/ProjectContext";
import { createTask, getTaskById, getTasks, updateTask } from "../services/TaskService";
import { Task } from "../types";

export default function NewTaskForm() {
  const { currentProject } = useProject();
  const currentProjectId = currentProject?.project_id;

  const { taskId } = useParams();
  const isEditMode = Boolean(taskId);

  const [existingTasks, setExistingTasks] = useState<Task[]>([]);

  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");

  const [dates, setDates] = useState<{ startDate: Date | null; deadline: Date | null }>({
    startDate: dayjs().toDate(),
    deadline: null,
  });

  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo"); // fixed default
  const [assignees, setAssignees] = useState<number[]>([]);
  const [dependencies, setDependencies] = useState<{ taskId: string; type: string }[]>([]);
  const [message, setMessage] = useState<{ text: string; type: string }>({ text: "", type: "" });

  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchTasks = async (projectId: string | undefined) => {
    if (!projectId) return;
    const tasks = await getTasks(projectId);

    setExistingTasks(tasks);
  };

  useEffect(() => {
    inputRef.current?.focus();
    // console.log(currentProject)
    void fetchTasks(currentProjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isEditMode) return;

    const loadTask = async () => {
      if (!currentProjectId || !taskId) return;
      const task = await getTaskById(currentProjectId, taskId);

      setTaskName(task.name);
      setDescription(task.description || "");
      setPriority(task.priority);
      setStatus(task.status);

      setDates({
        startDate: task.start_date ? new Date(task.start_date) : null,
        deadline: task.deadline ? new Date(task.deadline) : null,
      });

      setAssignees(task.users.map((u) => u.user_id));

      setDependencies(
        (task.parent_tasks || []).map((p) => ({
          taskId: p.task_id,
          type: p.relation_type,
        })),
      );
    };

    void loadTask();
  }, [isEditMode, taskId, currentProjectId]);

  useEffect(() => {
    console.log(existingTasks);
  }, [existingTasks]);

  const groupMembers = useMemo(() => currentProject?.members ?? [], [currentProject]);
  // console.log(groupMembers)

  const handleDateChange = (field: "startDate" | "deadline", value: Dayjs | null) => {
    setDates((prev) => ({ ...prev, [field]: value ? value.toDate() : null }));
  };

  const handleAssigneeChange = (id: number) => {
    setAssignees((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!taskName.trim()) return showMessage("タスク名が必要です。", "error");
    if (!dates.deadline) return showMessage("期限日を設定してください。", "error");
    if (assignees.length === 0) return showMessage("担当者を1名以上選択してください。", "error");

    if (dates.startDate && dates.deadline < dates.startDate) {
      return showMessage("期限日は開始日より後の日付を選択してください。", "error");
    }

    const requestData = {
      name: taskName,
      description,
      start_date: dates.startDate?.toISOString() || undefined,
      deadline: dates.deadline.toISOString(),
      priority,
      status,
      assigned_user_ids: assignees,
      parent_tasks: dependencies.map((d) => ({
        task_id: d.taskId,
        relation_type: d.type,
      })),
    };

    try {
      if (!currentProjectId) {
        showMessage("プロジェクトが選択されていません。", "error");
        return;
      }
      if (isEditMode) {
        if (!taskId) return;
        await updateTask(currentProjectId, taskId, requestData);
        alert("タスクを更新しました！");
      } else {
        await createTask(currentProjectId, requestData);
        alert(`${taskName} を作成しました！`);
      }

      resetForm();
      void navigate("/task");
    } catch (_error) {
      showMessage("保存に失敗しました。", "error");
    }
  };

  const showMessage = (text: string, type: string) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };

  const resetForm = () => {
    setTaskName("");
    setDescription("");
    setPriority("medium");
    setStatus("todo");
    setAssignees([]);
    setDependencies([]);
    setDates({
      startDate: dayjs().toDate(),
      deadline: null,
    });
  };

  return (
    <div className="flex flex-col items-center max-w-full md:max-w-5xl mx-auto justify-center min-h-screen md:p-6 relative">
      {/* Back Button */}
      <div className="w-full mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") void navigate(-1);
          }}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 hover:cursor-pointer
                    rounded-lg text-xl transition duration-200 shadow w-auto"
        >
          ← 戻る
        </button>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg w-full">
        <h1 className="text-4xl font-bold text-gray-800 mb-6 text-center">
          {isEditMode ? "タスクを編集" : "新しいタスクの作成"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Task Name */}
          <div>
            <label htmlFor="taskName" className="block text-gray-700 text-lg font-semibold mb-2">
              タスク名
            </label>
            <input
              id="taskName"
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              ref={inputRef}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-lg"
              placeholder="タスク名を入力してください"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-gray-700 text-lg font-semibold mb-2">
              説明
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-lg resize-y"
              placeholder="タスクの詳細を入力してください"
            />
          </div>

          {/* Due Date + Assignees */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <span id="startDateLabel" className="block text-gray-700 text-lg font-semibold mb-2">
                開始日
              </span>

              <MobileDateTimePicker
                label="開始日を設定してください"
                value={dates.startDate ? dayjs(dates.startDate) : null}
                onChange={(newValue) => handleDateChange("startDate", newValue)}
                maxDate={dates.deadline ? dayjs(dates.deadline) : undefined} // prevent after deadline
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    className:
                      "w-full px-3 py-2 border border-gray-300 text-xl rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                  },
                }}
              />
            </div>

            <div>
              <span id="deadlineLabel" className="block text-gray-700 text-lg font-semibold mb-2">
                期限日
              </span>

              <MobileDateTimePicker
                label="期限日を設定してください"
                value={dates.deadline ? dayjs(dates.deadline) : null}
                onChange={(newValue) => handleDateChange("deadline", newValue)}
                minDate={dates.startDate ? dayjs(dates.startDate) : undefined} // prevent before start
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    className:
                      "w-full px-3 py-2 border border-gray-300 text-xl rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                  },
                }}
              />
            </div>

            <div>
              <span className="block text-gray-700 text-lg font-semibold mb-2">担当者</span>
              <div className="max-h-full overflow-y-auto border border-gray-300 rounded-lg p-2">
                {groupMembers.map((member) => (
                  <label
                    key={member.user_id}
                    htmlFor={`assignee_${member.user_id}`}
                    className="flex items-center py-1 text-lg text-gray-700"
                  >
                    <input
                      id={`assignee_${member.user_id}`}
                      type="checkbox"
                      checked={assignees.includes(member.user_id)}
                      onChange={() => handleAssigneeChange(member.user_id)}
                      className="mr-2"
                    />
                    {member.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Priority + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="priority" className="block text-gray-700 text-lg font-semibold mb-2">
                優先度
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-lg bg-white"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-gray-700 text-lg font-semibold mb-2">
                ステータス
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-lg bg-white"
              >
                <option value="todo">未着手</option>
                <option value="pending">保留</option>
                <option value="in_progress">進行中</option>
                <option value="in_review">レビュー待ち</option>
                <option value="testing">テスト中</option>
              </select>
            </div>
          </div>

          {/* Dependencies Section */}
          {/* <div className="border-t border-gray-200 pt-5">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-gray-700 text-lg font-semibold">
                タスク間の関係
              </label>
              <button
                type="button"
                onClick={handleAddDependency}
                className="bg-blue-600 text-white hover:bg-blue-700 hover:cursor-pointer
                font-semibold py-2 px-3 rounded-lg text-lg"
              >
                追加 <i className="fa-solid fa-plus ml-1"></i>
              </button>
            </div>

            {dependencies.length === 0 ? (
              <p className="text-gray-500 text-lg italic mb-4">
                このタスクと関係のある他のタスクを追加できます（任意）
              </p>
            ) : (
              dependencies.map((dep, i) => {
                const relatedTask = existingTasks.find(
                  (t) => t.task_id === dep.taskId
                );
                return (
                  <div
                    key={i}
                    className="p-4 mb-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-blue-700 font-bold text-lg">
                        関係 {i + 1}
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleRemoveDependency(i)}
                        className="text-red-500 font-semibold text-lg hover:cursor-pointer hover:text-red-600"
                      >
                        削除
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-700 text-lg font-semibold mb-1">
                          関連する既存タスク
                        </label>
                        <select
                          value={dep.taskId}
                          onChange={(e) =>
                            handleDependencyChange(i, "taskId", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-lg bg-white"
                        >
                          <option value="">タスクを選択</option>
                          {existingTasks.map((task) => (
                            <option key={task.task_id} value={task.task_id}>
                              {task.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-700 text-lg font-semibold mb-1">
                          関係タイプ
                        </label>
                        <select
                          value={dep.type}
                          onChange={(e) =>
                            handleDependencyChange(i, "type", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-lg bg-white"
                        >
                          {dependencyTypes.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-3 text-lg text-gray-700 flex items-center justify-center gap-2">
                      {relatedTask && taskName && (
                        <span>
                          <span className="font-semibold text-green-700">
                            {relatedTask.name}
                          </span>
                          {dep.type === "FtS" && " が完了後に "}
                          {dep.type === "FtF" && " が完了後に "}
                          {dep.type === "StS" && " が開始後に "}
                          {dep.type === "StF" && " が開始後に "}
                          <span className="font-semibold text-blue-700">
                            {taskName}
                          </span>
                          {dep.type === "FtS" && " を開始"}
                          {dep.type === "FtF" && " を完了"}
                          {dep.type === "StS" && " を開始"}
                          {dep.type === "StF" && " を完了"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div> */}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-extrabold text-lg py-3 rounded-lg 
            hover:cursor-pointer hover:bg-blue-700 transition duration-300 transform hover:scale-105"
          >
            {isEditMode ? "更新する" : "タスクを作成"}
          </button>
        </form>

        {/* Message */}
        {message.text && (
          <div
            className={`mt-6 p-4 rounded-lg text-lg text-center ${
              message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}

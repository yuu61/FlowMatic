import { ja } from "date-fns/locale";
import dayjs from "dayjs";
import React, { useEffect, useMemo, useRef, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { useNavigate, useParams } from "react-router-dom";

import { TASK_PRIORITY, TASK_STATUS } from "../constants";
import { useProject } from "../context/ProjectContext";
import { createTask, getTaskById, getTasks, updateTask } from "../services/TaskService";
import { Task } from "../types";

registerLocale("ja", ja);

const MESSAGE_DISPLAY_MS = 4000;

export default function NewTaskForm() {
  const { currentProject } = useProject();
  const currentProjectId = currentProject?.project_id;

  const { taskId } = useParams();
  const isEditMode = Boolean(taskId);

  const [, setExistingTasks] = useState<Task[]>([]);

  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");

  const [dates, setDates] = useState<{ startDate: Date | null; deadline: Date | null }>({
    startDate: dayjs().toDate(),
    deadline: null,
  });

  const [priority, setPriority] = useState<string>(TASK_PRIORITY.MEDIUM);
  const [status, setStatus] = useState<string>(TASK_STATUS.TODO);
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

  const groupMembers = useMemo(() => currentProject?.members ?? [], [currentProject]);

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
    setTimeout(() => setMessage({ text: "", type: "" }), MESSAGE_DISPLAY_MS);
  };

  const resetForm = () => {
    setTaskName("");
    setDescription("");
    setPriority(TASK_PRIORITY.MEDIUM);
    setStatus(TASK_STATUS.TODO);
    setAssignees([]);
    setDependencies([]);
    setDates({
      startDate: dayjs().toDate(),
      deadline: null,
    });
  };

  return (
    <div className="flex flex-col items-center max-w-full md:max-w-5xl mx-auto justify-center min-h-screen md:p-6 relative">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <span id="startDateLabel" className="block text-gray-700 text-lg font-semibold mb-2">
                開始日
              </span>
              <DatePicker
                selected={dates.startDate}
                onChange={(date: Date | null) => setDates((prev) => ({ ...prev, startDate: date }))}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="yyyy/MM/dd HH:mm"
                locale="ja"
                placeholderText="開始日を設定してください"
                maxDate={dates.deadline ?? undefined}
                className="w-full"
              />
            </div>

            <div>
              <span id="deadlineLabel" className="block text-gray-700 text-lg font-semibold mb-2">
                期限日
              </span>
              <DatePicker
                selected={dates.deadline}
                onChange={(date: Date | null) => setDates((prev) => ({ ...prev, deadline: date }))}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="yyyy/MM/dd HH:mm"
                locale="ja"
                placeholderText="期限日を設定してください"
                minDate={dates.startDate ?? undefined}
                className="w-full"
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
                <option value={TASK_PRIORITY.LOW}>低</option>
                <option value={TASK_PRIORITY.MEDIUM}>中</option>
                <option value={TASK_PRIORITY.HIGH}>高</option>
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
                <option value={TASK_STATUS.TODO}>未着手</option>
                <option value="pending">保留</option>
                <option value={TASK_STATUS.IN_PROGRESS}>進行中</option>
                <option value="in_review">レビュー待ち</option>
                <option value="testing">テスト中</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-extrabold text-lg py-3 rounded-lg
            hover:cursor-pointer hover:bg-blue-700 transition duration-300 transform hover:scale-105"
          >
            {isEditMode ? "更新する" : "タスクを作成"}
          </button>
        </form>

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

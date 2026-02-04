import { useState } from "react";
import { NavLink } from "react-router-dom";

import NewTaskForm from "../components/NewTaskForm";

function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="font-sans bg-gray-100 min-h-screen flex">
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-gray-800 text-white flex flex-col transition-transform duration-300 z-40 ${
          sidebarOpen ? "" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-4 text-2xl font-bold border-b border-gray-700">新庄剛志タスク管理</div>
        <ul className="flex-1 p-4 space-y-3 sidebar-menu">
          {[
            {
              href: "/",
              icon: "fas fa-tachometer-alt",
              label: "ダッシュボード",
            },
            {
              href: "/project",
              icon: "fas fa-project-diagram",
              label: "プロジェクト",
            },
            { href: "/task", icon: "fas fa-tasks", label: "タスク" },
            { href: "/chat", icon: "fas fa-comments", label: "チャット" },
            {
              href: "/calendar",
              icon: "fas fa-calendar-alt",
              label: "カレンダー",
            },
          ].map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-2 p-2 rounded-lg hover:bg-gray-700 text-lg font-extrabold ${
                  isActive ? "bg-gray-700" : ""
                }`
              }
            >
              <i className={`${item.icon}`}></i> {item.label}
            </NavLink>
          ))}
        </ul>
      </aside>

      <main className="flex-1 ml-0 md:ml-64 p-8 overflow-y-auto">
        <NewTaskForm />
      </main>

      <button
        className="fixed top-4 left-4 md:hidden z-50 bg-white p-2 rounded-lg shadow"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        ☰
      </button>
    </div>
  );
}

export default Home;

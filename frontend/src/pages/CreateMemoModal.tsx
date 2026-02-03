import { useEffect, useRef, useState } from "react";

import type { Memo, MemoColor } from "../types";

interface MemoSubmitData {
  memo_id?: string;
  content: string;
  color: MemoColor;
}

interface CreateMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MemoSubmitData) => Promise<void>;
  initialMemo?: Memo | null;
}

const CreateMemoModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialMemo = null,
}: CreateMemoModalProps) => {
  const [content, setContent] = useState("");
  const [color, setColor] = useState<MemoColor>("blue");
  const [loading, setLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (initialMemo) {
      setContent(initialMemo.content);
      setColor(initialMemo.color);
    } else {
      setContent("");
      setColor("blue");
    }

    // ⬇️ focus textarea after modal opens
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, [initialMemo, isOpen]);

  /* ---------------- ESC key close ---------------- */
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  /* ---------------- Submit ---------------- */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setLoading(true);
      await onSubmit({
        memo_id: initialMemo?.memo_id,
        content,
        color,
      });

      onClose();
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Backdrop click close ---------------- */
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  const handleBackdropKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === "Enter" || e.key === " ") && !loading) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleBackdropClick}
      onKeyDown={handleBackdropKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-scaleIn">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer
             disabled:opacity-40 transition"
          aria-label="Close"
        >
          <i className="fa-solid fa-xmark text-xl"></i>
        </button>
        <h3 className="text-2xl font-bold mb-4">
          {initialMemo ? "✏️ メモを編集" : "📌 新しいメモ"}
        </h3>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {/* Content */}
          <label htmlFor="memo-content" className="sr-only">
            メモ内容
          </label>
          <textarea
            id="memo-content"
            ref={textareaRef}
            className="w-full border-2 border-gray-200 rounded-xl p-3 focus:outline-none focus:border-yellow-400"
            rows={4}
            placeholder="メモ内容を入力..."
            value={content}
            disabled={loading}
            onChange={(e) => setContent(e.target.value)}
          />

          {/* Color */}
          <fieldset>
            <legend className="text-sm font-bold mb-2">色</legend>
            <div className="flex gap-3" role="radiogroup" aria-label="メモの色を選択">
              {(["blue", "yellow", "green"] as const).map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  disabled={loading}
                  role="radio"
                  aria-checked={color === c}
                  aria-label={c === "yellow" ? "黄色" : c === "blue" ? "青色" : "緑色"}
                  className={`w-8 h-8 rounded-full border-2 transition
                    ${color === c ? "ring-3 ring-offset-2 ring-blue-600" : ""}
                    ${
                      c === "yellow"
                        ? "bg-yellow-300"
                        : c === "blue"
                          ? "bg-blue-300"
                          : "bg-green-300"
                    }
                  `}
                />
              ))}
            </div>
          </fieldset>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border font-bold cursor-pointer hover:bg-gray-100 disabled:opacity-50"
            >
              キャンセル
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
              text-white font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              )}
              {initialMemo ? "更新" : "作成"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMemoModal;

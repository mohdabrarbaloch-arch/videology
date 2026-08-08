"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: string;
  content: string;
}

interface ChatInterfaceProps {
  videoId: string;
  initialMessages: Message[];
}

export default function ChatInterface({ videoId, initialMessages }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/videos/${videoId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== userMsg.id),
          data.userMessage,
          data.assistantMessage,
        ]);
      } else {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== userMsg.id),
          userMsg,
          { id: "error", role: "assistant", content: data.error || "Failed to get response" },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== userMsg.id),
        userMsg,
        { id: "error", role: "assistant", content: "Network error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="max-h-[400px] space-y-4 overflow-y-auto rounded-2xl border border-(--border) bg-(--input-bg) p-5">
        {messages.length === 0 && (
          <p className="text-center text-sm text-(--fg)/30">
            Ask anything about this video...
          </p>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-(--btn) text-(--btn-fg)"
                  : "bg-(--surface-3) text-(--fg)/80"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-(--surface-3) px-4 py-3 text-sm text-(--fg)/40">
              Thinking...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="mt-4 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask a question about this video..."
          disabled={loading}
          className="flex-1 rounded-xl border border-(--border-2) bg-(--input-bg) px-4 py-3 text-sm text-(--fg) outline-none placeholder:text-(--fg)/20 transition focus:border-(--accent)/60 focus:ring-2 focus:ring-(--accent)/10"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="shrink-0 rounded-xl bg-(--btn) px-5 py-3 text-sm font-semibold text-(--btn-fg) transition hover:bg-(--btn-hover) disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

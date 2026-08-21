"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";

interface Message {
  id: string;
  role: string;
  content: string;
}

interface ChatInterfaceProps {
  videoId: string;
  initialMessages: Message[];
}

function renderMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const lines = text.split("\n");
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeKey = 0;

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        parts.push(
          <pre key={`code-${codeKey++}`} className="my-2 overflow-x-auto rounded-lg bg-black/20 px-3 py-2 text-xs">
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }
    parts.push(<p key={`p-${codeKey++}`} className="my-1">{renderInline(line)}</p>);
  }
  return parts;
}

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|_(.+?)_|`(.+?)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2] || match[3]) {
      parts.push(<strong key={key++}>{match[2] || match[3]}</strong>);
    } else if (match[4] || match[5]) {
      parts.push(<em key={key++}>{match[4] || match[5]}</em>);
    } else if (match[6]) {
      parts.push(
        <code key={key++} className="rounded bg-black/20 px-1.5 py-0.5 text-xs">{match[6]}</code>
      );
    } else if (match[7] && match[8]) {
      parts.push(
        <a key={key++} href={match[8]} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{match[7]}</a>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
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
              {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
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

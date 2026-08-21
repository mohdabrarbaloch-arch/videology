"use client";

import { ChangeEvent, DragEvent, useState } from "react";
import type { ToolConfig, ToolOption } from "@/lib/tool-config";

interface Props {
  tool: ToolConfig;
}

export default function ToolWorkbench({ tool }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const initialOptions = Object.fromEntries(
    tool.options.map((opt) => [opt.key, String(opt.default ?? "")])
  );
  const [options, setOptions] = useState<Record<string, string>>(initialOptions);

  function handleFile(selected: File | undefined) {
    setError("");
    setDone(false);
    if (!selected) return;
    if (selected.size > 500 * 1024 * 1024) {
      setError("File size must be 500 MB or less.");
      return;
    }
    setFile(selected);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    handleFile(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  }

  async function handleProcess() {
    setError("");
    setDone(false);
    setProcessing(true);

    try {
      const formData = new FormData();
      formData.append("tool", tool.slug);

      if (tool.kind === "youtube") {
        const trimmed = url.trim();
        if (!trimmed) {
          setError("Please paste a YouTube URL.");
          setProcessing(false);
          return;
        }
        formData.append("options", JSON.stringify({ ...options, url: trimmed }));
      } else {
        if (!file) {
          setError("Please choose a file first.");
          setProcessing(false);
          return;
        }
        formData.append("file", file);
        formData.append("options", JSON.stringify(options));
      }

      const res = await fetch("/api/tools/process", { method: "POST", body: formData });

      if (!res.ok) {
        let message = "Processing failed. Please try again.";
        try {
          const data = await res.json();
          if (data.error) message = data.error;
        } catch {
          // keep default
        }
        setError(message);
        setProcessing(false);
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : `${tool.slug}-output`;

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);

      setDone(true);
      setProcessing(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setProcessing(false);
    }
  }

  function setOption(key: string, value: string) {
    setOptions((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="rounded-3xl border border-(--border) bg-(--surface-1) p-5 shadow-2xl shadow-(--shadow) sm:p-8">
      {/* Input */}
      {tool.kind === "youtube" ? (
        <div>
          <label htmlFor="tool-url" className="mb-2 block text-sm font-medium text-(--fg)/75">
            YouTube video URL
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="tool-url"
              type="url"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setError("");
                setDone(false);
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className="min-w-0 flex-1 rounded-xl border border-(--border-2) bg-(--input-bg) px-4 py-3.5 text-sm text-(--fg) outline-none placeholder:text-(--fg)/35 transition focus:border-(--accent)/60 focus:ring-2 focus:ring-(--accent)/10"
            />
          </div>
          <p className="mt-3 text-xs text-(--fg)/65">{tool.hint}</p>
        </div>
      ) : (
        <div>
          <label
            htmlFor="tool-file"
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center transition ${
              isDragging
                ? "border-(--accent-2) bg-(--accent)/10"
                : "border-(--border-2) bg-(--input-bg) hover:border-(--border-3) hover:bg-(--surface-1)"
            }`}
          >
            <input
              id="tool-file"
              type="file"
              accept={tool.accepts}
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-(--border-2) bg-(--surface-2) text-xl">
              ↑
            </div>

            {file ? (
              <>
                <h3 className="mt-5 text-sm font-semibold text-(--fg)">{file.name}</h3>
                <p className="mt-2 text-xs text-(--fg)/55">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <span className="mt-5 text-xs text-(--accent-3)">Choose another file</span>
              </>
            ) : (
              <>
                <h3 className="mt-5 text-sm font-semibold">Drop your file here</h3>
                <p className="mt-2 text-xs text-(--fg)/55">or click to browse from your computer</p>
                <span className="mt-5 rounded-lg border border-(--border-2) px-3 py-2 text-xs text-(--fg)/65">Select file</span>
              </>
            )}
          </label>
          <p className="mt-3 text-xs text-(--fg)/65">{tool.hint} · Maximum 500 MB</p>
        </div>
      )}

      {/* Options */}
      {tool.options.length > 0 && (
        <div className="mt-8">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-(--fg)/65">
            Settings
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            {tool.options.map((opt) => (
              <OptionField key={opt.key} option={opt} value={options[opt.key]} onChange={setOption} />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        {done && (
          <p className="text-sm text-emerald-300">
            ✓ Done! Download started — check your browser downloads.
          </p>
        )}
        {!done && processing && (
          <p className="flex items-center gap-2 text-sm text-(--fg)/65">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-(--border-3) border-t-(--accent-2)" />
            Processing…
          </p>
        )}
        {!done && !processing && error && (
          <p className="text-sm text-red-300">{error}</p>
        )}

        <button
          type="button"
          onClick={handleProcess}
          disabled={processing || (tool.kind === "file" && !file)}
          className="rounded-xl bg-(--btn) px-6 py-3.5 text-sm font-semibold text-(--btn-fg) transition hover:bg-(--btn-hover) disabled:opacity-40"
        >
          {processing ? "Processing…" : done ? "Process again" : "Process →"}
        </button>
      </div>
    </div>
  );
}

function OptionField({
  option,
  value,
  onChange,
}: {
  option: ToolOption;
  value: string;
  onChange: (key: string, value: string) => void;
}) {
  if (option.type === "select") {
    return (
      <div>
        <label className="mb-2 block text-sm font-medium text-(--fg)/75">{option.label}</label>
        <select
          value={value}
          onChange={(event) => onChange(option.key, event.target.value)}
          className="w-full appearance-none rounded-xl border border-(--border-2) bg-(--input-bg) px-4 py-3 text-sm text-(--fg) outline-none transition focus:border-(--accent)/60 focus:ring-2 focus:ring-(--accent)/10"
        >
          {(option.choices || []).map((choice) => (
            <option key={choice.value} value={choice.value} className="bg-(--bg-3)">
              {choice.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (option.type === "range") {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-(--fg)/75">{option.label}</label>
          <span className="rounded-lg border border-(--border-2) bg-(--input-bg) px-2 py-0.5 text-xs text-(--accent-3)">
            {value}
            {option.suffix ? ` ${option.suffix}` : ""}
          </span>
        </div>
        <input
          type="range"
          min={option.min}
          max={option.max}
          step={option.step}
          value={value}
          onChange={(event) => onChange(option.key, event.target.value)}
          className="w-full accent-(--accent-2)"
        />
      </div>
    );
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-(--fg)/75">
        {option.label}
        {option.suffix ? <span className="ml-1 text-(--fg)/55">({option.suffix})</span> : null}
      </label>
      <input
        type="number"
        min={option.min}
        max={option.max}
        step={option.step}
        value={value}
        onChange={(event) => onChange(option.key, event.target.value)}
        className="w-full rounded-xl border border-(--border-2) bg-(--input-bg) px-4 py-3 text-sm text-(--fg) outline-none transition focus:border-(--accent)/60 focus:ring-2 focus:ring-(--accent)/10"
      />
    </div>
  );
}

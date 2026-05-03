"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FileUp, RefreshCcw, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { EmptyState } from "@/components/dashboard/empty-state";
import type { ColumnSchema } from "@/lib/analytics/types";
import type { WorkspaceFile } from "@/types/database";

type FileWithSchema = WorkspaceFile & {
  file_schemas?: Array<{
    id: string;
    row_count: number;
    columns: ColumnSchema[];
  }>;
};

export function FilesClient() {
  const { activeWorkspace } = useWorkspace();
  const [files, setFiles] = useState<FileWithSchema[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [summaryMarkdown, setSummaryMarkdown] = useState("");

  const structuredFiles = useMemo(() => {
    return files.filter((file) => Boolean(file.file_schemas?.length));
  }, [files]);

  async function loadFiles() {
    if (!activeWorkspace) {
      setFiles([]);
      return;
    }

    setIsLoading(true);
    const response = await fetch(`/api/files?workspace_id=${activeWorkspace.id}`);
    const payload = await response.json();
    if (response.ok) {
      setFiles(payload.files ?? []);
    } else {
      setMessage(payload.error || "Could not load files.");
    }
    setIsLoading(false);
  }

  useEffect(() => {
    void loadFiles();
  }, [activeWorkspace?.id]);

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace || !selectedFile) {
      return;
    }

    setIsUploading(true);
    setMessage("");
    const formData = new FormData();
    formData.append("workspace_id", activeWorkspace.id);
    formData.append("file", selectedFile);

    const response = await fetch("/api/files/upload", {
      method: "POST",
      body: formData
    });
    const payload = await response.json();

    if (response.ok) {
      setSelectedFile(null);
      setMessage("File uploaded.");
      await loadFiles();
    } else {
      setMessage(payload.error || "Upload failed.");
    }
    setIsUploading(false);
  }

  async function summarize(fileId: string) {
    if (!activeWorkspace) {
      return;
    }

    setSummaryMarkdown("Loading summary...");
    const response = await fetch("/api/analytics/summarize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: activeWorkspace.id,
        file_id: fileId
      })
    });
    const payload = await response.json();
    setSummaryMarkdown(response.ok ? payload.markdown : payload.error || "Could not summarize dataset.");
  }

  if (!activeWorkspace) {
    return (
      <EmptyState title="No active workspace">
        Create or select a workspace before uploading analytics files.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-secondary">Files</p>
          <h1 className="mt-1 text-3xl font-semibold text-primary">Workspace files</h1>
          <p className="mt-2 text-sm text-slate-600">Upload documents and datasets for {activeWorkspace.name}.</p>
        </div>
        <button
          onClick={loadFiles}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-primary transition hover:border-secondary"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <form onSubmit={onUpload} className="rounded-xl border border-line bg-white p-5 shadow-sm">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Upload CSV, XLSX, PDF, DOCX, TXT or JSON</span>
          <input
            key={selectedFile?.name || "empty"}
            type="file"
            accept=".csv,.xlsx,.pdf,.docx,.txt,.json"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            className="mt-2 block w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-[#E8F3FF] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary"
          />
        </label>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            disabled={!selectedFile || isUploading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#001F5F] disabled:opacity-60"
          >
            <FileUp className="h-4 w-4" />
            {isUploading ? "Uploading..." : "Upload file"}
          </button>
          {message ? <p className="text-sm text-slate-600">{message}</p> : null}
        </div>
      </form>

      {isLoading ? <p className="text-sm text-slate-600">Loading files...</p> : null}

      {!isLoading && !files.length ? (
        <EmptyState title="No files uploaded">
          Upload a document for Q&A or a CSV/XLSX dataset for schema detection and basic analysis.
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
          <div className="grid grid-cols-[1.5fr_0.7fr_0.6fr_0.7fr] gap-4 border-b border-line bg-panel px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Name</span>
            <span>Size</span>
            <span>Status</span>
            <span>Schema</span>
          </div>
          {files.map((file) => (
            <div
              key={file.id}
              className="grid grid-cols-[1.5fr_0.7fr_0.6fr_0.7fr] items-center gap-4 border-b border-line px-4 py-4 text-sm last:border-b-0"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-primary">{file.file_name}</div>
                <div className="mt-1 text-xs text-slate-500">{file.file_type}</div>
              </div>
              <span className="text-slate-600">{formatBytes(file.file_size)}</span>
              <span className="w-fit rounded-full bg-[#E8F3FF] px-3 py-1 text-xs font-semibold text-secondary">
                {file.status}
              </span>
              <div>
                {file.file_schemas?.length ? (
                  <button
                    onClick={() => summarize(file.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-primary transition hover:border-secondary"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Summarize
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">Document</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {structuredFiles.length ? (
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-primary">Detected datasets</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {structuredFiles.map((file) => {
              const schema = file.file_schemas?.[0];
              return (
                <div key={file.id} className="rounded-lg border border-line p-4">
                  <div className="font-medium text-primary">{file.file_name}</div>
                  <p className="mt-1 text-sm text-slate-600">
                    {schema?.row_count.toLocaleString("en-US")} rows, {schema?.columns.length} columns
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {summaryMarkdown ? (
        <div className="prose max-w-none rounded-xl border border-line bg-white p-5 shadow-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{summaryMarkdown}</ReactMarkdown>
        </div>
      ) : null}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

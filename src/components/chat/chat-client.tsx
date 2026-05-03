"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, SquarePen } from "lucide-react";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { EmptyState } from "@/components/dashboard/empty-state";
import type { ChatMessage, ChatThread } from "@/types/database";

export function ChatClient() {
  const { activeWorkspace } = useWorkspace();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  async function loadThreads() {
    if (!activeWorkspace) {
      setThreads([]);
      setActiveThreadId(null);
      setMessages([]);
      return;
    }

    const response = await fetch(`/api/chat/threads?workspace_id=${activeWorkspace.id}`);
    const payload = await response.json();
    if (response.ok) {
      setThreads(payload.threads ?? []);
    }
  }

  async function loadThread(threadId: string) {
    if (!activeWorkspace) {
      return;
    }

    setActiveThreadId(threadId);
    const response = await fetch(`/api/chat/thread/${threadId}?workspace_id=${activeWorkspace.id}`);
    const payload = await response.json();
    if (response.ok) {
      setMessages(payload.messages ?? []);
    } else {
      setError(payload.error || "Could not load thread.");
    }
  }

  useEffect(() => {
    void loadThreads();
  }, [activeWorkspace?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace || !input.trim()) {
      return;
    }

    const userText = input.trim();
    setInput("");
    setError("");
    setIsLoading(true);
    setMessages((current) => [
      ...current,
      {
        id: `local-${Date.now()}`,
        workspace_id: activeWorkspace.id,
        thread_id: activeThreadId ?? "pending",
        role: "user",
        content: userText,
        sources: null,
        created_at: new Date().toISOString()
      }
    ]);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: activeWorkspace.id,
        thread_id: activeThreadId,
        message: userText
      })
    });

    const payload = await response.json();
    if (response.ok) {
      setActiveThreadId(payload.thread_id);
      setMessages((current) => [...current, payload.message]);
      await loadThreads();
    } else {
      setError(payload.error || "The analyst could not answer.");
    }

    setIsLoading(false);
  }

  if (!activeWorkspace) {
    return (
      <EmptyState title="No active workspace">
        Create or select a workspace before starting a chat.
      </EmptyState>
    );
  }

  return (
    <div className="grid h-[calc(100vh-4rem)] gap-5 lg:grid-cols-[18rem_1fr]">
      <section className="rounded-xl border border-line bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-primary">Chats</h1>
          <button
            onClick={() => {
              setActiveThreadId(null);
              setMessages([]);
            }}
            className="rounded-lg border border-line p-2 text-primary transition hover:border-secondary"
            aria-label="New chat"
          >
            <SquarePen className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {threads.length ? (
            threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => loadThread(thread.id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeThreadId === thread.id ? "bg-[#E8F3FF] font-semibold text-primary" : "text-slate-600 hover:bg-panel"
                }`}
              >
                <span className="line-clamp-2">{thread.title}</span>
              </button>
            ))
          ) : (
            <p className="text-sm leading-6 text-slate-500">No saved chats yet.</p>
          )}
        </div>
      </section>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        <div className="border-b border-line px-5 py-4">
          <p className="text-sm font-medium text-secondary">{activeWorkspace.name}</p>
          <h2 className="text-xl font-semibold text-primary">AI data analyst</h2>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-panel px-4 py-5">
          {!messages.length ? (
            <div className="mx-auto mt-12 max-w-xl rounded-xl border border-line bg-white p-6 text-center shadow-sm">
              <h3 className="text-lg font-semibold text-primary">Ask a workspace question</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Try asking for a dataset summary, column definitions, totals by segment, or risks in uploaded documents.
              </p>
            </div>
          ) : null}

          {messages.map((message) => (
            <div key={message.id} className={message.role === "user" ? "ml-auto max-w-3xl" : "mr-auto max-w-4xl"}>
              <div
                className={`rounded-xl px-4 py-3 text-sm leading-6 shadow-sm ${
                  message.role === "user"
                    ? "bg-primary text-white"
                    : "prose max-w-none border border-line bg-white text-slate-700"
                }`}
              >
                {message.role === "assistant" ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))}

          {isLoading ? (
            <div className="mr-auto max-w-3xl rounded-xl border border-line bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
              Analyst is working...
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onSubmit} className="border-t border-line bg-white p-4">
          {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about your workspace data..."
              rows={2}
              className="min-h-12 flex-1 resize-none rounded-lg border border-line px-3 py-3 text-sm outline-none focus:border-secondary"
            />
            <button
              disabled={isLoading || !input.trim()}
              className="inline-flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-primary text-white transition hover:bg-[#001F5F] disabled:opacity-60"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";

type SummarizeProps = {
  title: string;
  date: string;
  content: string;
};

type SummaryState = {
  text: string;
  error: string;
  loading: boolean;
};

export default function Summarize({ title, date, content }: SummarizeProps) {
  const [state, setState] = useState<SummaryState>({
    text: "",
    error: "",
    loading: false,
  });

  async function handleSummarize() {
    setState({ text: "", error: "", loading: true });
    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, date, content }),
      });

      const data = (await response.json()) as {
        summary?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "总结生成失败，请稍后重试。");
      }

      if (!data.summary) {
        throw new Error("未返回总结内容，请稍后重试。");
      }

      setState({ text: data.summary, error: "", loading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "总结生成失败，请稍后重试。";
      setState({ text: "", error: message, loading: false });
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSummarize}
          disabled={state.loading}
          className="rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          AI 总结（中文）
        </button>
        {state.loading ? (
          <span className="text-sm text-slate-500">正在生成总结…</span>
        ) : null}
      </div>

      {state.error ? (
        <p className="mt-3 text-sm text-rose-600">{state.error}</p>
      ) : null}

      {state.text ? (
        <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-700">
          {state.text}
        </div>
      ) : null}
    </section>
  );
}

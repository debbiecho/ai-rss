import Link from "next/link";
import { notFound } from "next/navigation";
import Summarize from "./Summarize";
import {
  formatDateTime,
  getIssueBySlug,
  sanitizeIssueHtml,
} from "@/lib/rss";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function IssuePage({ params }: PageProps) {
  const { slug } = await params;
  const issue = await getIssueBySlug(slug);

  if (!issue) {
    notFound();
  }

  const content = issue.contentHtml
    ? sanitizeIssueHtml(issue.contentHtml)
    : "<p>No content available for this issue.</p>";
  const contentForSummary = issue.contentHtml || "";
  const dateLabel = formatDateTime(issue.date);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-12 text-slate-900">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
        <header className="flex flex-col gap-4">
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500"
          >
            Back to archive
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {issue.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span>{dateLabel}</span>
            {issue.link ? (
              <>
                <span className="text-slate-300">•</span>
                <a
                  href={issue.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-slate-600 hover:text-slate-900"
                >
                  View original on smol.ai
                </a>
              </>
            ) : null}
          </div>
        </header>

        <Summarize
          title={issue.title}
          date={dateLabel}
          content={contentForSummary}
        />

        <article
          className="issue-content rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </main>
  );
}

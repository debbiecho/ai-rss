import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatDateTimeShort,
  getPaginatedIssues,
  groupIssuesByDay,
  PAGE_SIZE,
  type Issue,
} from "@/lib/rss";

type ArchivePageProps = {
  pageNumber: number;
};

export default async function ArchivePage({ pageNumber }: ArchivePageProps) {
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    notFound();
  }

  let issues: Issue[] = [];
  let totalPages = 1;
  let errorMessage = "";

  try {
    const data = await getPaginatedIssues(pageNumber);
    issues = data.issues;
    totalPages = data.totalPages;
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Unable to load the RSS feed right now.";
  }

  if (pageNumber > totalPages) {
    notFound();
  }

  const groups = groupIssuesByDay(issues);
  const lastUpdated = issues[0]?.date ?? null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-12 text-slate-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Daily AI Digest
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            AI RSS Digest
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            Daily AI news issues curated by smol.ai
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span suppressHydrationWarning>
              Last updated {formatDateTimeShort(lastUpdated)}
            </span>
            <span className="text-slate-300">•</span>
            <span>
              Page {pageNumber} of {totalPages}
            </span>
            <span className="text-slate-300">•</span>
            <span>{PAGE_SIZE} per page</span>
          </div>
        </header>

        {errorMessage ? (
          <section className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-rose-900">
            <h2 className="text-lg font-semibold">Feed unavailable</h2>
            <p className="mt-2 text-sm text-rose-800">{errorMessage}</p>
          </section>
        ) : groups.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
            <h2 className="text-lg font-semibold text-slate-800">
              No issues available yet
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Check back later for new daily digests.
            </p>
          </section>
        ) : (
          <section className="flex flex-col gap-8">
            {groups.map((group) => (
              <div key={group.dayKey} className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-slate-200" />
                  <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                    {group.dayLabel}
                  </h2>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="grid gap-4">
                  {group.items.map((issue) => (
                    <article
                      key={issue.id}
                      className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md"
                    >
                      <div className="flex flex-col gap-3">
                        <Link
                          href={`/issues/${issue.slug}`}
                          className="text-xl font-semibold text-slate-900 hover:text-slate-700"
                        >
                          {issue.title}
                        </Link>
                        <p className="text-sm leading-relaxed text-slate-600">
                          {issue.summary}
                        </p>
                        <div className="text-xs text-slate-400">
                          {issue.link ? (
                            <span>Source: smol.ai archive</span>
                          ) : (
                            <span>Internal issue</span>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {!errorMessage && totalPages > 1 ? (
          <nav className="flex items-center justify-between gap-4">
            {pageNumber > 1 ? (
              <Link
                href={pageNumber === 2 ? "/" : `/page/${pageNumber - 1}`}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Previous
              </Link>
            ) : (
              <span className="rounded-full border border-transparent px-4 py-2 text-sm text-slate-400">
                Previous
              </span>
            )}

            <span className="text-sm font-medium text-slate-500">
              Page {pageNumber} of {totalPages}
            </span>

            {pageNumber < totalPages ? (
              <Link
                href={`/page/${pageNumber + 1}`}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Next
              </Link>
            ) : (
              <span className="rounded-full border border-transparent px-4 py-2 text-sm text-slate-400">
                Next
              </span>
            )}
          </nav>
        ) : null}
      </div>
    </main>
  );
}

import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-16 text-slate-900">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          404
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Issue not found
        </h1>
        <p className="text-sm text-slate-600">
          We could not find the issue you were looking for. Try the archive for
          a different date.
        </p>
        <Link
          href="/"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
        >
          Back to archive
        </Link>
      </div>
    </main>
  );
}

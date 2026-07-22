import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)]/70 p-10 text-center">
      <h1 className="text-2xl font-semibold">Profile not found</h1>
      <p className="mt-2 text-[var(--text-muted)]">
        That inventory profile does not exist in the local database.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-xl bg-[var(--accent)] px-4 py-2 font-semibold text-[#042f2e]"
      >
        Back home
      </Link>
    </div>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="et-card p-10 text-center">
      <h1 className="text-2xl font-semibold">Profile not found</h1>
      <p className="mt-2 text-[var(--text-muted)]">
        That inventory profile does not exist in the local database.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-[4px] bg-[var(--accent)] px-4 py-2 font-semibold text-[var(--accent-fg)]"
      >
        Back home
      </Link>
    </div>
  );
}

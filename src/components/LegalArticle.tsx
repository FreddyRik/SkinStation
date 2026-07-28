import type { ReactNode } from "react";

interface LegalArticleProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalArticle({ title, lastUpdated, children }: LegalArticleProps) {
  return (
    <article className="mx-auto max-w-3xl">
      <header className="mb-8 border-b border-[var(--border)]/70 pb-6">
        <h1 className="font-[family-name:var(--font-share-display)] text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Last updated: {lastUpdated}</p>
      </header>
      <div className="space-y-8 text-[var(--text-muted)] [&_h2]:mb-3 [&_h2]:font-[family-name:var(--font-share-display)] [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[var(--text)] [&_li]:leading-relaxed [&_p]:leading-relaxed [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </article>
  );
}

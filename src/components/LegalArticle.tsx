import type { ReactNode } from "react";

interface LegalArticleProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalArticle({ title, lastUpdated, children }: LegalArticleProps) {
  return (
    <article className="mx-auto max-w-3xl">
      <header className="mb-8 pb-6 shadow-[inset_0_-1px_0_rgba(200,121,65,0.12)]">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Last updated: {lastUpdated}</p>
      </header>
      <div className="space-y-8 text-[var(--text-muted)] [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[var(--text)] [&_li]:leading-relaxed [&_p]:leading-relaxed [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </article>
  );
}

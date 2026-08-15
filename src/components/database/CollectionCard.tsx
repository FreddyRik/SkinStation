import Link from "next/link";
import { collectionHref } from "@/components/database/catalog-links";
import type { CollectionCardProps } from "@/types/catalog-ui";

export function CollectionCard({
  id,
  image,
  name,
  itemCount,
}: CollectionCardProps) {
  return (
    <li>
      <Link
        href={collectionHref(id)}
        className="rarity-frame group flex h-full flex-col items-center rounded-2xl border bg-[var(--bg-elevated)]/40 px-3 pb-3 pt-4 text-center"
      >
        <p className="type-overline">Collection</p>
        <p className="type-card-title mt-1 line-clamp-2 min-h-[2.5rem] text-base leading-snug transition group-hover:text-[var(--accent)] sm:text-lg">
          {name}
        </p>
        <div className="my-4 flex h-36 w-full items-center justify-center sm:h-44">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt=""
              className="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <span className="type-overline">No image</span>
          )}
        </div>
        <p className="type-metric mt-auto text-[11px] text-[var(--text-muted)]">
          {itemCount.toLocaleString("en-US")} items
        </p>
      </Link>
    </li>
  );
}

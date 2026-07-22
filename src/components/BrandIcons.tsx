/** Small brand marks used in reputation chips (inline SVG — no CDN). */

type IconProps = {
  className?: string;
  title?: string;
};

export function SteamBrandIcon({ className = "h-3.5 w-3.5", title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path
        fill="currentColor"
        d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.345 15.27C1.612 20.302 6.385 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0zM7.54 18.205l-1.58-.653c.297.76.908 1.385 1.703 1.655a2.374 2.374 0 002.563-.541 2.374 2.374 0 00.541-2.563 2.372 2.372 0 00-1.655-1.703l1.626.672a1.996 1.996 0 01-1.053 3.747 1.997 1.997 0 01-1.145-.614zm9.214-6.777c-1.662 0-3.016-1.353-3.016-3.016s1.353-3.016 3.016-3.016 3.016 1.353 3.016 3.016-1.353 3.016-3.016 3.016zm0-4.912c-1.047 0-1.897.85-1.897 1.897s.85 1.897 1.897 1.897 1.897-.85 1.897-1.897-.85-1.897-1.897-1.897z"
      />
    </svg>
  );
}

/** FACEIT “F” mark — used alongside skill-level icons. */
export function FaceitBrandIcon({ className = "h-3.5 w-3.5", title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path
        fill="currentColor"
        d="M24 2.4v19.2H0V2.4h24zM9.408 13.776H7.536V9.36h4.704V7.536H5.712v8.928h3.696v-2.688zm8.88-6.24h-5.952v8.928h1.824v-3.456h3.552v-1.824h-3.552V9.36h4.128V7.536z"
      />
    </svg>
  );
}

/** Simplified Leetify mark (L in rounded square). */
export function LeetifyBrandIcon({ className = "h-3.5 w-3.5", title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <rect x="2" y="2" width="20" height="20" rx="5" fill="currentColor" opacity="0.22" />
      <path
        fill="currentColor"
        d="M8.2 6.5h2.35v8.25H15.8V17h-7.6V6.5z"
      />
    </svg>
  );
}

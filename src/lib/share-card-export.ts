import { toPng } from "html-to-image";

/**
 * Export the share card node to a PNG with transparent corners so the
 * rounded card edges aren't framed by a solid square fill.
 */
export async function exportShareCardPng(node: HTMLElement): Promise<string> {
  const images = [...node.querySelectorAll("img")];
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }),
    ),
  );
  // Let layout / fonts settle before capture.
  await new Promise((r) => setTimeout(r, 120));

  return toPng(node, {
    cacheBust: true,
    // Image proxy URLs differ only by ?url=… — include query in the cache key
    // or every skin/sticker/avatar becomes the first image (e.g. gloves).
    includeQueryParams: true,
    pixelRatio: 2,
    // Omit solid backgroundColor so corners outside border-radius stay transparent.
    style: {
      overflow: "hidden",
      // Soften export: drop outer shadow so it doesn't paint into transparent corners.
      boxShadow: "none",
    },
  });
}

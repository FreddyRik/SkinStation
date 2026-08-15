/** Narrow CustomEvent detail without `as` casts at call sites. */

export function customEventDetail<T>(event: Event): T | undefined {
  if (!("detail" in event)) return undefined;
  return (event as CustomEvent<T>).detail;
}

export function queryHtmlElement(
  root: ParentNode | null | undefined,
  selector: string,
): HTMLElement | null {
  const node = root?.querySelector(selector);
  return node instanceof HTMLElement ? node : null;
}

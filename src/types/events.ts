/** Narrow a DOM Event to a CustomEvent and return its detail. */
export function customEventDetail<T>(event: Event): T | undefined {
  if (!("detail" in event)) return undefined;
  return (event as CustomEvent<T>).detail;
}

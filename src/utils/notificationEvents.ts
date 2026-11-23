export function claimNotificationEvent(
  seenEvents: Set<string>,
  eventId: string | null | undefined,
): boolean {
  if (!eventId || seenEvents.has(eventId)) return false;
  if (seenEvents.size >= 100) {
    const oldestEvent = seenEvents.values().next().value;
    if (oldestEvent) seenEvents.delete(oldestEvent);
  }
  seenEvents.add(eventId);
  return true;
}
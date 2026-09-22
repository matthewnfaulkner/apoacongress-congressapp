export function roomSubtitle(room: { official_name?: string | null; floor?: string | null } | null | undefined): string | null {
  if (!room) return null;
  const officialName = room.official_name?.trim() || null;
  const floor = room.floor?.trim() || null;

  if (officialName && floor) return `${officialName} - ${floor}F`;
  if (officialName) return officialName;
  if (floor) return `${floor}F`;
  return null;
}

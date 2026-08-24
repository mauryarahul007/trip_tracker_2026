// Deterministic per-person color, the same idea Microsoft Teams uses for
// initials avatars: hash the name to a stable index into a fixed palette,
// so the same person always gets the same color everywhere in the app
// (list rows, member cards, the trip picker, the expense form) without
// storing anything — no photo needed, and it stays stable across sessions
// since it's derived purely from the name.
const AVATAR_PALETTE = [
  '#2F6FED', // skyline blue
  '#B98A3E', // brass
  '#5B7FBD', // slate blue
  '#8B5FBF', // violet
  '#C16E5C', // terracotta
  '#4F9B6E', // sage green
  '#B5548E', // rose
  '#3D8FA6', // teal-blue
  '#A6763D', // amber-brown
  '#6B7FA0', // dusty blue
];

export function avatarColorForName(name: string): string {
  const normalized = name.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

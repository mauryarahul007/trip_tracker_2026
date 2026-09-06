export function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

// Two-letter initials from a display name or email, for avatar chips.
export function initialsFrom(nameOrEmail: string): string {
  const namePart = nameOrEmail.split('@')[0];
  const words = namePart.split(/[.\s_-]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return namePart.slice(0, 2).toUpperCase();
}

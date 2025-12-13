/**
 * User Display Utilities
 *
 * Shared helper functions for displaying user information.
 * Used by components like AppSidebar and available for testing.
 */

/**
 * Get display name for user
 * Falls back to email username if name is not set
 */
export function getDisplayName(user: { name: string | null; email: string }): string {
  if (user.name) {
    return user.name;
  }
  // Extract username from email (before @)
  const username = user.email.split("@")[0];
  // Return "User" if username is empty (e.g., "@example.com" or "")
  return username && username.length > 0 ? username : "User";
}

/**
 * Get user initials for avatar
 * Returns 2 uppercase letters based on name or email username
 * Falls back to "??" if unable to generate initials
 */
export function getUserInitials(user: { name: string | null; email: string }): string {
  const displayName = getDisplayName(user);

  // Handle fallback case where displayName is "User" from edge cases
  if (displayName === "User" && !user.name) {
    return "??";
  }

  const parts = displayName.split(/\s+/).filter((part) => part.length > 0);
  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? "?";
    const second = parts[1]?.[0] ?? "?";
    return `${first}${second}`.toUpperCase();
  }

  // Single word - take first two chars, pad with "?" if needed
  const initials = displayName.slice(0, 2);
  if (initials.length === 0) return "??";
  if (initials.length === 1) return `${initials}?`.toUpperCase();
  return initials.toUpperCase();
}

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
  return user.email.split("@")[0] ?? "User";
}

/**
 * Get user initials for avatar
 * Returns 2 uppercase letters based on name or email username
 */
export function getUserInitials(user: { name: string | null; email: string }): string {
  const displayName = getDisplayName(user);
  const parts = displayName.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}

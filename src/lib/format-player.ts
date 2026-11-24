/**
 * Formats a player's name as First Name + Last Initial for public board privacy.
 * Example: ("Serena", "Williams") => "Serena W."
 */
export const formatPlayerPrivacyName = (
  firstName?: string | null,
  lastName?: string | null
): string => {
  if (!firstName || !firstName.trim()) {
    return "";
  }

  const cleanFirst = firstName.trim();
  const cleanLast = lastName ? lastName.trim() : "";

  if (!cleanLast) {
    return cleanFirst;
  }

  const lastInitial = cleanLast.charAt(0).toUpperCase();
  return `${cleanFirst} ${lastInitial}.`;
};

/**
 * Parses a full name string ("First Last") into { firstName, lastName }
 */
export const parseFullName = (
  rawName: string
): { firstName: string; lastName: string; fullName: string } => {
  const trimmed = rawName.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return { firstName: "", lastName: "", fullName: "" };
  }

  const parts = trimmed.split(" ");
  if (parts.length === 1) {
    // Single name: keep it as-is rather than inventing a last name.
    return {
      firstName: parts[0],
      lastName: "",
      fullName: parts[0],
    };
  }

  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
  };
};

/**
 * Formats a free-text opponent name the same way as roster names.
 * "Jordan Smith" => "Jordan S."
 */
export const formatOpponentPrivacyName = (
  rawName?: string | null
): string | null => {
  if (!rawName || !rawName.trim()) return null;
  const { firstName, lastName } = parseFullName(rawName);
  const formatted = formatPlayerPrivacyName(firstName, lastName);
  return formatted || null;
};

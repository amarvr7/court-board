/**
 * Extracts the player's last name and optional trailing coach name.
 * Examples:
 * - "Pazos (MD) - Jakub" => { lastName: "Pazos", coachName: "Jakub" }
 * - "Pazos -(Jakub)" => { lastName: "Pazos", coachName: "Jakub" }
 * - "Williams" => { lastName: "Williams", coachName: null }
 */
export const extractLastNameAndCoach = (
  rawLastName?: string | null
): { lastName: string; coachName: string | null } => {
  const trimmed = rawLastName ? rawLastName.trim() : "";
  if (!trimmed) {
    return { lastName: "", coachName: null };
  }

  const coachMatch = trimmed.match(
    /^(.*?)(?:(?:^|\s+|\))[-–—]\s*\(?([^()]+?)\)?|[-–—]\s*\(([^()]+?)\))\s*$/
  );

  if (!coachMatch) {
    const cleanLast = trimmed.replace(/\([^)]*\)/g, "").trim();
    return { lastName: cleanLast, coachName: null };
  }

  const rawLastPart = coachMatch[1] ?? "";
  const cleanLast = rawLastPart.replace(/\([^)]*\)/g, "").trim();
  const coachName = (coachMatch[2] ?? coachMatch[3] ?? "").trim();

  return {
    lastName: cleanLast,
    coachName: coachName || null,
  };
};

/**
 * Formats a player's name as First Name + Last Initial (+ optional "- Coach")
 * for public board privacy.
 * Examples:
 * - ("Serena", "Williams") => "Serena W."
 * - ("Alejandro", "Pazos (MD) - Jakub") => "Alejandro P. - Jakub"
 */
export const formatPlayerPrivacyName = (
  firstName?: string | null,
  lastName?: string | null
): string => {
  if (!firstName || !firstName.trim()) {
    return "";
  }

  const cleanFirst = firstName.trim();
  const { lastName: cleanLast, coachName } = extractLastNameAndCoach(lastName);

  const baseName = cleanLast
    ? `${cleanFirst} ${cleanLast.charAt(0).toUpperCase()}.`
    : cleanFirst;

  if (!coachName) {
    return baseName;
  }

  return `${baseName} - ${coachName}`;
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

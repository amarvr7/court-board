import {
  formatOpponentPrivacyName,
  formatPlayerPrivacyName,
} from "@/lib/format-player";

export interface MatchLineInput {
  courtName: string;
  status: string;
  playerFirstName?: string | null;
  playerLastName?: string | null;
  playerPrivacyName?: string | null;
  partnerFirstName?: string | null;
  partnerLastName?: string | null;
  partnerPrivacyName?: string | null;
  opponentName?: string | null;
  opponentPartnerName?: string | null;
}

const ourSideLabel = (match: MatchLineInput): string => {
  const player =
    match.playerPrivacyName ||
    formatPlayerPrivacyName(match.playerFirstName, match.playerLastName) ||
    "TBD";
  const partner =
    match.partnerPrivacyName ||
    formatPlayerPrivacyName(match.partnerFirstName, match.partnerLastName);
  return partner ? `${player} / ${partner}` : player;
};

const opponentSideLabel = (match: MatchLineInput): string => {
  const opponent = formatOpponentPrivacyName(match.opponentName) || "TBD";
  const partner = formatOpponentPrivacyName(match.opponentPartnerName);
  return partner ? `${opponent} / ${partner}` : opponent;
};

/** One short-name line for email / WhatsApp copy. */
export const formatMatchLine = (match: MatchLineInput): string => {
  return `${ourSideLabel(match)} – ${match.courtName} vs ${opponentSideLabel(match)} (${match.status})`;
};

export const formatEmailSubject = (when: Date = new Date()): string => {
  const weekday = when.toLocaleDateString("en-US", { weekday: "short" });
  const month = when.toLocaleDateString("en-US", { month: "short" });
  const day = when.getDate();
  const time = when.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `ITC courts – ${weekday} ${month} ${day}, ${time}`;
};

export const buildCoachEmailBody = (
  matches: MatchLineInput[],
  boardUrl: string
): string => {
  const lines =
    matches.length > 0
      ? matches.map(formatMatchLine)
      : ["No matches on the board right now."];

  return [
    ...lines,
    "",
    `Board: ${boardUrl}`,
    "Team PIN is posted at the desk.",
  ].join("\n");
};

export const minutesSince = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((Date.now() - then) / 60000));
};

export const formatElapsedLabel = (
  status: string,
  statusChangedAt: string | null | undefined
): string => {
  const mins = minutesSince(statusChangedAt);
  if (mins === null) return status;
  return `${status} · ${mins} min`;
};

const MOVED_WINDOW_MS = 30 * 60 * 1000;

export const formatMovedTag = (
  movedAt: string | null | undefined
): string | null => {
  if (!movedAt) return null;
  const then = new Date(movedAt).getTime();
  if (Number.isNaN(then)) return null;
  const age = Date.now() - then;
  if (age < 0 || age > MOVED_WINDOW_MS) return null;
  const mins = Math.max(0, Math.floor(age / 60000));
  return `Moved · ${mins} min ago`;
};

/**
 * Finds any player who would end up on more than one court (or twice on the
 * same court). Used by single-court edits and the CSV upload.
 *
 * Player keys can be database ids (numbers) or temporary keys (strings) for
 * players that a CSV upload is about to create.
 */
export type PlayerKey = number | string;

export interface CourtAssignment {
  courtName: string;
  playerIds: Array<PlayerKey | null | undefined>;
}

export interface AssignmentConflict<K extends PlayerKey = PlayerKey> {
  playerId: K;
  courtNames: string[];
}

export const findAssignmentConflicts = (
  assignments: CourtAssignment[]
): AssignmentConflict[] => {
  const courtsByPlayer = new Map<PlayerKey, string[]>();

  for (const { courtName, playerIds } of assignments) {
    for (const id of playerIds) {
      if (id === null || id === undefined) continue;
      const list = courtsByPlayer.get(id) ?? [];
      list.push(courtName);
      courtsByPlayer.set(id, list);
    }
  }

  const conflicts: AssignmentConflict[] = [];
  for (const [playerId, courtNames] of courtsByPlayer) {
    if (courtNames.length > 1) conflicts.push({ playerId, courtNames });
  }
  return conflicts;
};

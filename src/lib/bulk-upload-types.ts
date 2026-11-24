/**
 * One row of the order-of-play CSV after the browser has read it.
 * Our side = player (+ partner for doubles)
 * Opponent side = free-text opponent (+ opponentPartner)
 */
export interface BulkUploadRow {
  courtName?: string;
  status?: string;
  /** Our player (must already be on the roster) */
  player?: string;
  /** Opponent free text */
  opponent?: string;
  /** Our partner (must already be on the roster) */
  partner?: string;
  /** Opponent's partner free text */
  opponentPartner?: string;
}

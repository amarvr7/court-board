/**
 * One row of the order-of-play CSV after the browser has read it.
 * Side A = player1 (+ player1Partner for doubles)
 * Side B = player2 (+ player2Partner for doubles)
 */
export interface BulkUploadRow {
  courtName?: string;
  status?: string;
  player1?: string;
  player2?: string;
  player1Partner?: string;
  player2Partner?: string;
  player1FirstName?: string;
  player1LastName?: string;
  player2FirstName?: string;
  player2LastName?: string;
}

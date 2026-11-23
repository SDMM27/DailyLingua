/** What the server knows of a learner's progress in one unit (a read model; the screens never write it). */
export interface UnitProgressView {
  /** Validated steps by key (`"l1:dialogue"`), with the instant of validation. */
  steps: Record<string, string>;
  /** Best score of the test (0 to 10), or null before a first test. */
  bestScore: number | null;
  testAttempts: number;
  /** When the test was first passed, or null. */
  passedAt: string | null;
}

/** The progress of a user in a unit, or null when nothing is recorded yet. */
export async function loadUnitProgress(userId: string, unitId: string): Promise<UnitProgressView | null> {
  // TODO(lot B): read app.unit_progress via @dailylingua/data getUnitProgressOne
  void userId;
  void unitId;
  return null;
}

/**
 * IndexedDB database names. The event queue and the session packets are per user (`j2-pr1-lot-w.md`, D8): two accounts
 * on one phone must never mix, and the events of A must never leave with the cookie of B. The `/lab` page keeps its
 * own database (`dailylingua-offline`) and its stand-in sender.
 */
export const eventQueueDatabaseName = (userId: string) => `dailylingua-events-${userId}`;
export const sessionPacketDatabaseName = (userId: string) => `dailylingua-session-${userId}`;

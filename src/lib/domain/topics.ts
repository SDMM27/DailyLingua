import { TOPICS, type Topic } from "@/lib/schemas/preferences";

/** A domain is offered for the next mission when at least this many contents of the right level exist. */
export const MIN_TOPIC_CONTENTS = 3;

/** The domains with at least `minimum` contents, in the order of `TOPICS`. */
export function availableTopics(counts: Partial<Record<Topic, number>>, minimum = MIN_TOPIC_CONTENTS): Topic[] {
  return TOPICS.filter((topic) => (counts[topic] ?? 0) >= minimum);
}

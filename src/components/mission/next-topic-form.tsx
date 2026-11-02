"use client";

import { useState, useTransition } from "react";
import { setNextTopic } from "@/app/actions/next-topic";
import { topicLabel } from "@/lib/domain/labels";
import { MISSION_READY_MESSAGE } from "@/lib/schemas/mission-request";
import { TOPICS, type Topic } from "@/lib/schemas/preferences";

const NO_PREFERENCE = "";
const NO_PREFERENCE_LABEL = "Au hasard de mes sujets";

/**
 * The domain of the next mission of one language. Saved as soon as it changes; a refused change
 * goes back to the previous value with the reason below the field. When the server says the
 * mission of that day is already written, the choice is shown as fixed.
 */
export function NextTopicForm({
  language,
  label,
  saved,
  available,
  frozen = false,
}: {
  language: string;
  /** Accessible name of the field (language and day). */
  label: string;
  saved: Topic | null;
  /** Domains with enough contents at the learner's level; the others cannot be picked. */
  available: readonly Topic[];
  /** The mission of that day exists already. */
  frozen?: boolean;
}) {
  const [value, setValue] = useState<Topic | null>(saved);
  const [isFrozen, setFrozen] = useState(frozen);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function change(next: string) {
    const topic = next === NO_PREFERENCE ? null : (next as Topic);
    const previous = value;
    setValue(topic);
    setError(null);
    startTransition(async () => {
      const result = await setNextTopic({ language, topic });
      if (result.ok) return;
      setValue(previous);
      if (result.error === MISSION_READY_MESSAGE) setFrozen(true);
      else setError(result.error);
    });
  }

  if (isFrozen) {
    return (
      <p className="text-sm text-ink-soft">
        Mission prête : {value ? topicLabel(value) : "au hasard"}
      </p>
    );
  }

  return (
    <div>
      <select
        aria-label={label}
        value={value ?? NO_PREFERENCE}
        disabled={pending}
        onChange={(e) => change(e.target.value)}
        className="min-h-11 w-full appearance-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base font-semibold focus:border-ink-soft focus:outline-none disabled:opacity-60"
      >
        <option value={NO_PREFERENCE}>{NO_PREFERENCE_LABEL}</option>
        {TOPICS.map((topic) => {
          // The saved value stays selectable even when its contents became rare.
          const usable = available.includes(topic) || topic === value;
          return (
            <option key={topic} value={topic} disabled={!usable}>
              {topicLabel(topic)}
              {usable ? "" : " (peu de contenus)"}
            </option>
          );
        })}
      </select>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import type { SocialResult } from "@/app/actions/social";

/** Runs a social server action: `pending` while it runs, `failed` when it could not be done at all (a status is not a failure). */
export function useSocialAction() {
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function run(action: () => Promise<SocialResult>, done?: (result: { status: string; code?: string }) => void) {
    setFailed(false);
    startTransition(async () => {
      try {
        const result = await action();
        if ("error" in result) {
          setFailed(true);
          return;
        }
        done?.(result);
      } catch {
        setFailed(true);
      }
    });
  }

  return { run, pending, failed };
}

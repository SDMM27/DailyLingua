"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** Loads the current address again: from the offline page, that is the page the visitor asked for. */
export function RetryButton({ children }: { children: ReactNode }) {
  return <Button onClick={() => window.location.reload()}>{children}</Button>;
}

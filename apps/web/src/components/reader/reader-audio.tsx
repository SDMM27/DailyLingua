"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

export function ReaderAudio({ path }: { path: string | null }) {
  const t = useTranslations("reader");
  const [failed, setFailed] = useState(false);

  if (!path) return <p className="text-sm text-muted">{t("audioPending")}</p>;
  return (
    <>
      {/* The full source text is the transcript, immediately below the player. */}
      <audio src={path} preload="none" controls aria-label={t("audioLabel")} className="block w-full"
        onError={() => setFailed(true)} onPlaying={() => setFailed(false)} />
      {failed && <p role="status" className="text-sm text-muted">{t("audioUnavailable")}</p>}
    </>
  );
}

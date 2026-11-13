import { isTargetLanguage, languageDisplayName, languageInfo } from "@dailylingua/core";
import { DataError, listEnrollments } from "@dailylingua/data";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { EnvironmentCard } from "@/components/lab/environment-card";
import { MicrophoneCard } from "@/components/lab/microphone-card";
import { NotificationsCard } from "@/components/lab/notifications-card";
import { QueueCard } from "@/components/lab/queue-card";
import { RecognitionCard } from "@/components/lab/recognition-card";
import { VoicesCard } from "@/components/lab/voices-card";
import { vapidPublicKey } from "@/lib/push/env";
import { getRequestClient, getSessionUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("lab");
  return { title: t("title") };
}

/**
 * Prototype page: checks, one card per check, what a real phone lets the app do (installation,
 * microphone, speech, notifications, offline queue). Signed-in users only. It reads the language
 * learned and nothing else about the learner; no result is sent to or stored on the server.
 */
export default async function LabPage() {
  // The VAPID key is read from the environment at request time.
  await connection();
  if (!(await getSessionUser())) redirect("/sign-in");

  const client = await getRequestClient();
  let language: string | undefined;
  try {
    language = (await listEnrollments(client))[0]?.language;
  } catch (error) {
    if (error instanceof DataError && error.code === "unauthenticated") redirect("/sign-in");
    throw error;
  }
  if (!language || !isTargetLanguage(language)) redirect("/welcome");

  const [locale, t] = await Promise.all([getLocale(), getTranslations("lab")]);
  const info = languageInfo(language);
  const languageName = languageDisplayName(language, locale);

  return (
    <>
      <h1 className="sd-display text-3xl">{t("title")}</h1>
      <p className="mt-3 text-muted">{t("intro")}</p>

      <div className="mt-8 space-y-4">
        <EnvironmentCard />
        <MicrophoneCard />
        <VoicesCard
          language={language}
          languageName={languageName}
          phrase={info.greeting}
          regions={"speechRegions" in info ? info.speechRegions : undefined}
        />
        <RecognitionCard language={language} languageName={languageName} />
        <NotificationsCard vapidPublicKey={vapidPublicKey()} />
        <QueueCard />
      </div>
    </>
  );
}

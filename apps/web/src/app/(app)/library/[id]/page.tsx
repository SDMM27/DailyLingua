import { listEnrollments, readReaderText } from "@dailylingua/data";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { ReadingText } from "@/components/reader/reading-text";
import { readerWords } from "@/lib/reader/words";
import { getRequestClient, getSessionProfile, getSessionUser } from "@/lib/session";

export default async function ReaderPage({ params }: PageProps<"/library/[id]">) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const client = await getRequestClient();
  const [text, profile, enrollments, t] = await Promise.all([
    readReaderText(client, id.data), getSessionProfile(), listEnrollments(client), getTranslations("reader"),
  ]);
  if (!profile) redirect("/welcome");
  if (!text || !enrollments.some(({ language }) => language === text.language)) notFound();
  return (
    <>
      <Link href="/library" className="mb-5 inline-flex min-h-11 items-center text-accent-strong">{t("library")}</Link>
      <p className="meta">{text.level_band}</p>
      <h1 className="sd-display mb-6 break-words text-4xl" lang={text.language} dir="auto">{text.title}</h1>
      <ReadingText key={text.id} userId={user.id} textId={text.id} body={text.body} language={text.language}
        words={readerWords(text.body, text.new_words, text.language, profile.nativeLanguage, profile.knownLanguages)} />
    </>
  );
}

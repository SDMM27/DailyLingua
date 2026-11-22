import { listEnrollments, listReaderTexts } from "@dailylingua/data";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getRequestClient, getSessionUser } from "@/lib/session";

export default async function LibraryPage() {
  if (!(await getSessionUser())) redirect("/sign-in");
  const client = await getRequestClient();
  const enrollments = await listEnrollments(client);
  const [t, texts] = await Promise.all([
    getTranslations("reader"), listReaderTexts(client, enrollments.map(({ language }) => language)),
  ]);
  return (
    <>
      <h1 className="sd-display mb-6 text-4xl">{t("library")}</h1>
      {texts.length === 0 ? <p className="text-muted">{t("empty")}</p> : (
        <ul className="space-y-3">
          {texts.map((text) => (
            <li key={text.id}>
              <Link href={`/library/${text.id}`} className="block rounded-card border border-line bg-surface p-4">
                <span className="meta">{text.level_band}</span>
                <span className="sd-display block break-words text-2xl" lang={text.language} dir="auto">{text.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

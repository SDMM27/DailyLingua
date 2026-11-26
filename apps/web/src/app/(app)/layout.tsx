import { TabBar } from "@/components/layout/tab-bar";
import { EventSyncProvider } from "@/components/pwa/event-sync-provider";
import { getProgressLanguages } from "@/lib/progress-languages";
import { getSessionUser } from "@/lib/session";
import { getPathLanguage } from "@/lib/units/path-access";

/**
 * Signed-in screens with the tab bar (Today, Path when the learner has one, Library, Progress for the pilot, Settings). The installation
 * (/welcome) has none. The events of the signed-in user are delivered from here, whatever screen is shown (no visible
 * interface).
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  const [pathLanguage, hasProgress] = user
    ? await Promise.all([getPathLanguage(), getProgressLanguages().then(({ pilots }) => pilots.length > 0).catch(() => false)])
    : [null, false] as const;
  const screens = (
    <>
      <main className="mx-auto w-full max-w-md px-5 has-[.progress-page]:max-w-6xl pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <TabBar pathLanguage={pathLanguage} hasProgress={hasProgress} />
    </>
  );
  return user ? <EventSyncProvider userId={user.id}>{screens}</EventSyncProvider> : screens;
}

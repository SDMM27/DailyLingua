import { TabBar } from "@/components/layout/tab-bar";
import { EventSyncProvider } from "@/components/pwa/event-sync-provider";
import { getProgressLanguages } from "@/lib/progress-languages";
import { getSessionUser } from "@/lib/session";
import { getPathLanguage } from "@/lib/units/path-access";

/**
 * Signed-in screens with the tab bar (Today, Path when the learner has one, Library, Progress for the pilot, Settings). From 1024 px the bar becomes a side bar and the content widens to 672 px (Progress to 72rem), a comfortable line for the reader. The installation
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
      <div className="lg:pl-56">
        <main className="mx-auto w-full max-w-md px-5 has-[.progress-page]:max-w-6xl pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))] lg:max-w-2xl lg:has-[.progress-page]:max-w-6xl lg:px-8 lg:pt-10 lg:pb-12">
          {children}
        </main>
      </div>
      <TabBar pathLanguage={pathLanguage} hasProgress={hasProgress} />
    </>
  );
  return user ? <EventSyncProvider userId={user.id}>{screens}</EventSyncProvider> : screens;
}

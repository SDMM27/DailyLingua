import { TabBar } from "@/components/layout/tab-bar";
import { EventSyncProvider } from "@/components/pwa/event-sync-provider";
import { getPathLanguage } from "@/lib/units/path-access";
import { getSessionUser } from "@/lib/session";

/**
 * Signed-in screens with the tab bar (Today, Path when the learner has one, Library, Settings). The installation
 * (/welcome) has none. The events of the signed-in user are delivered from here, whatever screen is shown (no visible
 * interface).
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  const pathLanguage = user ? await getPathLanguage() : null;
  const screens = (
    <>
      <main className="mx-auto w-full max-w-md px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <TabBar pathLanguage={pathLanguage} />
    </>
  );
  return user ? <EventSyncProvider userId={user.id}>{screens}</EventSyncProvider> : screens;
}

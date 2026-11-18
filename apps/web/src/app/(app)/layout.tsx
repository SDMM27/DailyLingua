import { TabBar } from "@/components/layout/tab-bar";
import { EventSyncProvider } from "@/components/pwa/event-sync-provider";
import { getSessionUser } from "@/lib/session";

/**
 * Signed-in screens with the tab bar (Today, Settings). The installation (/welcome) has none. The events of the signed-in
 * user are delivered from here, whatever screen is shown (no visible interface).
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  const screens = (
    <>
      <main className="mx-auto w-full max-w-md px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <TabBar />
    </>
  );
  return user ? <EventSyncProvider userId={user.id}>{screens}</EventSyncProvider> : screens;
}

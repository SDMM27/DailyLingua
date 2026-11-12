import { TabBar } from "@/components/layout/tab-bar";

/** Signed-in screens with the tab bar (Today, Settings). The installation (/welcome) has none. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="mx-auto w-full max-w-md px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <TabBar />
    </>
  );
}

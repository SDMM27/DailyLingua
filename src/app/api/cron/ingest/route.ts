import { handleCronRequest } from "../run-job";
import { createSupabaseContentStore } from "@/lib/content/supabase-store";
import { readContentLicensePolicy } from "@/lib/content/policy";
import { runIngestJob } from "@/lib/jobs";

export const maxDuration = 300;

/** RSS / Atom ingestion, every 6 hours (see .github/workflows/scheduled-jobs.yml). */
export async function GET(request: Request) {
  return handleCronRequest(request, "ingest", async (admin) => {
    const { status, stats } = await runIngestJob({
      store: createSupabaseContentStore(admin),
      policy: readContentLicensePolicy(),
    });
    return { status, stats };
  });
}

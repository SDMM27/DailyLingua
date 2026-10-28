import { handleCronRequest } from "../run-job";
import { createSupabaseContentStore } from "@/lib/content/supabase-store";
import { readContentLicensePolicy } from "@/lib/content/policy";
import { createClaudeTopicClassifier } from "@/lib/generation/content-topics";
import { readContentTopicsConfig } from "@/lib/generation/config";
import { runIngestJob } from "@/lib/jobs";

export const maxDuration = 300;

/** RSS / Atom ingestion, every 6 hours (see .github/workflows/scheduled-jobs.yml). */
export async function GET(request: Request) {
  return handleCronRequest(request, "ingest", async (admin) => {
    const store = createSupabaseContentStore(admin);
    const topicsConfig = readContentTopicsConfig();
    const { status, stats } = await runIngestJob({
      store,
      policy: readContentLicensePolicy(),
      topics: topicsConfig.enabled
        ? {
            store,
            classifier: createClaudeTopicClassifier({ apiKeys: topicsConfig.apiKeys, model: topicsConfig.model }),
            // 5 sequential batches at most, so the run stays well inside maxDuration after the feeds;
            // the backlog goes through `npm run content:topics -- --backfill`.
            limit: 100,
          }
        : undefined,
    });
    return { status, stats };
  });
}

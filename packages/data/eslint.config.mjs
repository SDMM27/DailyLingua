import { domainConfig } from "../eslint.base.mjs";

// The data package is the one that talks to Supabase (it receives a client, it never creates one).
export default domainConfig({ allowSupabase: true });

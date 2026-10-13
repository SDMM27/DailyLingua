// Next.js does not load .env.local in test mode, so load it here (existing variables win).
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: integration tests against the local database will be skipped.
}

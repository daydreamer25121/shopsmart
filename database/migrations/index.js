/**
 * Migration entrypoint (demo scaffold).
 * In a real project you would version changes and apply them incrementally.
 */

async function runMigrations() {
  // No-op for demo scaffold.
  return;
}

runMigrations()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("[migrations] done");
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[migrations] failed:", err);
    process.exit(1);
  });


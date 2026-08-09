require('module').Module._cache[require.resolve('server-only')] = {
  id: require.resolve('server-only'),
  filename: require.resolve('server-only'),
  loaded: true,
  exports: {}
};

async function run() {
  const { getDb } = await import("../src/server/db/index.js");
  console.log("Triggering DB initialization to run migrations...");
  const db = getDb();
  console.log("Migration finished.");
}

run().catch(console.error);

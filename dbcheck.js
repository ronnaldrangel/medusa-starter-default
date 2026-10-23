const url = process.env.DATABASE_URL || "";
const safe = url.replace(/:\/\/([^:]+):[^@]+@/, "://$1:***@");
console.log("url:", safe);
console.log("PGSSLMODE:", process.env.PGSSLMODE || "unset", "| DATABASE_SSL:", process.env.DATABASE_SSL || "unset");

async function probe(label, config) {
  const knex = require("knex")({ client: "pg", ...config, pool: { min: 0, max: 2 } });
  const t0 = Date.now();
  try {
    const r = await Promise.race([
      knex.raw("SELECT 1 AS ok"),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout_15s")), 15000)),
    ]);
    console.log(`${label}: OK ${Date.now() - t0}ms`, JSON.stringify(r.rows[0]));
  } catch (e) {
    console.log(`${label}: FAIL ${Date.now() - t0}ms ${e.message}`);
  } finally {
    await knex.destroy().catch(() => {});
  }
}

(async () => {
  await probe("plain", { connection: url });
  await probe("sslmode_disable", { connection: url + (url.includes("?") ? "&" : "?") + "sslmode=disable" });
  await probe("ssl_true", { connection: { connectionString: url, ssl: { rejectUnauthorized: false } } });
  console.log("RESULT: done");
})();

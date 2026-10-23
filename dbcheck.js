const { Client } = require("pg");

const url = process.env.DATABASE_URL || "";
const safe = url.replace(/:\/\/([^:]+):[^@]+@/, "://$1:***@");
console.log("url:", safe);

async function testPgClient() {
  const t0 = Date.now();
  const c = new Client({ connectionString: url, connectionTimeoutMillis: 15000 });
  try {
    await c.connect();
    const r = await c.query("SELECT 1 AS ok");
    console.log(`pg_client: OK ${Date.now() - t0}ms`, JSON.stringify(r.rows[0]));
  } catch (e) {
    console.log(`pg_client: FAIL ${Date.now() - t0}ms`, e.code || "", e.message);
  } finally {
    await c.end().catch(() => {});
  }
}

async function testKnexString() {
  const knex = require("knex")({ client: "pg", connection: url, pool: { min: 0, max: 2 } });
  const t0 = Date.now();
  try {
    const r = await Promise.race([
      knex.raw("SELECT 1 AS ok"),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout_15s")), 15000)),
    ]);
    console.log(`knex_string: OK ${Date.now() - t0}ms`, JSON.stringify(r.rows[0]));
  } catch (e) {
    console.log(`knex_string: FAIL ${Date.now() - t0}ms`, e.message);
  } finally {
    await knex.destroy().catch(() => {});
  }
}

async function testKnexObject() {
  const u = new URL(url);
  const knex = require("knex")(({
    client: "pg",
    connection: {
      host: u.hostname,
      port: Number(u.port || 5432),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ""),
    },
    pool: { min: 0, max: 2 },
  }));
  const t0 = Date.now();
  try {
    const r = await Promise.race([
      knex.raw("SELECT 1 AS ok"),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout_15s")), 15000)),
    ]);
    console.log(`knex_object: OK ${Date.now() - t0}ms`, JSON.stringify(r.rows[0]));
  } catch (e) {
    console.log(`knex_object: FAIL ${Date.now() - t0}ms`, e.message);
  } finally {
    await knex.destroy().catch(() => {});
  }
}

(async () => {
  await testPgClient();
  await testKnexString();
  await testKnexObject();
  console.log("RESULT: done");
})();

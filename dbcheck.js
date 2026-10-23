const { Client } = require("pg");

const url = process.env.DATABASE_URL || "";
const safe = url.replace(/:\/\/([^:]+):[^@]+@/, "://$1:***@");
console.log("url:", safe);

const t0 = Date.now();
const client = new Client({ connectionString: url, connectionTimeoutMillis: 15000 });

(async () => {
  try {
    await client.connect();
    console.log("connect_ms:", Date.now() - t0);
    const r = await client.query("SELECT 1 AS ok, version() AS v");
    console.log("select1_ok:", JSON.stringify(r.rows[0]).slice(0, 120));
    await client.end();
    console.log("RESULT: OK");
  } catch (e) {
    console.log("connect_ms:", Date.now() - t0);
    console.log("RESULT: FAIL", e.code || "", e.message);
  }
})();

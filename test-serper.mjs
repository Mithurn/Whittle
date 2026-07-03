import fs from "fs";
import fetch from "node-fetch";

const envStr = fs.readFileSync(".env.local", "utf8");
const match = envStr.match(/SERPER_API_KEY=(.+)/);
const apiKey = match ? match[1].trim() : null;

async function test(query) {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query }),
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

await test("Technical Chart Patterns podcast");


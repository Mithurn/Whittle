import { config } from "dotenv";
config({ path: ".env.local" });
import { condenseArticle } from "./src/lib/services/article-service.ts";

async function run() {
  const markdown = "Boxing head movement is critical. You must slip outside the jab. Pros: avoids damage. Cons: tiring. Weave: bend knees.";
  const result = await condenseArticle(markdown, { hobbyName: "Boxing", level: "intermediate", techniqueName: "Slip & Weave" });
  console.log(JSON.stringify(result, null, 2));
}

run();

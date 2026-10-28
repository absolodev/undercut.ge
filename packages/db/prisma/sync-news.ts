/**
 * Refresh the F1 news cache from the BBC Sport RSS feed.
 * Safe to run on its own; sync:latest calls the same helper.
 */
import { prisma } from "../src/index";
import { refreshSeasonNews } from "../src/news-cache";

refreshSeasonNews()
  .then((items) => {
    console.log(`News cache updated (${items.length} item(s)).`);
    for (const item of items) {
      console.log(`- ${item.date} ${item.title}`);
    }
  })
  .catch((error) => {
    console.error("News refresh failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

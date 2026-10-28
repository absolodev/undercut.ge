import { describe, expect, it } from "vitest";
import { parseBbcF1Rss } from "../src/news-cache";

describe("parseBbcF1Rss", () => {
  it("keeps title, link, date, and source for the latest items", () => {
    const xml = `<?xml version="1.0"?>
      <rss><channel>
        <item>
          <title><![CDATA[Perez signs multi-year extension with Cadillac]]></title>
          <link>https://www.bbc.co.uk/sport/formula1/articles/example</link>
          <description><![CDATA[A short summary.]]></description>
          <pubDate>Wed, 28 Oct 2026 16:10:07 GMT</pubDate>
        </item>
        <item>
          <title>Second story</title>
          <link>https://www.bbc.co.uk/sport/formula1/articles/second</link>
          <pubDate>Tue, 27 Oct 2026 15:17:53 GMT</pubDate>
        </item>
      </channel></rss>`;

    const items = parseBbcF1Rss(xml);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      title: "Perez signs multi-year extension with Cadillac",
      url: "https://www.bbc.co.uk/sport/formula1/articles/example",
      date: "2026-10-28",
      source: "BBC Sport",
      summary: "A short summary.",
    });
  });
});

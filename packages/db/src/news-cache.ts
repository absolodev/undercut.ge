import fs from "fs";
import path from "path";

const FEED_URL = "https://feeds.bbci.co.uk/sport/formula1/rss.xml";
const MAX_ITEMS = 8;
const STALE_MS = 12 * 60 * 60 * 1000;

export interface SeasonNewsItem {
  date: string;
  category: string;
  title: string;
  summary: string;
  url?: string;
  source?: string;
}

interface NewsCacheFile {
  fetchedAt: string;
  source: string;
  items: SeasonNewsItem[];
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function tag(itemXml: string, name: string): string {
  const match =
    itemXml.match(new RegExp(`<${name}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${name}>`)) ||
    itemXml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`));
  return match ? decodeXml(match[1]) : "";
}

export function parseBbcF1Rss(xml: string): SeasonNewsItem[] {
  const items: SeasonNewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null && items.length < MAX_ITEMS) {
    const itemXml = match[1];
    const title = tag(itemXml, "title");
    const link = tag(itemXml, "link");
    const summary = tag(itemXml, "description");
    const pubDate = tag(itemXml, "pubDate");
    if (!title || !link) continue;
    const parsed = pubDate ? new Date(pubDate) : new Date();
    items.push({
      title,
      url: link,
      summary: summary.length > 170 ? `${summary.slice(0, 170).trim()}...` : summary,
      date: Number.isNaN(parsed.getTime())
        ? new Date().toISOString().slice(0, 10)
        : parsed.toISOString().slice(0, 10),
      category: "Formula 1",
      source: "BBC Sport",
    });
  }
  return items;
}

function cacheCandidates(): string[] {
  const paths = [
    process.env.UNDERCUT_NEWS_PATH,
    "/opt/undercut/data/news.json",
    path.resolve(process.cwd(), "packages/data/current/news.cache.json"),
    path.resolve(process.cwd(), "../../packages/data/current/news.cache.json"),
    path.resolve(process.cwd(), "../../../packages/data/current/news.cache.json"),
  ].filter((value): value is string => Boolean(value));
  return [...new Set(paths)];
}

function preferredWritePath(): string {
  if (process.env.UNDERCUT_NEWS_PATH) return process.env.UNDERCUT_NEWS_PATH;
  if (fs.existsSync("/opt/undercut")) return "/opt/undercut/data/news.json";
  const dirs = [
    path.resolve(process.cwd(), "packages/data/current"),
    path.resolve(process.cwd(), "../../packages/data/current"),
    path.resolve(process.cwd(), "../../../packages/data/current"),
  ];
  const dir = dirs.find((candidate) => fs.existsSync(candidate));
  return path.join(dir ?? dirs[0], "news.cache.json");
}

function readCacheFile(): NewsCacheFile | null {
  for (const filePath of cacheCandidates()) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as NewsCacheFile;
      if (!parsed?.fetchedAt || !Array.isArray(parsed.items)) continue;
      return parsed;
    } catch {
      continue;
    }
  }
  return null;
}

function writeCacheFile(cache: NewsCacheFile): void {
  const target = preferredWritePath();
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(cache, null, 2));
}

export async function refreshSeasonNews(): Promise<SeasonNewsItem[]> {
  const res = await fetch(FEED_URL, {
    headers: {
      accept: "application/rss+xml, application/xml, text/xml",
      "user-agent": "Undercut/1.0 (+https://undercut.ge)",
    },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`BBC F1 RSS responded ${res.status}`);
  }
  const items = parseBbcF1Rss(await res.text());
  if (items.length === 0) {
    throw new Error("BBC F1 RSS returned no items");
  }
  writeCacheFile({
    fetchedAt: new Date().toISOString(),
    source: "BBC Sport",
    items,
  });
  return items;
}

/** Read the on-disk cache, refreshing it when it is missing or older than 12 hours. */
export async function readSeasonNews(): Promise<SeasonNewsItem[]> {
  const cached = readCacheFile();
  const fresh =
    cached &&
    cached.items.length > 0 &&
    Date.now() - new Date(cached.fetchedAt).getTime() < STALE_MS;
  if (fresh && cached) return cached.items;
  try {
    return await refreshSeasonNews();
  } catch (error) {
    console.error("F1 news refresh failed:", error);
    return cached?.items ?? [];
  }
}

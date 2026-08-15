import { getTranslations } from "next-intl/server";
import { ExternalLink } from "lucide-react";

interface NewsItem {
  date: string;
  category: string;
  title: string;
  summary: string;
  url?: string;
  source?: string;
  imageUrl?: string;
}

interface NewsSectionProps {
  news: NewsItem[];
}

export async function NewsSection({ news }: NewsSectionProps) {
  if (news.length === 0) return null;

  const t = await getTranslations("Home");

  return (
    <article className="bg-[#111] border border-white/10 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-mono text-xs text-white/40 uppercase tracking-wider">
          {t("newsChanges")}
        </h2>
        <span className="text-[11px] font-mono text-white/30">Latest F1 News</span>
      </div>
      <div className="space-y-4">
        {news.map((item) => {
          const Content = (
            <div className="group border-l-2 border-[#E10600]/40 hover:border-[#E10600] pl-4 transition-colors">
              <div className="flex flex-wrap gap-2 items-center mb-1">
                <span className="text-[10px] font-mono font-bold text-[#E10600] uppercase tracking-wider">
                  {item.category}
                </span>
                {item.source && (
                  <span className="text-[10px] font-mono text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
                    {item.source}
                  </span>
                )}
                <span className="text-[10px] font-mono text-white/30">
                  {new Date(item.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm text-white/90 group-hover:text-white transition-colors">
                  {item.title}
                </p>
                {item.url && (
                  <ExternalLink
                    size={14}
                    className="text-white/30 group-hover:text-[#E10600] shrink-0 mt-0.5 transition-colors"
                  />
                )}
              </div>
              <p className="text-sm text-white/50 mt-1 line-clamp-2">{item.summary}</p>
            </div>
          );

          if (item.url) {
            return (
              <a
                key={item.title}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:bg-white/[0.02] -mx-2 px-2 py-1.5 rounded transition-colors"
              >
                {Content}
              </a>
            );
          }

          return <div key={item.title}>{Content}</div>;
        })}
      </div>
    </article>
  );
}

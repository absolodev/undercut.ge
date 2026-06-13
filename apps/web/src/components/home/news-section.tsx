import { getTranslations } from "next-intl/server";

interface NewsItem {
  date: string;
  category: string;
  title: string;
  summary: string;
}

interface NewsSectionProps {
  news: NewsItem[];
}

export async function NewsSection({ news }: NewsSectionProps) {
  if (news.length === 0) return null;

  const t = await getTranslations("Home");

  return (
    <article className="bg-[#111] border border-white/10 rounded-lg p-5">
      <h2 className="font-mono text-xs text-white/40 uppercase tracking-wider mb-4">
        {t("newsChanges")}
      </h2>
      <div className="space-y-4">
        {news.map((item) => (
          <div key={item.title} className="border-l-2 border-[#E10600]/40 pl-4">
            <div className="flex flex-wrap gap-2 items-center mb-1">
              <span className="text-[10px] font-mono text-[#E10600]">{item.category}</span>
              <span className="text-[10px] font-mono text-white/30">
                {new Date(item.date).toLocaleDateString()}
              </span>
            </div>
            <p className="font-medium text-sm">{item.title}</p>
            <p className="text-sm text-white/50 mt-1">{item.summary}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

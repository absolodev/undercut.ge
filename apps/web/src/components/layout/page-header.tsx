import { Link } from "@/i18n/navigation";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  seasonYear,
}: {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  seasonYear?: number;
}) {
  return (
    <header className="mb-8">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="text-xs font-mono text-white/40 mb-3 flex flex-wrap items-center gap-1" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.label} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden>/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-white transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-white/60">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      {seasonYear && (
        <p className="text-[#E10600] font-mono text-xs font-bold mb-1">{seasonYear} SEASON</p>
      )}
      <h1 className="font-display text-3xl md:text-4xl font-bold">{title}</h1>
      {description && (
        <p className="text-white/50 font-mono text-sm mt-2 max-w-2xl">{description}</p>
      )}
    </header>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-[#111] border border-dashed border-white/20 rounded-lg p-8 text-center">
      <p className="font-mono text-sm text-white/60 mb-2">{title}</p>
      <p className="text-sm text-white/40 max-w-md mx-auto">{description}</p>
    </div>
  );
}

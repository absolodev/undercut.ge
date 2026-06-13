import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { TeamLogo } from "@/components/ui/team-logo";
import type { DriverRecordRow } from "@/lib/data/records";

interface RecordsSectionProps {
  wins: DriverRecordRow[];
  poles: DriverRecordRow[];
  coverageNote: string;
}

function RecordTable({
  title,
  rows,
  countLabel,
  accentClass,
  posLabel,
  driverLabel,
  teamsLabel,
  emptyLabel,
}: {
  title: string;
  rows: DriverRecordRow[];
  countLabel: string;
  accentClass: string;
  posLabel: string;
  driverLabel: string;
  teamsLabel: string;
  emptyLabel: string;
}) {
  return (
    <section className="bg-[#111] border border-white/10 rounded-lg overflow-hidden">
      <div className="bg-[#222] p-4 border-b border-white/10">
        <h2 className="font-display text-lg md:text-xl font-bold">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="p-6 text-sm text-white/40 font-mono">{emptyLabel}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[320px]">
            <thead className="bg-[#1a1a1a] font-mono text-[10px] text-white/50 border-b border-white/10">
              <tr>
                <th className="p-3 w-12">{posLabel}</th>
                <th className="p-3">{driverLabel}</th>
                <th className="p-3 hidden sm:table-cell">{teamsLabel}</th>
                <th className="p-3 text-right">{countLabel}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-3 font-mono text-white/50">{i + 1}</td>
                  <td className="p-3">
                    <Link
                      href={`/f1/drivers/${row.id}`}
                      className="font-semibold hover:text-[#E10600] transition-colors"
                    >
                      {row.full_name}
                    </Link>
                    <div className="flex flex-wrap gap-1 mt-1.5 sm:hidden">
                      {row.constructors.map((c) => (
                        <TeamLogo
                          key={c.constructor_ref}
                          constructorRef={c.constructor_ref}
                          name={c.name}
                          logoUrl={c.logo_url}
                          color={c.color_primary}
                          size={18}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1.5">
                      {row.constructors.map((c) => (
                        <TeamLogo
                          key={c.constructor_ref}
                          constructorRef={c.constructor_ref}
                          name={c.name}
                          logoUrl={c.logo_url}
                          color={c.color_primary}
                          size={20}
                        />
                      ))}
                    </div>
                  </td>
                  <td className={`p-3 font-mono font-bold text-right ${accentClass}`}>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export async function RecordsSection({ wins, poles, coverageNote }: RecordsSectionProps) {
  const t = await getTranslations("Home");

  return (
    <section aria-labelledby="all-time-records-heading" className="space-y-4">
      <div>
        <h2 id="all-time-records-heading" className="font-mono text-xs text-white/40 uppercase tracking-wider">
          {t("allTimeRecords")}
        </h2>
        <p className="text-xs font-mono text-white/30 mt-1">{coverageNote}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecordTable
          title={t("mostWins")}
          rows={wins}
          countLabel={t("wins")}
          accentClass="text-[#E10600]"
          posLabel={t("pos")}
          driverLabel={t("driver")}
          teamsLabel={t("teams")}
          emptyLabel={t("noRecords")}
        />
        <RecordTable
          title={t("mostPoles")}
          rows={poles}
          countLabel={t("poles")}
          accentClass="text-[#00A2FF]"
          posLabel={t("pos")}
          driverLabel={t("driver")}
          teamsLabel={t("teams")}
          emptyLabel={t("noRecords")}
        />
      </div>
    </section>
  );
}

import { prisma } from "@pitwall/db";
import { CURRENT_SEASON } from "@/lib/config";
import { UI_MIN_SEASON } from "@/lib/season";

export async function getSeasons() {
  return prisma.f1_seasons.findMany({
    where: {
      year: { gte: UI_MIN_SEASON, lt: CURRENT_SEASON },
    },
    orderBy: { year: "desc" },
    include: {
      champion_driver: { select: { full_name: true, broadcast_name: true } },
      champion_constructor: { select: { name: true, color_primary: true } },
    },
  });
}

export async function getSeasonOverview(year: number) {
  return prisma.f1_races.findMany({
    where: { season_year: year },
    orderBy: { round: "asc" },
    include: {
      circuit: true,
      sessions: {
        where: { session_type: "R" },
        include: {
          results: {
            take: 3,
            orderBy: { finish_position: "asc" },
            include: { driver: true, constructor: true },
          },
        },
      },
    },
  });
}

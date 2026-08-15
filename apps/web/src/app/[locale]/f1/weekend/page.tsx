import { WeekendPreview } from "@/components/home/weekend-preview";
import {
  getActiveWeekendRace,
  getNextRace,
} from "@/lib/data/current/season";
import { getLiveLapCount, getLiveRaceStandings } from "@/lib/data/live/standings";
import { getLiveWeather } from "@/lib/data/live/weather";
import { CURRENT_SEASON } from "@/lib/config";
import { resolveLiveSessionStatus } from "@/lib/live-status-server";
import { setLocaleFromParams } from "@/i18n/set-request-locale";
import { redirect } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return buildPageMetadata({
    title: "Race Weekend Schedule & Live Status",
    description: "Follow the current Formula 1 race weekend schedule, countdown to next session, live weather forecast, and live timings.",
    path: "/f1/weekend",
    locale: locale as Locale,
  });
}

export default async function WeekendPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await setLocaleFromParams(params);
  const seasonYear = CURRENT_SEASON;

  const [status, weekendRace, nextRace] = await Promise.all([
    resolveLiveSessionStatus(),
    getActiveWeekendRace(seasonYear),
    getNextRace(seasonYear),
  ]);

  const [liveStandings, liveLap, weather] = await Promise.all([
    getLiveRaceStandings(),
    getLiveLapCount(),
    getLiveWeather(),
  ]);

  const displayRace = weekendRace || nextRace;

  if (!displayRace) {
    redirect({ href: "/", locale });
    return null;
  }

  // Find next upcoming session in the weekend timetable
  const upcomingSession = displayRace.sessions?.find(
    (s) => new Date(s.date_start).getTime() > Date.now()
  );

  const countdownSeconds = upcomingSession
    ? Math.max(0, Math.floor((new Date(upcomingSession.date_start).getTime() - Date.now()) / 1000))
    : null;

  // Construct status context if we are viewing the upcoming/next race
  const activeStatus = weekendRace
    ? status
    : {
        isLive: false,
        sessionType: null,
        circuitName: displayRace.circuit.circuit_ref,
        circuitRef: displayRace.circuit.circuit_ref,
        meetingName: displayRace.race_name,
        sessionName: upcomingSession?.session_name ?? null,
        countdownSeconds,
        weekendActive: false,
        mode: "off-week" as const,
      };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <WeekendPreview
        status={activeStatus}
        race={displayRace as any}
        liveStandings={liveStandings}
        liveLap={liveLap}
        weather={weather}
      />
    </div>
  );
}

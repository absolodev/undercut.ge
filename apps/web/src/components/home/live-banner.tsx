"use client";

import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useEffect } from "react";
import { useLiveSessionStatus } from "@/hooks/use-live-session-status";

export function LiveBanner({ autoRedirect = false }: { autoRedirect?: boolean }) {
  const router = useRouter();
  const { status, isLoading } = useLiveSessionStatus();

  useEffect(() => {
    if (autoRedirect && status?.isLive) {
      router.replace("/live");
    }
  }, [autoRedirect, status?.isLive, router]);

  if (isLoading || !status?.isLive) return null;
  if (autoRedirect) return null;

  return (
    <div className="bg-[#E10600] text-white px-6 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
        </span>
        <p className="text-sm font-mono truncate">
          <span className="font-bold">{status.sessionType}</span>
          {status.sessionName ? ` — ${status.sessionName}` : ""}
          {status.meetingName ? ` · ${status.meetingName}` : ""}
        </p>
      </div>
      <Link
        href="/live"
        className="shrink-0 text-xs font-mono bg-white text-[#E10600] px-4 py-1.5 rounded hover:bg-white/90 transition-colors font-bold"
      >
        GO LIVE →
      </Link>
    </div>
  );
}

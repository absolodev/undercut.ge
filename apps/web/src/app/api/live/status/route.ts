import { NextResponse } from "next/server";
import { resolveLiveSessionStatus } from "@/lib/live-status-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await resolveLiveSessionStatus();
  return NextResponse.json(status);
}

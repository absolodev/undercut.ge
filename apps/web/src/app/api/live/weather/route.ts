import { NextResponse } from "next/server";
import { getLiveWeather } from "@/lib/data/live/weather";

export const dynamic = "force-dynamic";

export async function GET() {
  const weather = await getLiveWeather();
  if (!weather) {
    return NextResponse.json({ weather: null });
  }
  return NextResponse.json({ weather });
}

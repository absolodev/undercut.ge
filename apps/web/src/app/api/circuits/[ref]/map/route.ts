import { NextResponse } from "next/server";
import { getCircuitMapData } from "@/lib/track-maps/circuit-loader";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref } = await params;
  const data = await getCircuitMapData(ref);
  if (!data) {
    return NextResponse.json({ error: "Circuit map not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requirePermission, P } from "@/lib/auth";
import { prisma } from "@/lib/db/client";

const RANGE_MS: Record<string, number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

/**
 * GET /api/servers/[serverId]/metrics?range=24h
 *
 * Returns historical metrics for the given range.
 * For long ranges, samples are downsampled by averaging buckets so the
 * client always receives a manageable number of data points (~300 max).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params;
  try {
    await requirePermission(request, serverId, P.MONITOR_VIEW);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "24h";
  const rangeMs = RANGE_MS[range];
  if (!rangeMs) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  const since = new Date(Date.now() - rangeMs);

  const rows = await prisma.serverMetric.findMany({
    where: { serverId, timestamp: { gte: since } },
    orderBy: { timestamp: "asc" },
    select: { timestamp: true, cpu: true, memory: true, tps: true, players: true },
  });

  // Downsample to at most ~300 buckets to keep payload small.
  const MAX_POINTS = 300;
  let points = rows.map((r) => ({
    t: r.timestamp.getTime(),
    cpu: r.cpu,
    memory: r.memory,
    tps: r.tps,
    players: r.players,
  }));

  if (points.length > MAX_POINTS) {
    const bucketSize = Math.ceil(points.length / MAX_POINTS);
    const buckets: typeof points = [];
    for (let i = 0; i < points.length; i += bucketSize) {
      const slice = points.slice(i, i + bucketSize);
      const avg = (k: keyof (typeof slice)[number]) =>
        slice.reduce((sum, p) => sum + (p[k] as number), 0) / slice.length;
      buckets.push({
        t: slice[Math.floor(slice.length / 2)].t,
        cpu: avg("cpu"),
        memory: Math.round(avg("memory")),
        tps: avg("tps"),
        players: Math.round(avg("players")),
      });
    }
    points = buckets;
  }

  return NextResponse.json({ range, points });
}

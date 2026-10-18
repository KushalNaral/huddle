import { readDeviceToken } from "@/server/device";
import { getHuddle, viewFor } from "@/server/huddles";

/** This device's view of a huddle. Polled by the client until Stage 2 adds realtime. */
export async function GET(_req: Request, ctx: RouteContext<"/api/h/[slug]">) {
  const { slug } = await ctx.params;
  const huddle = await getHuddle(slug);
  if (!huddle) return Response.json({ error: "Not found" }, { status: 404 });
  const view = viewFor(huddle, await readDeviceToken());
  return Response.json(view, { headers: { "Cache-Control": "no-store" } });
}

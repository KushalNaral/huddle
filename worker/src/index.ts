import { DurableObject } from "cloudflare:workers";
import type { ActionResult, HuddleView } from "../../src/lib/view";
import {
  apply,
  hashDevice,
  newHuddle,
  newSlug,
  parseAction,
  viewFor,
  type Action,
  type CreateInput,
  type StoredHuddle,
} from "./huddles";

interface Env {
  HUDDLE: DurableObjectNamespace<Huddle>;
  /** Comma-separated origins allowed to call the API. */
  ALLOWED_ORIGINS: string;
}

const BAD_REQUEST = "That request didn’t make sense. Reload and try again.";
const MISSING = "This huddle doesn’t exist anymore.";
/** Close code for "this huddle is gone": the client stops reconnecting. */
const CLOSE_MISSING = 4404;
const MAX_BODY = 4096;
/** Huddles are for tonight, not forever. */
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

const SLUG = /^[a-z2-9]{10}$/;
const TOKEN = /^[\w-]{20,64}$/;
const ROUTE = /^\/h\/([a-z2-9]{10})(?:\/([a-z]+))?\/?$/;

// ---------------------------------------------------------------------------
// One Durable Object per huddle: it holds the state, serializes every change,
// and pushes each connected device its own view.
// ---------------------------------------------------------------------------

type Attachment = { hash: string | null };

function readAttachment(ws: WebSocket): Attachment {
  const raw: unknown = ws.deserializeAttachment();
  if (typeof raw === "object" && raw !== null && "hash" in raw && typeof raw.hash === "string") {
    return { hash: raw.hash };
  }
  return { hash: null };
}

function parseHello(message: string | ArrayBuffer): string | null {
  if (typeof message !== "string" || message.length > 256) return null;
  try {
    const value: unknown = JSON.parse(message);
    if (typeof value === "object" && value !== null && "token" in value && typeof value.token === "string") {
      return TOKEN.test(value.token) ? value.token : null;
    }
  } catch {
    // fall through
  }
  return null;
}

export class Huddle extends DurableObject<Env> {
  private huddle: StoredHuddle | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
    void ctx.blockConcurrencyWhile(async () => {
      this.huddle = (await ctx.storage.get<StoredHuddle>("huddle")) ?? null;
    });
  }

  /** Saves a brand-new huddle. False if this slug is already taken. */
  async create(huddle: StoredHuddle): Promise<boolean> {
    if (this.huddle) return false;
    this.huddle = huddle;
    await this.ctx.storage.put("huddle", huddle);
    await this.ctx.storage.setAlarm(huddle.createdAt + TTL_MS);
    return true;
  }

  view(hash: string | null): HuddleView | null {
    return this.huddle ? viewFor(this.huddle, hash) : null;
  }

  async act(hash: string, action: Action): Promise<ActionResult> {
    const current = this.huddle;
    if (!current) return { ok: false, error: MISSING };
    const draft = structuredClone(current);
    const error = apply(draft, hash, action);
    if (error !== null) return { ok: false, error };
    draft.version = current.version + 1;
    this.huddle = draft;
    await this.ctx.storage.put("huddle", draft);
    this.broadcast(draft);
    return { ok: true, view: viewFor(draft, hash) };
  }

  private broadcast(h: StoredHuddle): void {
    for (const ws of this.ctx.getWebSockets()) {
      const { hash } = readAttachment(ws);
      if (hash !== null) send(ws, viewFor(h, hash));
    }
  }

  override fetch(request: Request): Response {
    if (request.headers.get("Upgrade") !== "websocket") return new Response(null, { status: 426 });
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ hash: null } satisfies Attachment);
    return new Response(null, { status: 101, webSocket: client });
  }

  /** The first message says which device this is; after that we only talk. */
  override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (readAttachment(ws).hash !== null) return;
    const token = parseHello(message);
    if (token === null) {
      ws.close(1008, "Bad hello");
      return;
    }
    if (!this.huddle) {
      ws.close(CLOSE_MISSING, "Missing");
      return;
    }
    const hash = await hashDevice(token);
    ws.serializeAttachment({ hash } satisfies Attachment);
    send(ws, viewFor(this.huddle, hash));
  }

  override webSocketClose(ws: WebSocket, code: number): void {
    try {
      ws.close(code === 1005 || code === 1006 ? 1000 : code, "Bye");
    } catch {
      // already closed
    }
  }

  override async alarm(): Promise<void> {
    this.huddle = null;
    await this.ctx.storage.deleteAll();
    for (const ws of this.ctx.getWebSockets()) ws.close(CLOSE_MISSING, "Missing");
  }
}

function send(ws: WebSocket, view: HuddleView): void {
  try {
    ws.send(JSON.stringify({ type: "view", view }));
  } catch {
    // the socket went away mid-broadcast
  }
}

// ---------------------------------------------------------------------------
// The HTTP edge: CORS, auth, parsing, routing.
// ---------------------------------------------------------------------------

function allowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("Origin");
  if (origin === null) return null;
  return env.ALLOWED_ORIGINS.split(",").some((o) => o.trim() === origin) ? origin : null;
}

function corsHeaders(origin: string | null): Headers {
  const headers = new Headers({ Vary: "Origin" });
  if (origin !== null) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    headers.set("Access-Control-Max-Age", "86400");
  }
  return headers;
}

function json(body: unknown, status: number, origin: string | null): Response {
  const headers = corsHeaders(origin);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(body), { status, headers });
}

function tokenFrom(request: Request): string | null {
  const match = /^Bearer (\S+)$/.exec(request.headers.get("Authorization") ?? "");
  const token = match?.[1];
  return token !== undefined && TOKEN.test(token) ? token : null;
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  const text = await request.text();
  if (text.length > MAX_BODY) return null;
  if (text === "") return {};
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    return Object.fromEntries(Object.entries(value));
  } catch {
    return null;
  }
}

function stubFor(env: Env, slug: string): DurableObjectStub<Huddle> {
  return env.HUDDLE.get(env.HUDDLE.idFromName(slug));
}

async function createRoute(request: Request, env: Env, origin: string | null): Promise<Response> {
  const token = tokenFrom(request);
  const body = await readBody(request);
  if (token === null || body === null) return json({ ok: false, error: BAD_REQUEST }, 400, origin);
  const input: CreateInput = { question: body.question, name: body.name, cap: body.cap, note: body.note };
  const hash = await hashDevice(token);
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = newSlug();
    const huddle = newHuddle(slug, input, hash);
    if (!huddle.ok) return json(huddle, 422, origin);
    if (await stubFor(env, slug).create(huddle.value)) return json({ ok: true, slug }, 201, origin);
  }
  return json({ ok: false, error: "Couldn’t start a huddle just now. Try again." }, 503, origin);
}

async function handle(request: Request, env: Env): Promise<Response> {
  const origin = allowedOrigin(request, env);
  if (request.headers.has("Origin") && origin === null) return new Response("Forbidden", { status: 403 });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });

  const { pathname } = new URL(request.url);
  if (pathname === "/h" || pathname === "/h/") {
    if (request.method !== "POST") return json({ ok: false, error: BAD_REQUEST }, 405, origin);
    return createRoute(request, env, origin);
  }

  const match = ROUTE.exec(pathname);
  const slug = match?.[1];
  if (slug === undefined || !SLUG.test(slug)) return json({ ok: false, error: "Not found" }, 404, origin);
  const name = match?.[2];
  const stub = stubFor(env, slug);

  if (name === undefined) {
    if (request.method !== "GET") return json({ ok: false, error: BAD_REQUEST }, 405, origin);
    const token = tokenFrom(request);
    const view = await stub.view(token === null ? null : await hashDevice(token));
    return view ? json({ ok: true, view }, 200, origin) : json({ ok: false, error: MISSING }, 404, origin);
  }

  if (name === "live") return stub.fetch(request);

  if (request.method !== "POST") return json({ ok: false, error: BAD_REQUEST }, 405, origin);
  const token = tokenFrom(request);
  const body = await readBody(request);
  const action = body === null ? null : parseAction(name, body);
  if (token === null || action === null) return json({ ok: false, error: BAD_REQUEST }, 400, origin);
  const result = await stub.act(await hashDevice(token), action);
  return json(result, result.ok ? 200 : 422, origin);
}

export default {
  fetch: handle,
} satisfies ExportedHandler<Env>;

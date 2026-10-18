/**
 * Stand-in for the Resend API used by automated tests (never in production).
 * Records every accepted message and can be told to fail:
 *   GET  /__messages        recorded messages
 *   POST /__reset           clear messages and failure mode
 *   POST /__fail {status}   answer POST /emails with that HTTP status until reset
 */
import { createServer } from "node:http";

type Recorded = { to: string[]; subject: string; html: string; text: string; idempotencyKey: string | null };
let messages: Recorded[] = [];
let failWith: number | null = null;
const seenKeys = new Map<string, string>();

const port = Number(process.env.PORT ?? 4010);

createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const send = (status: number, body: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };

  if (req.method === "GET" && req.url === "/__messages") return send(200, messages);
  if (req.method === "POST" && req.url === "/__reset") {
    messages = [];
    failWith = null;
    seenKeys.clear();
    return send(200, { ok: true });
  }
  if (req.method === "POST" && req.url === "/__fail") {
    failWith = JSON.parse(raw || "{}").status ?? 500;
    return send(200, { ok: true });
  }
  if (req.method === "POST" && req.url === "/emails") {
    if (req.headers.authorization !== "Bearer re_test_key") return send(401, { message: "bad key" });
    if (failWith) return send(failWith, { message: "simulated failure" });
    const key = (req.headers["idempotency-key"] as string | undefined) ?? null;
    if (key && seenKeys.has(key)) return send(200, { id: seenKeys.get(key) });
    const body = JSON.parse(raw);
    const id = `mock_${messages.length + 1}`;
    messages.push({ to: body.to, subject: body.subject, html: body.html, text: body.text, idempotencyKey: key });
    if (key) seenKeys.set(key, id);
    return send(200, { id });
  }
  send(404, { message: "not found" });
}).listen(port, "127.0.0.1", () => console.log(`Mock Resend on http://127.0.0.1:${port}`));

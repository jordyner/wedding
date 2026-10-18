import { clientKey, deps, json, looksAutomated, readJson, storageError } from "@/lib/server/http";
import { recoverLinks } from "@/lib/server/rsvpService";

export async function POST(req: Request) {
  const body = await readJson(req);
  if (body === "forbidden") return json({ status: "error", reason: "forbidden" }, 403);
  if (!body || looksAutomated(body)) return json({ status: "error", reason: "bad_request" }, 400);

  try {
    const result = await recoverLinks(deps(), body, clientKey(req));
    const code = { accepted: 200, invalid: 422, rate_limited: 429, error: result.status === "error" && result.reason === "email" ? 502 : 400 }[
      result.status
    ];
    return json(result, code);
  } catch (err) {
    return storageError(err);
  }
}

import { json, readJson, storageError } from "@/lib/server/http";
import { getDb } from "@/lib/server/db";
import { updateByToken } from "@/lib/server/rsvpService";

export async function POST(req: Request) {
  const body = await readJson(req);
  if (body === "forbidden") return json({ status: "error", reason: "forbidden" }, 403);
  if (!body) return json({ status: "error", reason: "bad_request" }, 400);

  try {
    const result = await updateByToken(getDb(), body);
    const code = { updated: 200, invalid: 422, invalid_token: 404, conflict: 409, rate_limited: 429, error: 400 }[
      result.status
    ];
    return json(result, code);
  } catch (err) {
    return storageError(err);
  }
}

import { AgyError } from "./errors.js";

/** Replace OpenCode's assembled system at the HTTP boundary, after context hooks.
 * An absent/blank agent prompt deliberately means no system, never a fallback. */
export async function withAgentSystem(request: Request, system: string | undefined): Promise<Request> {
  const body: unknown = await request.clone().json();
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AgyError("invalid_request", "The host model request must contain a JSON object");
  }
  const payload = { ...body, system: system?.trim() ? system : "" };
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  return new Request(request, { headers, body: JSON.stringify(payload) });
}

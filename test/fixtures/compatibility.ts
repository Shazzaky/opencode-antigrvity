import { afterAll, beforeAll, spyOn } from "bun:test";
import { resolve } from "node:path";
import * as compatibility from "../../src/acp-compatibility.js";
import * as auth from "../../src/auth-bridge.js";

/** Fake ACP does not talk to Google; keep process/pool tests credential-free. */
export function useFixtureAuthentication() {
  let authentication: ReturnType<typeof spyOn<typeof auth, "requireCliAuthentication">>;
  beforeAll(() => { authentication = spyOn(auth, "requireCliAuthentication").mockResolvedValue(undefined); });
  afterAll(() => { authentication.mockRestore(); });
}

/** Test-only dependency replacement, never an environment bypass shipped to
 * users. The production validator still rejects this executable. */
export function fixtureCompatibility() {
  const original = compatibility.assertHostToolCompatibility;
  const authentication = spyOn(auth, "requireCliAuthentication").mockResolvedValue(undefined);
  const validation = spyOn(compatibility, "assertHostToolCompatibility").mockImplementation(async path => {
    if (resolve(path) !== resolve(import.meta.dir, "fake-acp.mjs")) return original(path);
  });
  return { mockRestore() { validation.mockRestore(); authentication.mockRestore(); } };
}

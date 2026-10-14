import { expect, test } from "bun:test";
import { chmod, copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertHostToolCompatibility } from "../src/acp-compatibility.js";
import { AcpWorker } from "../src/acp-process.js";
import { prepareBrowserBlocker } from "../src/browser-blocker.js";

test.skipIf(!process.env.AGY_TEST_MACOS_ACP_DIR)("reviewed macOS ARM pair passes; missing and altered companion fail", async () => {
  const source = process.env.AGY_TEST_MACOS_ACP_DIR!;
  await expect(assertHostToolCompatibility(join(source, "agy_acp_server.par"), "darwin", "arm64")).resolves.toBeUndefined();
  const root = await mkdtemp(join(tmpdir(), "agy-macos-profile-"));
  try {
    const executable = join(root, "agy_acp_server.par");
    await copyFile(join(source, "agy_acp_server.par"), executable);
    await expect(assertHostToolCompatibility(executable, "darwin", "arm64")).rejects.toMatchObject({ code: "agy_acp_compatibility" });
    await writeFile(join(root, "localharness_external"), "altered");
    await expect(assertHostToolCompatibility(executable, "darwin", "arm64")).rejects.toMatchObject({ code: "agy_acp_compatibility" });
  } finally { await rm(root, { recursive: true, force: true }); }
}, 30_000);

test.skipIf(process.platform !== "darwin" || !process.env.AGY_TEST_MACOS_ACP_DIR)("official macOS ARM ACP initializes and terminates unauthenticated without browser login", async () => {
  expect(process.arch).toBe("arm64");
  const root = await mkdtemp(join(tmpdir(), "agy-official-macos-"));
  const executable = join(process.env.AGY_TEST_MACOS_ACP_DIR!, "agy_acp_server.par");
  await assertHostToolCompatibility(executable);
  await chmod(executable, 0o755);
  await chmod(join(process.env.AGY_TEST_MACOS_ACP_DIR!, "localharness_external"), 0o755);
  await prepareBrowserBlocker(process.env);
  const worker = new AcpWorker({ cwd: root, executableArgs: [], environment: { GEMINI_HOME: root }, printTimeoutMs: 45_000 }, executable);
  try {
    await expect(worker.start(AbortSignal.timeout(45_000))).rejects.toMatchObject({ kind: "auth" });
    expect(worker.init?.protocolVersion).toBe(1);
    expect(worker.init?.authMethods?.some(method => method.id === "oauth-personal")).toBe(true);
  } finally { await worker.stop(true); await rm(root, { recursive: true, force: true }); }
}, 60_000);

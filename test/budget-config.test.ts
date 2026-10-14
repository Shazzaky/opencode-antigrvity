import { expect, test } from "bun:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

test("fixed input cap default, override, invalid fallback and exact admission boundary", async () => {
  const module = new URL("../src/budget.ts", import.meta.url).href;
  for (const [value, cap] of [[undefined, 1_000_000], ["100000", 100_000], ["16384", 16_384], ["16383", 1_000_000], ["invalid", 1_000_000]] as const) {
    const env = { ...process.env };
    if (value === undefined) delete env.OPENCODE_ANTIGRAVITY_FIXED_INPUT_CAP;
    else env.OPENCODE_ANTIGRAVITY_FIXED_INPUT_CAP = value;
    const { stdout } = await promisify(execFile)(process.execPath, ["-e", `
      const { TRANSCRIPT_INPUT_BYTE_CAP: cap, blockBudget } = await import(${JSON.stringify(module)});
      const empty = [{ type: 'text', text: '' }];
      const budget = blockBudget('gemini-3.8-flash', empty);
      const remaining = Math.min(budget.text, budget.context);
      const exact = [{ type: 'text', text: 'X'.repeat(remaining - 1024) }];
      const admitted = blockBudget('gemini-3.8-flash', exact);
      if (Math.min(admitted.text, admitted.context) !== 1024) throw Error('boundary');
      let rejected = false;
      try { blockBudget('gemini-3.8-flash', [{ type: 'text', text: exact[0].text + 'X' }]); }
      catch (error) { rejected = error.code === 'agy_context_budget'; }
      if (!rejected) throw Error('boundary must reject');
      console.log(cap);
    `], { env, timeout: 10_000 });
    expect(Number(stdout.trim())).toBe(cap);
  }
}, 60_000);

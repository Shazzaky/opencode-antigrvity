import { expect, test } from "bun:test";
import * as directoryPlugin from "../index.js";
import * as packagePlugin from "../src/index.js";

test("directory entrypoint preserves the package plugin and named exports", () => {
  expect(directoryPlugin.default).toBe(packagePlugin.default);
  expect(Object.keys(directoryPlugin).sort()).toEqual(Object.keys(packagePlugin).sort());
});

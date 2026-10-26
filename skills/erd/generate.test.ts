import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const generator = new URL("./generate.ts", import.meta.url);

test("unjustified design changes cannot produce a review diagram", async () => {
  const directory = await mkdtemp(join(tmpdir(), "erd-reuse-"));
  const source = join(directory, "schema.json");
  const destination = join(directory, "diagram.html");
  const reuse = { checked: "orders.notes", why: "Each book needs its own gift message." };
  const invalidNotes = [undefined, null, {}, { ...reuse, checked: " \t" }, { ...reuse, why: "\n" }];
  try {
    for (const scope of ["table", "column"]) {
      for (const status of ["new", "changed"]) {
        for (const reuse of invalidNotes) {
          const change = { status, reuse };
          const column = { name: "gift_message", type: "text", ...(scope === "column" ? change : {}) };
          const table = { id: "order_lines", group: "Sales", caption: "", columns: [column], ...(scope === "table" ? change : {}) };
          await writeFile(source, JSON.stringify({ title: "Shop", tables: [table], links: [] }));
          const generation = spawnSync(process.execPath, [generator.pathname, source, destination], { encoding: "utf8" });
          assert.equal(generation.status, 1, generation.stdout);
          assert.match(generation.stderr, /Table order_lines/);
          if (scope === "column") assert.match(generation.stderr, /column gift_message/);
          assert.match(generation.stderr, /reuse/);
        }
      }
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("existing elements reject reuse notes while justified changes survive generation", async () => {
  const directory = await mkdtemp(join(tmpdir(), "erd-reuse-"));
  const source = join(directory, "schema.json");
  const destination = join(directory, "diagram.html");
  const reuse = { checked: "orders.notes", why: "Each book needs its own gift message." };
  try {
    for (const scope of ["table", "column"]) {
      for (const status of [undefined, "existing", "new", "changed", "invalid", null]) {
        const change = { status, reuse };
        const column = { name: "gift_message", type: "text", ...(scope === "column" ? change : {}) };
        const table = { id: "order_lines", group: "Sales", caption: "", columns: [column], ...(scope === "table" ? change : {}) };
        await writeFile(source, JSON.stringify({ title: "Shop", tables: [table], links: [] }));
        const generation = spawnSync(process.execPath, [generator.pathname, source, destination], { encoding: "utf8" });
        const justifiedChange = status === "new" || status === "changed";
        assert.equal(generation.status, justifiedChange ? 0 : 1, generation.stderr);
        if (justifiedChange) {
          const html = await readFile(destination, "utf8");
          assert.ok(html.includes('"reuse":' + JSON.stringify(reuse)));
          assert.ok(html.includes('"status":"' + status + '"'));
        } else {
          assert.match(generation.stderr, /Table order_lines/);
          if (scope === "column") assert.match(generation.stderr, /column gift_message/);
        }
      }
    }
    await writeFile(source, JSON.stringify({ title: "Shop", tables: [{ id: "orders", group: "Sales", caption: "", columns: [{ name: "id", type: "bigint" }] }], links: [] }));
    const generation = spawnSync(process.execPath, [generator.pathname, source, destination], { encoding: "utf8" });
    assert.equal(generation.status, 0, generation.stderr);
    assert.ok((await readFile(destination, "utf8")).includes('"status":"existing"'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const generator = new URL("./generate.ts", import.meta.url);

test("unjustified design changes cannot produce a review diagram", async () => {
  const directory = await mkdtemp(join(tmpdir(), "erd-reuse-"));
  const source = join(directory, "schema.json");
  const destination = join(directory, "diagram.html");
  const reuse = { checked: "src/orders.ts:Order", why: "Each book needs its own gift message." };
  const invalidNotes = [
    undefined, null, {}, { ...reuse, checked: " \t" }, { ...reuse, why: "\n" },
    ...["orders", "orders.notes", "src/orders:Order", "src/orders.ts:123", "src/orders.ts:Order, filler"]
      .map(checked => ({ ...reuse, checked })),
  ];
  try {
    for (const scope of ["table", "column"]) {
      const columnScope = scope === "column";
      for (const status of ["new", "changed"]) {
        for (const reuse of invalidNotes) {
          const change = { status, reuse };
          const column = {
            name: "gift_message",
            type: "text",
            ...(columnScope ? change : {}),
          };
          const table = {
            id: "order_lines",
            group: "Sales",
            caption: "",
            columns: [column],
            ...(!columnScope ? change : {}),
          };
          await writeFile(source, JSON.stringify({
            title: "Shop",
            tables: [table],
            links: [],
          }));
          const generation = spawnSync(
            process.execPath,
            [generator.pathname, source, destination],
            { encoding: "utf8" },
          );
          assert.equal(generation.status, 1, generation.stdout);
          assert.match(generation.stderr, /Table order_lines/);
          if (columnScope) assert.match(generation.stderr, /column gift_message/);
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
  const reuse = { checked: "src/orders.ts:Order", why: "Each book needs its own gift message." };
  try {
    for (const scope of ["table", "column"]) {
      const columnScope = scope === "column";
      for (const status of [undefined, "existing", "new", "changed", "invalid", null]) {
        const change = { status, reuse };
        const column = {
          name: "gift_message",
          type: "text",
          ...(columnScope ? change : {}),
        };
        const table = {
          id: "order_lines",
          group: "Sales",
          caption: "",
          columns: [column],
          ...(!columnScope ? change : {}),
        };
        await writeFile(source, JSON.stringify({
          title: "Shop",
          tables: [table],
          links: [],
        }));
        const generation = spawnSync(
          process.execPath,
          [generator.pathname, source, destination],
          { encoding: "utf8" },
        );
        const justifiedChange = status === "new" || status === "changed";
        assert.equal(generation.status, justifiedChange ? 0 : 1, generation.stderr);
        if (justifiedChange) {
          const html = await readFile(destination, "utf8");
          assert.ok(html.includes('"reuse":' + JSON.stringify(reuse)));
          assert.ok(html.includes('"status":"' + status + '"'));
        } else {
          assert.match(generation.stderr, /Table order_lines/);
          if (columnScope) assert.match(generation.stderr, /column gift_message/);
        }
      }
    }
    await writeFile(source, JSON.stringify({
      title: "Shop",
      tables: [{
        id: "orders",
        group: "Sales",
        caption: "",
        columns: [{ name: "id", type: "bigint" }],
      }],
      links: [],
    }));
    const generation = spawnSync(
      process.execPath,
      [generator.pathname, source, destination],
      { encoding: "utf8" },
    );
    assert.equal(generation.status, 0, generation.stderr);
    assert.ok((await readFile(destination, "utf8")).includes('"status":"existing"'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("renamed filler cannot justify tables or columns", async () => {
  const directory = await mkdtemp(join(tmpdir(), "erd-reuse-"));
  const source = join(directory, "schema.json");
  const destination = join(directory, "diagram.html");
  try {
    for (const scope of ["table", "column", "mixed"]) {
      const tables = ["alpha", "beta"].map((id, index) => {
        const caption = `${id} caption`;
        const name = `${id}_name`;
        const columnScope = scope === "column" || (scope === "mixed" && index === 1);
        const change = {
          status: "new",
          reuse: {
            checked: "src/orders.ts:Order",
            why: index === 0
              ? `The existing primitive does not name ${id} ${caption} ${columnScope ? name : ""}'s experiment-specific ownership, identity or immutable grading contract`
              : `THE EXISTING PRIMITIVE  DOES NOT NAME ${id.toUpperCase()} ${caption.toUpperCase()} ${columnScope ? name.toUpperCase() : ""}'S EXPERIMENT-SPECIFIC OWNERSHIP, IDENTITY OR IMMUTABLE GRADING CONTRACT`,
          },
        };
        return {
          id,
          group: "Sales",
          caption,
          ...(!columnScope ? change : {}),
          columns: [{ name, type: "text", ...(columnScope ? change : {}) }],
        };
      });
      await writeFile(source, JSON.stringify({ title: "Shop", tables, links: [] }));
      const generation = spawnSync(process.execPath, [generator.pathname, source, destination], { encoding: "utf8" });
      assert.equal(generation.status, 1, generation.stdout);
      assert.match(generation.stderr, /Table beta.*reuse.why repeats Table alpha/);
      const columnScope = scope === "column";
      const mixedScope = scope === "mixed";
      if (columnScope) assert.match(generation.stderr, /column beta_name.*column alpha_name/);
      if (mixedScope) assert.match(generation.stderr, /column beta_name/);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("source checks reject every missing reference and accept real symbols only within reuseRoot", async () => {
  const directory = await mkdtemp(join(tmpdir(), "erd-reuse-"));
  const source = join(directory, "schema.json");
  const destination = join(directory, "diagram.html");
  try {
    await writeFile(join(directory, "orders.ts"), "class Order {}\nclass GiftMessage {}\n");
    await mkdir(join(directory, "nested"));
    for (const { reuseRoot, checked, diagnostic } of [
      { reuseRoot: directory, checked: "orders.ts:Order, orders.ts:GiftMessage", diagnostic: undefined },
      { reuseRoot: undefined, checked: "src/@sales/order models.ts:Order", diagnostic: undefined },
      { reuseRoot: "relative/path", checked: "orders.ts:Order", diagnostic: /reuseRoot must be an absolute repo path/ },
      { reuseRoot: directory, checked: "missing.ts:Order, orders.ts:MissingSymbol", diagnostic: /missing.ts[\s\S]*orders.ts does not contain MissingSymbol/ },
      { reuseRoot: join(directory, "nested"), checked: "../orders.ts:Order", diagnostic: /outside reuseRoot/ },
    ]) {
      await writeFile(source, JSON.stringify({
        title: "Shop",
        reuseRoot,
        tables: [{
          id: "order_lines",
          group: "Sales",
          caption: "Books purchased",
          status: "new",
          reuse: { checked, why: "Each book has separate gift options." },
          columns: [{ name: "id", type: "bigint" }],
        }],
        links: [],
      }));
      const generation = spawnSync(process.execPath, [generator.pathname, source, destination], { encoding: "utf8" });
      const expectsDiagnostic = diagnostic !== undefined;
      assert.equal(generation.status, expectsDiagnostic ? 1 : 0, generation.stderr);
      if (expectsDiagnostic) {
        assert.match(generation.stderr, diagnostic);
        const sourceFailure = reuseRoot !== "relative/path";
        if (sourceFailure) assert.match(generation.stderr, /Table order_lines.reuse.checked/);
      }
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

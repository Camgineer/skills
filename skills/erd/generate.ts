import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

type DesignChange =
  | { status: "existing"; reuse?: never }
  | { status: "new" | "changed"; reuse: { checked: string; why: string } };
type Column = DesignChange & { name: string; type: string; pk?: boolean; fk?: boolean; unique?: boolean; values?: string[] };
type Table = DesignChange & { id: string; group: string; caption: string; columns: Column[] };
type Endpoint = { table: string; column: string };
type Link = { fk: Endpoint; pk: Endpoint; soft?: boolean };
type Schema = { title: string; subtitle?: string; tables: Table[]; links: Link[] };

function requireRecord(candidate: unknown, path: string): Record<string, unknown> {
  const isRecord = typeof candidate === "object" && candidate !== null && !Array.isArray(candidate);
  if (!isRecord) throw new Error(`${path} must be an object`);
  return candidate as Record<string, unknown>;
}

function requireString(candidate: unknown, path: string): string {
  const isString = typeof candidate === "string";
  if (!isString) throw new Error(`${path} must be a string`);
  return candidate;
}

function requireNonBlankString(candidate: unknown, path: string): string {
  const identifier = requireString(candidate, path);
  const isBlank = identifier.trim().length === 0;
  if (isBlank) throw new Error(`${path} must not be blank`);
  return identifier;
}

function requireFlag(candidate: unknown, path: string): boolean | undefined {
  const isFlag = candidate === undefined || typeof candidate === "boolean";
  if (!isFlag) throw new Error(`${path} must be a boolean`);
  return candidate;
}

function requireArray(candidate: unknown, path: string): unknown[] {
  const isArray = Array.isArray(candidate);
  if (!isArray) throw new Error(`${path} must be an array`);
  return candidate;
}

function rejectUnknownKeys(record: Record<string, unknown>, allowed: string[], path: string): void {
  for (const key of Object.keys(record)) {
    const unknownKey = !allowed.includes(key);
    if (unknownKey) throw new Error(`${path}.${key} is not a supported key`);
  }
}

const endpointKey = (endpoint: Endpoint): string => JSON.stringify([endpoint.table, endpoint.column]);
const diagnosticMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);

function requireAllowedValues(candidate: unknown, path: string): string[] | undefined {
  const omitted = candidate === undefined;
  if (omitted) return undefined;
  return requireArray(candidate, path).map((value, index) => requireString(value, `${path}[${index}]`));
}

function requireDesignChange({ record, path }: {
  record: Record<string, unknown>;
  path: string;
}): DesignChange {
  const status = record.status === undefined ? "existing" : record.status;
  const existing = status === "existing";
  if (existing) {
    const hasReuse = record.reuse !== undefined;
    if (hasReuse) throw new Error(`${path}.reuse is only allowed for new or changed elements`);
    return { status };
  }

  const unsupportedStatus = status !== "new" && status !== "changed";
  if (unsupportedStatus) throw new Error(`${path}.status must be existing, new or changed`);
  const reuse = requireRecord(record.reuse, `${path}.reuse`);
  rejectUnknownKeys(reuse, ["checked", "why"], `${path}.reuse`);
  return {
    status,
    reuse: {
      checked: requireNonBlankString(reuse.checked, `${path}.reuse.checked`),
      why: requireNonBlankString(reuse.why, `${path}.reuse.why`),
    },
  };
}

function validateSchema(candidate: unknown): Schema {
  const schema = requireRecord(candidate, "schema");
  rejectUnknownKeys(schema, ["title", "subtitle", "tables", "links"], "schema");
  const title = requireNonBlankString(schema.title, "title");
  const subtitle = schema.subtitle === undefined ? undefined : requireString(schema.subtitle, "subtitle");
  const tablesById = new Map<string, Table>();
  const tables = requireArray(schema.tables, "tables").map((candidate, index) => {
    const path = `tables[${index}]`;
    const table = requireRecord(candidate, path);
    rejectUnknownKeys(table, ["id", "group", "caption", "columns", "status", "reuse"], path);
    const id = requireNonBlankString(table.id, `${path}.id`);
    const duplicateTable = tablesById.has(id);
    if (duplicateTable) throw new Error(`Duplicate table: ${id}`);

    const columnNames = new Set<string>();
    const columns = requireArray(table.columns, `${path}.columns`).map((candidate, index) => {
      const columnPath = `${path}.columns[${index}]`;
      const column = requireRecord(candidate, columnPath);
      rejectUnknownKeys(column, ["name", "type", "pk", "fk", "unique", "values", "status", "reuse"], columnPath);
      const columnName = requireNonBlankString(column.name, `${columnPath}.name`);
      const duplicateColumn = columnNames.has(columnName);
      if (duplicateColumn) throw new Error(`Duplicate column: ${id}.${columnName}`);
      columnNames.add(columnName);
      return {
        ...requireDesignChange({ record: column, path: `Table ${id}, column ${columnName}` }),
        name: columnName,
        type: requireNonBlankString(column.type, `${columnPath}.type`),
        pk: requireFlag(column.pk, `${columnPath}.pk`),
        fk: requireFlag(column.fk, `${columnPath}.fk`),
        unique: requireFlag(column.unique, `${columnPath}.unique`),
        values: requireAllowedValues(column.values, `${columnPath}.values`),
      };
    });
    const hasNoColumns = columns.length === 0;
    if (hasNoColumns) throw new Error(`${path}.columns must contain at least one column`);

    const validatedTable: Table = {
      ...requireDesignChange({ record: table, path: `Table ${id}` }),
      id,
      group: requireNonBlankString(table.group, `${path}.group`),
      caption: requireString(table.caption, `${path}.caption`),
      columns,
    };
    tablesById.set(id, validatedTable);
    return validatedTable;
  });
  const hasNoTables = tables.length === 0;
  if (hasNoTables) throw new Error("tables must contain at least one table");

  const columnsByEndpoint = new Map<string, Column>();
  for (const table of tables) {
    for (const column of table.columns) {
      columnsByEndpoint.set(endpointKey({ table: table.id, column: column.name }), column);
    }
  }

  function endpoint(candidate: unknown, path: string): Endpoint {
    const reference = requireRecord(candidate, path);
    rejectUnknownKeys(reference, ["table", "column"], path);
    const tableId = requireNonBlankString(reference.table, `${path}.table`);
    const columnName = requireNonBlankString(reference.column, `${path}.column`);
    const table = tablesById.get(tableId);
    const missingTable = table === undefined;
    if (missingTable) throw new Error(`${path} references missing table: ${tableId}`);
    const missingColumn = !columnsByEndpoint.has(endpointKey({ table: tableId, column: columnName }));
    if (missingColumn) throw new Error(`${path} references missing column: ${tableId}.${columnName}`);
    return { table: tableId, column: columnName };
  }

  const linkPairs = new Set<string>();
  const links = requireArray(schema.links, "links").map((candidate, index) => {
    const path = `links[${index}]`;
    const link = requireRecord(candidate, path);
    rejectUnknownKeys(link, ["fk", "pk", "soft"], path);
    const foreignKeyEndpoint = endpoint(link.fk, `${path}.fk`);
    const referencedEndpoint = endpoint(link.pk, `${path}.pk`);
    const pair = JSON.stringify([endpointKey(foreignKeyEndpoint), endpointKey(referencedEndpoint)]);
    const duplicateLink = linkPairs.has(pair);
    if (duplicateLink) throw new Error(`${path} duplicates a foreign key relationship`);
    linkPairs.add(pair);
    return {
      fk: foreignKeyEndpoint,
      pk: referencedEndpoint,
      soft: requireFlag(link.soft, `${path}.soft`),
    };
  });
  const linkedForeignKeys = new Set(links.map(link => endpointKey(link.fk)));
  for (const table of tables) {
    for (const column of table.columns) {
      const missingLink = column.fk && !linkedForeignKeys.has(endpointKey({ table: table.id, column: column.name }));
      if (missingLink) throw new Error(`Foreign key has no link: ${table.id}.${column.name}`);
    }
  }
  for (const link of links) {
    const foreignKeyEndpoint = link.fk;
    const referencedEndpoint = link.pk;
    const foreignKeyColumn = columnsByEndpoint.get(endpointKey(foreignKeyEndpoint))!;
    const referencedColumn = columnsByEndpoint.get(endpointKey(referencedEndpoint))!;
    const missingForeignKey = !foreignKeyColumn.fk;
    if (missingForeignKey) throw new Error(`${foreignKeyEndpoint.table}.${foreignKeyEndpoint.column} must have fk: true`);
    const missingReferencedKey = !referencedColumn.pk && !referencedColumn.unique;
    if (missingReferencedKey) throw new Error(`${referencedEndpoint.table}.${referencedEndpoint.column} must have pk: true or unique: true`);
  }
  return { title, subtitle, tables, links };
}

async function generate(): Promise<void> {
  const args = process.argv.slice(2);
  const wrongArguments = args.length !== 2;
  if (wrongArguments) throw new Error("Usage: node generate.ts schema.json out.html (Node 24+)");

  const [source, destination] = args;
  const sourceText = await readFile(source, "utf8");
  let parsedSchema: unknown;
  try {
    parsedSchema = JSON.parse(sourceText);
  } catch (error) {
    const diagnostic = diagnosticMessage(error);
    throw new Error(`${source} is not valid JSON: ${diagnostic}`, { cause: error });
  }
  const schema = validateSchema(parsedSchema);
  const template = await readFile(join(import.meta.dirname, "template.html"), "utf8");
  const embeddedSchema = JSON.stringify(schema).replaceAll("<", "\\u003c");
  const html = template.replace("{{SCHEMA_JSON}}", () => embeddedSchema);
  await writeFile(destination, html);
  console.log(`Wrote ${destination}: ${schema.tables.length} tables, ${schema.links.length} links`);
}

try {
  await generate();
} catch (error) {
  const diagnostic = diagnosticMessage(error);
  console.error(`Cannot generate ERD: ${diagnostic}`);
  process.exitCode = 1;
}

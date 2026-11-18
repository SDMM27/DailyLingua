import type { AppClient } from "./client";

type Row = Record<string, unknown>;

export interface FakeQuery {
  table: string;
  /** Filters and modifiers in call order, as `method(arg, ...)`. */
  chain: string[];
  /** Number of rows the query returned. */
  returned: number;
}

/**
 * In-memory test double of an `AppClient` for the read functions: `from(table)` filters the rows given for that table
 * (`eq`, `neq`, `in`, `is`, `not(..., "is", ...)`, `gte`, `lte`, `order`, `range`, `limit`, `maybeSingle`, `count`) and
 * records every query, so a test can assert which filters a read used (and which it did not). `upsert` with
 * `ignoreDuplicates` keeps the first row of a conflict. Only for unit tests, never imported by the package itself.
 */
export function tableFake(tables: Record<string, Row[]>, options: { rpc?: (name: string, args: unknown) => { data: unknown; error: { code?: string; message?: string } | null } } = {}) {
  const queries: FakeQuery[] = [];
  const store: Record<string, Row[]> = Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, [...rows]]));

  function from(table: string) {
    const record: FakeQuery = { table, chain: [], returned: 0 };
    queries.push(record);
    const tests: ((row: Row) => boolean)[] = [];
    const orders: { column: string; ascending: boolean }[] = [];
    let range: [number, number] | null = null;
    let limit: number | null = null;
    let single = false;
    let head = false;
    let counted = false;
    let upsert: { rows: Row[]; onConflict: string[]; ignore: boolean } | null = null;

    const log = (method: string, args: unknown[]) => record.chain.push(`${method}(${args.map((arg) => JSON.stringify(arg)).join(",")})`);
    const compare = (a: unknown, b: unknown) => (a === b ? 0 : (a as string | number) < (b as string | number) ? -1 : 1);

    function run() {
      if (upsert) {
        for (const row of upsert.rows) {
          const exists = (store[table] ??= []).some((other) => upsert!.onConflict.every((column) => other[column] === row[column]));
          if (!exists) store[table]!.push({ ...row });
        }
        return { data: null, error: null };
      }
      let rows = (store[table] ?? []).filter((row) => tests.every((test) => test(row)));
      for (const { column, ascending } of [...orders].reverse()) rows = [...rows].sort((a, b) => (ascending ? 1 : -1) * compare(a[column], b[column]));
      const total = rows.length;
      if (range) rows = rows.slice(range[0], range[1] + 1);
      if (limit !== null) rows = rows.slice(0, limit);
      record.returned = rows.length;
      if (single) return { data: rows[0] ?? null, error: null };
      if (head) return { data: null, error: null, count: counted ? total : null };
      return { data: rows, error: null };
    }

    const builder: Record<string, unknown> = {
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each filter has its own argument list
    const add = (method: string, make: (...args: any[]) => (row: Row) => boolean) => {
      builder[method] = (...args: unknown[]) => {
        log(method, args);
        tests.push(make(...args));
        return builder;
      };
    };
    add("eq", (column: string, value: unknown) => (row) => row[column] === value);
    add("neq", (column: string, value: unknown) => (row) => row[column] !== value);
    add("in", (column: string, values: unknown[]) => (row) => values.includes(row[column]));
    add("is", (column: string, value: unknown) => (row) => (row[column] ?? null) === value);
    add("not", (column: string, operator: string, value: unknown) => (row) => operator === "is" ? (row[column] ?? null) !== value : true);
    add("gte", (column: string, value: unknown) => (row) => compare(row[column], value) >= 0);
    add("lte", (column: string, value: unknown) => (row) => compare(row[column], value) <= 0);
    builder.select = (columns?: string, opts?: { count?: string; head?: boolean }) => {
      log("select", [columns]);
      head = opts?.head === true;
      counted = opts?.count !== undefined;
      return builder;
    };
    builder.order = (column: string, opts?: { ascending?: boolean }) => {
      log("order", [column, opts]);
      orders.push({ column, ascending: opts?.ascending !== false });
      return builder;
    };
    builder.range = (a: number, b: number) => {
      log("range", [a, b]);
      range = [a, b];
      return builder;
    };
    builder.limit = (n: number) => {
      log("limit", [n]);
      limit = n;
      return builder;
    };
    builder.maybeSingle = () => {
      log("maybeSingle", []);
      single = true;
      return builder;
    };
    builder.upsert = (value: Row | Row[], opts: { onConflict: string; ignoreDuplicates?: boolean }) => {
      log("upsert", [value, opts]);
      upsert = { rows: Array.isArray(value) ? value : [value], onConflict: opts.onConflict.split(","), ignore: opts.ignoreDuplicates === true };
      return builder;
    };
    return builder;
  }

  const client = {
    schema() {
      return {
        from,
        rpc: (name: string, args: unknown) => Promise.resolve(options.rpc ? options.rpc(name, args) : { data: null, error: null }),
      };
    },
  } as unknown as AppClient;

  return { client, queries, store };
}

import type { AppClient } from "./client";

export interface FakeResult {
  data: unknown;
  error: { code?: string; message?: string } | null;
}

export interface FakeCall {
  kind: "from" | "rpc";
  name: string;
  args: unknown;
  /** Builder methods chained after `from(table)`, in order, as `method(args)`. */
  chain: string[];
}

/**
 * Test double of an `AppClient`: `schema()` returns a builder that records the calls and answers
 * every query or RPC with `result`. Only for unit tests, never imported by the package itself.
 */
export function fakeClient(result: FakeResult) {
  const calls: FakeCall[] = [];
  const schemas: string[] = [];

  function from(name: string) {
    const call: FakeCall = { kind: "from", name, args: undefined, chain: [] };
    calls.push(call);
    const builder: Record<string, unknown> = {
      then: (resolve: (value: FakeResult) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve(result).then(resolve, reject),
    };
    for (const method of ["select", "eq", "order", "maybeSingle"]) {
      builder[method] = (...args: unknown[]) => {
        call.chain.push(`${method}(${args.map((a) => JSON.stringify(a)).join(",")})`);
        return builder;
      };
    }
    return builder;
  }

  function rpc(name: string, args: unknown) {
    calls.push({ kind: "rpc", name, args, chain: [] });
    return Promise.resolve(result);
  }

  const client = {
    schema(name: string) {
      schemas.push(name);
      return { from, rpc };
    },
  } as unknown as AppClient;

  return { client, calls, schemas };
}

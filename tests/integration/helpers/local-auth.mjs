import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

// Shared local-only integration harness (one process per suite).
export const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
assert.equal(url, "http://127.0.0.1:54321", "Local Supabase only");
assert.ok(key && secret, "Missing local keys");
export const base = "http://localhost:3000";
export const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const userIds = [];
export const projectIds = [];
export const tag = crypto.randomUUID();
const keep = process.argv.includes("--keep");

export function check(result) {
  if (result.error) throw new Error(`${result.error.code ?? "SDK"}: ${result.error.message}`);
  return result.data;
}
export function pass(name) { console.log(`PASS: ${name}`); }
export async function account(label) {
  const email = `c-integration-${tag}-${label}@example.com`;
  const password = `Local-${crypto.randomUUID()}!`;
  const { user } = check(await admin.auth.admin.createUser({ email, password, email_confirm: true }));
  userIds.push(user.id);
  const jar = new Map();
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (values) => {
        for (const { name, value } of values) {
          if (value === "") jar.delete(name);
          else jar.set(name, value);
        }
      },
    },
  });
  check(await client.auth.signInWithPassword({ email, password }));
  return { user, client, jar };
}
export async function request(path, actor, body, method = "POST") {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (actor) {
    headers.Cookie = [...actor.jar].map(([n, v]) => `${n}=${encodeURIComponent(v)}`).join("; ");
  }
  const res = await fetch(base + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`${path}: non-JSON HTTP ${res.status}`); }
  return { status: res.status, data };
}
export function expect(res, status, code) {
  assert.equal(res.status, status, JSON.stringify(res));
  if (code) assert.equal(res.data.error?.code, code, JSON.stringify(res));
}

export async function cleanup() {
  if (keep) {
    console.log("Kept local test project IDs:", projectIds);
    return;
  }
  // Remove only rows created by this process, and only from the local DB.
  for (const pid of projectIds.reverse()) {
    const r = await admin.from("projects").delete().eq("id", pid);
    if (r.error) {
      console.warn("Cleanup project:", r.error.message);
      process.exitCode = 1;
    }
  }
  for (const uid of userIds.reverse()) {
    const r = await admin.auth.admin.deleteUser(uid);
    if (r.error) {
      console.warn("Cleanup user:", r.error.message);
      process.exitCode = 1;
    }
  }
}

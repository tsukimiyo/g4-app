import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { url, key, admin, projectIds, tag, check, pass, account, request, expect, cleanup, base } from "./helpers/local-auth.mjs";

const post = request;

try {
  const owner = await account("owner");
  const a = await account("a");
  const b = await account("b");
  const deadline = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + 30 * 86400000));
  const title = `C invite integration ${tag}`;
  const created = await post("/api/projects", owner, {
    course: "HCI", teamName: "Local test", title, memberCount: 2,
    finalDeadline: deadline, taEmails: [], displayName: "Owner",
  });
  expect(created, 201);
  const pid = created.data.project.id;
  // Verify the project really exists in this local database before proceeding.
  const localProject = check(await admin.from("projects").select("id,created_by").eq("id", pid).single());
  assert.equal(localProject.created_by, owner.user.id);
  projectIds.push(pid);
  assert.equal(created.data.member.color, "#ef4444");
  pass("C-01 created local project and owner");

  const invitePath = `/api/projects/${pid}/invites`;
  expect(await post(invitePath, null), 401, "UNAUTHENTICATED");
  expect(await post(invitePath, a), 403, "NOT_MEMBER");
  pass("invite authentication and membership");

  const start = Date.now();
  const invite = await post(invitePath, owner);
  expect(invite, 201);
  const { code, url: inviteUrl } = invite.data;
  assert.match(code, /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
  assert.equal(inviteUrl, new URL(`/join/${code}`, process.env.NEXT_PUBLIC_SITE_URL ?? base).toString());
  const stored = check(await admin.from("invites").select("*").eq("code", code).single());
  assert.equal(stored.project_id, pid);
  const expiry = Date.parse(stored.expires_at);
  assert.ok(expiry >= start + 7 * 86400000 - 10000 && expiry <= Date.now() + 7 * 86400000 + 10000);
  const second = await post(invitePath, owner);
  expect(second, 201);
  assert.notEqual(second.data.code, code);
  pass("unique invites, URL and seven-day expiry");

  const joinPath = `/api/join/${code}`;
  expect(await post(joinPath, null, { displayName: "A" }), 401, "UNAUTHENTICATED");
  expect(await post(joinPath, a, {}), 400, "VALIDATION_FAILED");
  expect(await post(joinPath, a, { displayName: " \t" }), 400, "VALIDATION_FAILED");
  expect(await post(`/api/join/${tag}`, a, { displayName: "A" }), 404, "INVITE_INVALID");
  const expired = `expired-${tag}`;
  check(await admin.from("invites").insert({ code: expired, project_id: pid, expires_at: new Date(Date.now() - 60000).toISOString() }));
  expect(await post(`/api/join/${expired}`, a, { displayName: "A" }), 404, "INVITE_INVALID");
  pass("join authentication, validation, missing and expired invites");

  const ownerAgain = await post(joinPath, owner, { displayName: "Not a rename" });
  expect(ownerAgain, 200);
  assert.equal(ownerAgain.data.member.id, created.data.member.id);
  assert.equal(ownerAgain.data.member.displayName, "Owner");
  pass("existing member is returned unchanged");

  // Use two DIFFERENT invite codes for the same project; the project lock must serialize them.
  const contenders = [a, b];
  const results = await Promise.all([
    post(joinPath, a, { displayName: "A" }),
    post(`/api/join/${second.data.code}`, b, { displayName: "B" }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409], JSON.stringify(results));
  const winnerIndex = results.findIndex((r) => r.status === 200);
  const winner = contenders[winnerIndex];
  const loser = contenders[1 - winnerIndex];
  const won = results[winnerIndex].data;
  expect(results[1 - winnerIndex], 409, "PROJECT_FULL");
  assert.equal(won.projectId, pid);
  assert.equal(won.member.projectId, pid);
  assert.equal(won.member.userId, winner.user.id);
  assert.equal(won.member.color, "#3b82f6");
  pass("concurrent joins using different codes: only one succeeds");

  const repeats = await Promise.all([
    post(joinPath, winner, { displayName: "Again 1" }),
    post(joinPath, winner, { displayName: "Again 2" }),
  ]);
  for (const result of repeats) {
    expect(result, 200);
    assert.deepEqual(result.data.member, won.member);
  }
  expect(await post(joinPath, loser, { displayName: "Still full" }), 409, "PROJECT_FULL");
  const members = check(await admin.from("members").select("id,user_id").eq("project_id", pid));
  assert.equal(members.length, 2);
  assert.equal(new Set(members.map((m) => m.user_id)).size, 2);
  pass("duplicate requests remain idempotent; capacity enforced in database");

  const ownRows = check(await winner.client.from("projects").select("id").eq("id", pid));
  const foreignRows = check(await loser.client.from("projects").select("id").eq("id", pid));
  const foreignInvites = check(await loser.client.from("invites").select("code").eq("project_id", pid));
  assert.equal(ownRows.length, 1);
  assert.equal(foreignRows.length, 0);
  assert.equal(foreignInvites.length, 0);
  expect(await post(invitePath, loser), 403, "NOT_MEMBER");
  pass("RLS and non-member invite access");

  for (const client of [loser.client, createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })]) {
    const direct = await client.rpc("join_project_by_invite", { p_code: code, p_user_id: owner.user.id, p_display_name: "Impersonation" });
    assert.ok(["42501", "PGRST202"].includes(direct.error?.code), JSON.stringify(direct.error));
  }
  pass("authenticated and anonymous clients cannot directly invoke RPC");
  console.log("ALL INVITE/JOIN TESTS PASSED");
} finally {
  await cleanup();
}

import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { url, key, admin, projectIds, tag, check, pass, account, request, expect, cleanup } from "./helpers/local-auth.mjs";

const post = request;
const patch = (path, actor, body) => request(path, actor, body, "PATCH");
const deadline = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + 30 * 86400000));
async function project(actor, label) {
  const r = await post("/api/projects", actor, { course: "HCI", teamName: "Draft test", title: `Draft ${label} ${tag}`, memberCount: 2, finalDeadline: deadline, displayName: label, taEmails: [] });
  expect(r, 201);
  const pid = r.data.project.id;
  const local = check(await admin.from("projects").select("created_by").eq("id", pid).single());
  assert.equal(local.created_by, actor.user.id);
  projectIds.push(pid);
  return { pid, member: r.data.member };
}
function task(key, memberId, title = key) {
  return { key, taskId: null, title, assignees: memberId ? [{ memberId, part: null }] : [], deadline: memberId ? deadline : null, deadlineText: null, evidence: [], confidence: null, reportEveryDays: null, reportTime: "21:00" };
}
async function snapshot(did) { return check(await admin.from("division_drafts").select("*").eq("id", did).single()); }
async function votes(did) { return check(await admin.from("division_confirmations").select("*").eq("draft_id", did)); }
try {
  const owner = await account("owner");
  const a = await account("a");
  const outsider = await account("outsider");
  const { pid, member } = await project(owner, "owner");
  const foreign = await project(outsider, "outsider");
  const createPath = `/api/projects/${pid}/drafts`;
  expect(await post(createPath, null), 401, "UNAUTHENTICATED");
  expect(await post(createPath, outsider), 403, "NOT_MEMBER");
  const created = await post(createPath, owner);
  expect(created, 201);
  const { draft, warnings } = created.data;
  const did = draft.id;
  const path = `/api/drafts/${did}`;
  assert.equal(draft.projectId, pid);
  assert.equal(draft.version, 1);
  assert.equal(draft.status, "draft");
  assert.equal(draft.source, "manual");
  assert.equal(draft.importId, null);
  assert.deepEqual(draft.tasks, []);
  assert.deepEqual(warnings, [{ code: "MEMBER_NO_TASK", memberId: member.id }]);
  expect(await post(path + "/submit", owner), 409, "MEMBERS_NOT_JOINED");
  pass("draft creation, access and incomplete membership");
  const concurrent = await Promise.all([post(createPath, owner), post(createPath, owner)]);
  for (const r of concurrent) expect(r, 201);
  assert.deepEqual(concurrent.map((r) => r.data.draft.version).sort((a,b) => a-b), [2,3]);
  pass("concurrent creation produces distinct versions");
  const invite = await post(`/api/projects/${pid}/invites`, owner);
  expect(invite, 201);
  const joined = await post(`/api/join/${invite.data.code}`, a, { displayName: "A" });
  expect(joined, 200);
  const aid = joined.data.member.id;
  expect(await patch(path, null, { tasks: [] }), 401, "UNAUTHENTICATED");
  expect(await patch(path, outsider, { tasks: [] }), 403, "NOT_MEMBER");
  expect(await post(path + "/submit", outsider), 403, "NOT_MEMBER");
  expect(await patch(`/api/drafts/${crypto.randomUUID()}`, owner, { tasks: [] }), 404, "DRAFT_NOT_FOUND");
  expect(await patch(path, owner, {}), 400, "VALIDATION_FAILED");
  const incomplete = await patch(path, owner, { tasks: [task("unassigned", null)], openQuestions: ["Need owner"] });
  expect(incomplete, 200);
  assert.equal(incomplete.data.warnings.filter(w => w.code === "MEMBER_NO_TASK").length, 2);
  assert.ok(incomplete.data.warnings.some(w => w.code === "TASK_NO_ASSIGNEE"));
  assert.ok(incomplete.data.warnings.some(w => w.code === "DEADLINE_MISSING"));
  const rejected = await post(path + "/submit", owner);
  expect(rejected, 409, "DRAFT_HAS_WARNINGS");
  assert.deepEqual(rejected.data.error.details.warnings, incomplete.data.warnings);
  assert.equal((await snapshot(did)).status, "draft");
  assert.equal((await votes(did)).length, 0);
  pass("incomplete draft persists, but warnings block submit");
  const good = [task("t1", member.id), task("t2", aid)];
  for (const bad of [
    [task("foreign", foreign.member.id)],
    [good[0], { ...good[1], key: good[0].key }],
    [{ ...good[0], assignees: [...good[0].assignees, ...good[0].assignees] }],
    [{ ...good[0], deadline: "2026-02-31" }],
    [{ ...good[0], reportTime: "99:99" }],
    [{ ...good[0], taskId: crypto.randomUUID() }],
    [{ ...good[0], evidence: [123] }],
  ]) expect(await patch(path, owner, { tasks: bad }), 400, "VALIDATION_FAILED");
  assert.deepEqual((await snapshot(did)).tasks, incomplete.data.draft.tasks);
  pass("invalid cross-project references, duplicate keys and malformed values rejected");
  const updated = await patch(path, a, { tasks: good });
  expect(updated, 200);
  assert.deepEqual(updated.data.warnings, []);
  assert.deepEqual(updated.data.draft.openQuestions, ["Need owner"]);
  const stale = await snapshot(did);
  const second = await patch(path, owner, { tasks: good, openQuestions: [] });
  expect(second, 200);
  assert.deepEqual(second.data.draft.openQuestions, []);
  const staleSubmit = await admin.rpc("submit_division_draft", { p_draft_id: did, p_member_id: member.id, p_expected_updated_at: stale.updated_at, p_expected_members: [member.id, aid], p_expected_final_deadline: deadline });
  assert.equal(staleSubmit.error?.message, "DRAFT_CHANGED");
  assert.equal((await votes(did)).length, 0);
  pass("stale validated snapshot cannot be submitted");
  // Race an edit that introduces warnings against a submit of a valid draft.
  const raceId = concurrent[0].data.draft.id;
  const racePath = `/api/drafts/${raceId}`;
  expect(await patch(racePath, owner, { tasks: good }), 200);
  const [editRace, submitRace] = await Promise.all([
    patch(racePath, a, { tasks: [] }), post(racePath + "/submit", owner),
  ]);
  const raced = await snapshot(raceId);
  if (editRace.status === 200) {
    expect(submitRace, 409);
    assert.ok(["DRAFT_CHANGED", "DRAFT_HAS_WARNINGS"].includes(submitRace.data.error.code));
    assert.equal(raced.status, "draft");
    assert.deepEqual(raced.tasks, []);
    assert.equal((await votes(raceId)).length, 0);
  } else {
    expect(editRace, 409, "DRAFT_LOCKED");
    expect(submitRace, 200);
    assert.equal(raced.status, "pending");
    assert.deepEqual(raced.tasks, good);
    assert.equal((await votes(raceId)).length, 1);
  }
  pass("concurrent edit and submit cannot send an invalid draft");

  check(await admin.from("division_confirmations").insert({ draft_id: did, member_id: aid, result: "change_requested", comment: "Old comment" }));
  const submissions = await Promise.all([post(path + "/submit", owner), post(path + "/submit", a)]);
  assert.deepEqual(submissions.map(r=>r.status).sort(), [200,409], JSON.stringify(submissions));
  const winner = submissions[0].status === 200 ? member.id : aid;
  const success = submissions.find(r=>r.status === 200);
  assert.deepEqual(success.data, { status: "pending", confirmed: 1, total: 2 });
  const storedVotes = await votes(did);
  assert.equal(storedVotes.length, 1);
  assert.equal(storedVotes[0].member_id, winner);
  assert.equal(storedVotes[0].result, "confirmed");
  assert.equal(storedVotes[0].comment, null);
  assert.equal((await snapshot(did)).status, "pending");
  expect(await patch(path, owner, { tasks: [] }), 409, "DRAFT_LOCKED");
  expect(await post(path + "/submit", owner), 409, "DRAFT_LOCKED");
  assert.equal(check(await admin.from("tasks").select("id").eq("project_id", pid)).length, 0);
  pass("concurrent submit, old votes cleared, sender counts once, pending locked; no formal tasks yet");
  assert.equal(check(await outsider.client.from("division_drafts").select("id").eq("id", did)).length, 0);
  assert.equal(check(await a.client.from("division_drafts").select("id").eq("id", did)).length, 1);
  for (const client of [a.client, createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })]) {
    const r = await client.rpc("create_manual_draft", { p_project_id: pid, p_member_id: member.id });
    assert.ok(r.error, "direct RPC should be rejected");
    const p = await client.rpc("update_division_draft", { p_draft_id: did, p_member_id: member.id, p_expected_updated_at: stale.updated_at, p_tasks: [], p_open_questions: [] });
    assert.ok(p.error, "direct update RPC should be rejected");
    const q = await client.rpc("submit_division_draft", { p_draft_id: did, p_member_id: member.id, p_expected_updated_at: stale.updated_at, p_expected_members: [member.id, aid], p_expected_final_deadline: deadline });
    assert.ok(q.error, "direct submit RPC should be rejected");
  }
  pass("RLS and direct RPC denial");
  console.log("ALL DRAFT TESTS PASSED");
} finally {
  await cleanup();
}

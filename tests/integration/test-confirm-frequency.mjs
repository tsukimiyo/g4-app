import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { url, key, admin, projectIds, tag, check, pass, account, request, expect, cleanup } from "./helpers/local-auth.mjs";

const post = request;
const patch = (path, actor, body) => request(path, actor, body, "PATCH");
const deadline = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + 30 * 86400000));
async function project(actor, label, count = 3) {
  const r = await post("/api/projects", actor, { course: "HCI", teamName: "Confirm test", title: `Confirm ${label} ${tag}`, memberCount: count, finalDeadline: deadline, displayName: label, taEmails: [] });
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
const put = (path, actor, body) => request(path, actor, body, "PUT");
const confirm = (did, actor, body = { result: "confirmed" }) => post(`/api/drafts/${did}/confirm`, actor, body);
const submit = (did, actor) => post(`/api/drafts/${did}/submit`, actor);
async function tasksFor(pid) { return check(await admin.from("tasks").select("*").eq("project_id", pid)); }
async function join(pid, owner, actor, label) {
  const invite = await post(`/api/projects/${pid}/invites`, owner);
  expect(invite, 201);
  const joined = await post(`/api/join/${invite.data.code}`, actor, { displayName: label });
  expect(joined, 200);
  return joined.data.member.id;
}
async function makeDraft(pid, actor, tasks) {
  const r = await post(`/api/projects/${pid}/drafts`, actor);
  expect(r, 201);
  const did = r.data.draft.id;
  const edit = await patch(`/api/drafts/${did}`, actor, { tasks });
  expect(edit, 200);
  assert.deepEqual(edit.data.warnings, []);
  return did;
}
try {
  const owner = await account("owner");
  const a = await account("a");
  const b = await account("b");
  const outsider = await account("outsider");
  const { pid, member } = await project(owner, "owner");
  const aid = await join(pid, owner, a, "A");
  const bid = await join(pid, owner, b, "B");
  await project(outsider, "outsider", 2);
  const good = [task("t1", member.id), { ...task("t2", aid), assignees: [{memberId: aid, part: "Frontend"}, {memberId: bid, part: "Backend"}] }];
  const did = await makeDraft(pid, owner, good);
  expect(await confirm(did, owner), 409, "DRAFT_LOCKED");
  expect(await confirm(did, null), 401, "UNAUTHENTICATED");
  expect(await confirm(did, outsider), 403, "NOT_MEMBER");
  expect(await confirm(crypto.randomUUID(), owner), 404, "DRAFT_NOT_FOUND");
  expect(await confirm(did, owner, {result:"change_requested", comment:" "}), 400, "VALIDATION_FAILED");
  expect(await confirm(did, owner, {result:"invalid"}), 400, "VALIDATION_FAILED");
  const sub = await submit(did, owner);
  expect(sub, 200);
  assert.deepEqual(sub.data, {status:"pending",confirmed:1,total:3});
  const repeat = await confirm(did, owner);
  expect(repeat, 200);
  assert.deepEqual(repeat.data, sub.data);
  const avote = await confirm(did, a);
  expect(avote, 200);
  assert.deepEqual(avote.data, {status:"pending",confirmed:2,total:3});
  assert.equal((await tasksFor(pid)).length, 0);
  const premature = await admin.rpc("activate_draft", {p_draft_id:did});
  assert.equal(premature.error?.message, "DRAFT_NOT_CONFIRMED");
  pass("confirmation auth, status, duplicate vote, no premature activation");
  const oldRound = await snapshot(did);
  const change = await confirm(did,b,{result:"change_requested",comment:"Change deadline"});
  expect(change,200);
  assert.deepEqual(change.data,{status:"draft",confirmed:0,total:3});
  const rejectedVotes = await votes(did);
  assert.equal(rejectedVotes.length,1);
  assert.equal(rejectedVotes[0].member_id,bid);
  assert.equal(rejectedVotes[0].comment,"Change deadline");
  assert.equal(rejectedVotes[0].result,"change_requested");
  expect(await patch(`/api/drafts/${did}`, owner, {tasks:good}),200);
  expect(await submit(did,owner),200);
  assert.equal((await votes(did)).length,1);
  const stale = await admin.rpc("confirm_division_draft", {p_draft_id:did,p_member_id:aid,p_expected_updated_at:oldRound.updated_at,p_result:"confirmed",p_comment:null});
  assert.equal(stale.error?.message,"DRAFT_CHANGED");
  pass("change request preserves comment, resets votes; stale round rejected");
  const finalVotes = await Promise.all([confirm(did,a),confirm(did,b)]);
  for (const r of finalVotes) expect(r,200);
  assert.deepEqual(finalVotes.map(r=>r.data.status).sort(),["active","pending"]);
  assert.equal(finalVotes.find(r=>r.data.status==="active").data.confirmed,3);
  assert.equal((await votes(did)).length,3);
  const active = await snapshot(did);
  assert.equal(active.status,"active");
  const first = await tasksFor(pid);
  assert.equal(first.length,2);
  const t1 = first.find(t=>t.title==="t1");
  const t2 = first.find(t=>t.title==="t2");
  assert.ok(t1 && t2);
  assert.equal(t1.report_every_days,7);
  assert.equal(t1.progress,0);
  assert.equal(active.tasks.find(t=>t.key==="t1").taskId,t1.id);
  assert.equal(active.tasks.find(t=>t.key==="t2").taskId,t2.id);
  const assignees = check(await admin.from("task_assignees").select("*").eq("task_id",t2.id));
  assert.equal(assignees.length,2);
  assert.equal(assignees.find(x=>x.member_id===aid).part,"Frontend");
  expect(await confirm(did,b),409,"DRAFT_LOCKED");
  pass("simultaneous last votes activate once; task IDs and assignees materialized");
  const freqPath = `/api/tasks/${t2.id}/frequency`;
  const freq = {reportEveryDays:2,reportTime:"09:05"};
  expect(await put(freqPath,null,freq),401,"UNAUTHENTICATED");
  expect(await put(freqPath,outsider,freq),403,"NOT_MEMBER");
  expect(await put(freqPath,owner,freq),403,"NOT_ASSIGNEE");
  expect(await put(`/api/tasks/${crypto.randomUUID()}/frequency`,a,freq),404,"TASK_NOT_FOUND");
  for (const bad of [{...freq,reportEveryDays:0},{...freq,reportEveryDays:15},{...freq,reportEveryDays:1.5},{...freq,reportTime:"24:00"},{...freq,reportTime:"09:99"}]) expect(await put(freqPath,a,bad),400,"VALIDATION_FAILED");
  const f = await put(freqPath,a,freq);
  expect(f,200);
  assert.equal(f.data.id,t2.id);
  assert.equal(f.data.reportEveryDays,2);
  assert.equal(f.data.reportTime,"09:05");
  expect(await put(freqPath,b,{reportEveryDays:14,reportTime:"23:59"}),200);
  const stored = check(await admin.from("tasks").select("*").eq("id",t2.id).single());
  assert.equal(stored.report_every_days,14);
  assert.equal(stored.report_time,"23:59:00");
  pass("frequency permission, validation, co-assignee updates and database values");
  // Create a TXT draft directly as fixture (D/E imports/extract are not required).
  const imp = check(await admin.from("transcript_imports").insert({project_id:pid,title:"Fixture",meeting_date:deadline,message_count:3,status:"done",created_by:member.id}).select("id").single());
  check(await admin.from("transcript_messages").insert([0,1,2].map(idx=>({import_id:imp.id,idx,speaker_raw:"Owner",member_id:member.id,text:`fixture ${idx}`}))));
  check(await admin.from("tasks").update({progress:50}).eq("id",t2.id));
  check(await admin.from("task_assignees").update({joined_via:"help"}).eq("task_id",t2.id).eq("member_id",aid));
  // Reuse t2, remove b from it, add a new task for b; t1 omitted but preserved for history.
  const nextTasks = [
    {...task("old",aid,"Updated task"),taskId:t2.id,evidence:[0,2],assignees:[{memberId:aid,part:"Updated"},{memberId:member.id,part:null}]},
    {...task("new",bid,"New task"),evidence:[2],reportEveryDays:2,reportTime:"08:30"}
  ];
  const staleDid = await makeDraft(pid,owner,good);
  expect(await submit(staleDid,owner),200);
  const unsentOldDid = await makeDraft(pid,owner,good);
  const nextRow = check(await admin.from("division_drafts").insert({project_id:pid,version:(await snapshot(unsentOldDid)).version+1,source:"txt",status:"draft",import_id:imp.id,created_by:member.id,tasks:nextTasks}).select("id").single());
  const nextDid = nextRow.id;
  expect(await submit(nextDid,owner),200);
  expect(await confirm(nextDid,a),200);
  // Force a failure on the second task after the first task has been updated.
  // Simulates an invalid DB reference appearing after submit, without changing the public API.
  const before = await snapshot(nextDid);
  const broken = structuredClone(before.tasks);
  broken[1].evidence = [999];
  check(await admin.from("division_drafts").update({tasks:broken}).eq("id",nextDid));
  expect(await confirm(nextDid,b),409,"DRAFT_INVALID");
  assert.equal((await votes(nextDid)).length,2);
  assert.equal((await snapshot(nextDid)).status,"pending");
  assert.equal((await snapshot(did)).status,"active");
  const rolledBack = check(await admin.from("tasks").select("*").eq("id",t2.id).single());
  assert.equal(rolledBack.draft_id,did);
  assert.equal(rolledBack.title,t2.title);
  assert.equal(check(await admin.from("transcript_messages").select("idx").eq("import_id",imp.id)).length,3);
  pass("activation failure rolls back last vote, task writes, status and transcript cleanup");
  check(await admin.from("division_drafts").update({tasks:before.tasks}).eq("id",nextDid));
  const next = await confirm(nextDid,b);
  expect(next,200);
  assert.equal(next.data.status,"active");
  assert.equal((await snapshot(did)).status,"superseded");
  const nextActive = await snapshot(nextDid);
  assert.equal(nextActive.tasks[0].taskId,t2.id);
  assert.ok(nextActive.tasks[1].taskId);
  const second = await tasksFor(pid);
  assert.equal(second.length,3);
  const reused = second.find(t=>t.id===t2.id);
  assert.equal(reused.draft_id,nextDid);
  assert.equal(reused.progress,50);
  assert.equal(reused.created_at,t2.created_at);
  assert.equal(reused.report_every_days,14);
  assert.equal(reused.title,"Updated task");
  const current = second.filter(t=>t.draft_id===nextDid);
  assert.equal(current.length,2);
  assert.equal(current.find(t=>t.title==="New task").report_every_days,2);
  const reassigned = check(await admin.from("task_assignees").select("*").eq("task_id",t2.id));
  assert.deepEqual(reassigned.map(x=>x.member_id).sort(),[aid,member.id].sort());
  assert.equal(reassigned.find(x=>x.member_id===aid).joined_via,"help");
  assert.equal(reassigned.find(x=>x.member_id===aid).part,"Updated");
  expect(await put(freqPath,b,freq),403,"NOT_ASSIGNEE");
  expect(await confirm(staleDid,a),409,"DRAFT_OUTDATED");
  // C-09: stale unsubmitted draft must never enter pending.
  expect(await submit(unsentOldDid,owner),409,"DRAFT_OUTDATED");
  assert.equal((await snapshot(unsentOldDid)).status,"draft");
  assert.equal((await votes(unsentOldDid)).length,0);
  // C-09: omitted historical task remains readable but cannot be edited.
  expect(await put(`/api/tasks/${t1.id}/frequency`,owner,freq),409,"TASK_INACTIVE");
  const historical = check(await admin.from("tasks").select("*").eq("id",t1.id).single());
  assert.equal(historical.draft_id,did);
  assert.equal(historical.report_every_days,t1.report_every_days);
  assert.equal(historical.report_time,t1.report_time);
  expect(await put(freqPath,a,freq),200);
  pass("C-09 outdated submit and inactive frequency rejected; active task remains editable");
  const retained = check(await admin.from("transcript_messages").select("idx").eq("import_id",imp.id).order("idx"));
  assert.deepEqual(retained.map(x=>x.idx),[0,2]);
  pass("new version preserves task identity/progress, syncs assignees, supersedes old draft and prunes evidence");
  assert.equal(check(await outsider.client.from("tasks").select("id").eq("project_id",pid)).length,0);
  const anon = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  for (const client of [a.client,anon]) {
    for (const [fn,args] of [
      ["activate_draft",{p_draft_id:nextDid}],
      ["confirm_division_draft",{p_draft_id:nextDid,p_member_id:aid,p_expected_updated_at:nextActive.updated_at,p_result:"confirmed",p_comment:null}],
      ["set_task_frequency",{p_task_id:t2.id,p_member_id:aid,p_days:7,p_time:"21:00"}]
    ]) {
      const r = await client.rpc(fn,args);
      assert.ok(r.error,`${fn} must not be accessible to browser role`);
      assert.ok(["42501","PGRST202"].includes(r.error.code),JSON.stringify(r.error));
    }
  }
  pass("RLS and direct RPC denial");
  console.log("ALL CONFIRM/FREQUENCY TESTS PASSED");
} finally {
  await cleanup();
}

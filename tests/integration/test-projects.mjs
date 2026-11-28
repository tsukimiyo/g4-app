import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { url, key, admin, projectIds, tag, check, pass, account, request, expect, cleanup } from "./helpers/local-auth.mjs";

try {
  const owner = await account("owner");
  const outsider = await account("outsider");
  const body = {
    course: "HCI", teamName: "Local C-09", title: `Project test ${tag}`,
    memberCount: 2, finalDeadline: "2099-12-31", taEmails: [], displayName: "Owner",
  };
  expect(await request("/api/projects", null, body), 401, "UNAUTHENTICATED");
  expect(await request("/api/projects", owner, {}), 400, "VALIDATION_FAILED");
  for (const field of ["course", "teamName", "title", "displayName"]) {
    expect(await request("/api/projects", owner, { ...body, [field]: " \t" }), 400, "VALIDATION_FAILED");
  }
  expect(await request("/api/projects", owner, { ...body, finalDeadline: "2027-02-30" }), 400, "VALIDATION_FAILED");
  assert.equal(check(await admin.from("projects").select("id").eq("created_by", owner.user.id)).length, 0);
  pass("project authentication and invalid input, including whitespace-only names");
  const r = await request("/api/projects", owner, body);
  expect(r, 201);
  const pid = r.data.project.id;
  const project = check(await admin.from("projects").select("*").eq("id",pid).single());
  assert.equal(project.created_by, owner.user.id);
  projectIds.push(pid);
  assert.equal(r.data.member.projectId,pid);
  assert.equal(r.data.member.userId,owner.user.id);
  const members = check(await admin.from("members").select("*").eq("project_id",pid));
  assert.equal(members.length,1);
  assert.equal(members[0].user_id,owner.user.id);
  assert.equal(check(await owner.client.from("projects").select("id").eq("id",pid)).length,1);
  assert.equal(check(await outsider.client.from("projects").select("id").eq("id",pid)).length,0);
  pass("project and creator written atomically; member-only reads");
  const args = { p_user_id:owner.user.id,p_course:"HCI",p_team_name:"Rollback",p_title:`Rollback ${tag}`,p_member_count:2,p_final_deadline:body.finalDeadline,p_ta_emails:[],p_display_name:null };
  const failure = await admin.rpc("create_project_with_member",args);
  assert.equal(failure.error?.code,"23502");
  assert.equal(check(await admin.from("projects").select("id").eq("created_by",owner.user.id).eq("title",args.p_title)).length,0);
  pass("member insert failure rolls back project insert");
  const anon = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  for (const client of [owner.client,anon]) {
    const direct = await client.rpc("create_project_with_member",{...args,p_display_name:"Unauthorized"});
    assert.ok(["42501","PGRST202"].includes(direct.error?.code),JSON.stringify(direct.error));
  }
  pass("project RPC cannot be invoked by browser roles");
  console.log("ALL PROJECT TESTS PASSED");
} finally {
  await cleanup();
}

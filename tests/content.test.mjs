import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function data(file) {
  const code = ts.transpileModule(readFileSync(new URL(`../data/${file}.ts`,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const context={exports:{}};vm.runInNewContext(code,context);return context.exports;
}
const {projects}=data("projects");const {profile}=data("profile");
test("Every project has a unique routable slug, full case study, and real fallback artwork",()=>{
 assert.equal(projects.length,5);assert.equal(new Set(projects.map(p=>p.slug)).size,5);
 for(const p of projects){assert.match(p.slug,/^[a-z0-9-]+$/);assert.ok(existsSync(new URL(`../public/art/${p.slug}.webp`,import.meta.url)));for(const field of ['title','context','problem','contribution','challenge','result','status'])assert.ok(p[field]?.length>4,`${p.slug}: ${field}`);assert.ok(p.decisions.length>=3);if(p.link)assert.equal(new URL(p.link.url).protocol,'https:');}
});
test("Résumé is either absent or backed by a real local PDF",()=>{
 if(profile.resume){assert.match(profile.resume,/^\/[a-zA-Z0-9/_-]+\.pdf$/);assert.ok(existsSync(new URL(`../public${profile.resume}`,import.meta.url)));} else assert.equal(profile.resume,null);
});
test("Sensitive attribution and pilot status remain explicit",()=>{
 const gym=projects.find(p=>p.slug==='mygym');assert.match(gym.status,/pilot/i);assert.match(gym.team,/three/i);
 const voice=projects.find(p=>p.slug==='vanicert');assert.match(voice.team,/Saran/);assert.match(voice.team,/Tamish/);
 const posture=projects.find(p=>p.slug==='posture-engine');assert.equal(posture.link,undefined);
});

import assert from "node:assert/strict";
const origin = process.env.CHECK_ORIGIN || "http://localhost:3001";
const paths = [
  "/",
  "/work",
  "/work/mygym",
  "/work/vanicert",
  "/work/firstdrop-ai",
  "/work/bhashabuddy",
  "/work/posture-engine",
];
for (const path of paths) {
  const response = await fetch(origin + path);
  const html = await response.text();
  assert.equal(response.status, 200, path);
  assert.match(html, /<main[^>]+id="main"/);
  assert.match(html, /<h1[ >]/);
  assert.match(html, /rel="canonical"/);
  assert.match(html, /property="og:image"/);
  assert.ok(
    !/href="[^\"]*(?:resume|résumé)[^\"]*\.pdf"/i.test(html),
    "No fabricated resume links",
  );
  console.log(
    `${path} 200 · semantic HTML · canonical · social image · ${Math.round(Buffer.byteLength(html) / 1024)} KB HTML`,
  );
}
for (const path of [
  "/opengraph-image",
  ...paths
    .filter((p) => p.startsWith("/work/"))
    .map((p) => p + "/opengraph-image"),
]) {
  const r = await fetch(origin + path);
  assert.equal(r.status, 200, path);
  assert.match(r.headers.get("content-type"), /image\//);
  console.log(`${path} 200 · image`);
}
for (const path of ["/robots.txt", "/sitemap.xml", "/art/hero.webp"]) {
  const r = await fetch(origin + path);
  assert.equal(r.status, 200, path);
  console.log(`${path} 200`);
}
assert.equal((await fetch(origin + "/work/no-such-project")).status, 404);
console.log("Unknown project returns 404. All production smoke checks passed.");

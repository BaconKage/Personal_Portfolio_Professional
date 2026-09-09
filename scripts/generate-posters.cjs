// Rasterise our own procedural vector compositions. No remote or stock assets.
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const sharp = require("sharp");
async function main() {
  const file = path.resolve("components/VectorArtwork.tsx");
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const mod = new Module(file, module);
  mod.filename = file;
  mod.paths = module.paths;
  mod._compile(code, file);
  fs.mkdirSync("public/art", { recursive: true });
  for (const scene of [
    "hero",
    "mygym",
    "vanicert",
    "firstdrop-ai",
    "bhashabuddy",
    "posture-engine",
  ]) {
    let svg = renderToStaticMarkup(
      React.createElement(mod.exports.default, { scene }),
    );
    svg = svg.replace(
      "<svg ",
      '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" ',
    );
    await sharp(Buffer.from(svg))
      .webp({ quality: 88 })
      .toFile(`public/art/${scene}.webp`);
    if (scene === "hero") fs.copyFileSync("public/art/hero.webp", "public/art/hero-kinetic.webp");
  }
  for (const [i, glyph] of ["अ", "அ", "అ", "ಅ"].entries()) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><text x="128" y="185" text-anchor="middle" fill="white" font-family="Nirmala UI,sans-serif" font-size="190">${glyph}</text></svg>`;
    await sharp(Buffer.from(svg)).png().toFile(`public/art/glyph-${i}.png`);
  }
  console.log("Generated six posters and four glyph textures.");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

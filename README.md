# Shubhang Srinivas Varda — immersive portfolio

A new Next.js application built in `C:\Lusion Portfolio`. The original `BaconKage/Personal_Portfolio` repository was used only as a factual reference. This repository has local milestone commits, no remote, and has not been pushed or deployed.

## Run locally

Use Node.js 22 and npm. From PowerShell:

```powershell
Set-Location -LiteralPath 'C:\Lusion Portfolio'
npm ci
npm run dev
```

Open http://localhost:3000. To verify and serve a production build:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run start -- --port 3001
```

In a second terminal, run `node scripts/check-routes.mjs`. It checks the production server at port 3001. Set `CHECK_ORIGIN` to test another local address. Development output is `.next-dev`; production output is `.next`, so a production build does not overwrite the running development bundle.

## Creative direction

Oversized editorial typography, warm paper, cobalt, and large project-specific environments. MyGym is a connected modular operating system; VaniCert is a waveform passing through an analysis aperture; FirstDropAI is a conversation between two responsive contour fields; BhashaBuddy is an orbit of four Indian scripts; Posture Engine is an articulated joint study. The hero is a continuously rotating field of original beveled connectors, with spring motion, separation, and pointer repulsion. Instancing shares one geometry across 42 desktop forms or 22 on lower quality tiers.

The artwork is original conceptual illustration, not a product screenshot or live model output. It sits behind semantic titles, descriptions, and links. Case studies distinguish team delivery from individual contribution and a pilot from a production rollout. Factual sources and attribution decisions are recorded in `CONTENT-SOURCES.md`.

## Architecture

- Next.js 16 App Router, React 19, strict TypeScript. Homepage, work index, and five case studies are prerendered. Server components deliver substantive content before client JavaScript.
- `data/profile.ts` holds identity, experience, and résumé configuration. `data/projects.ts` holds the five case studies and source-backed links.
- `components/Artwork.tsx` uses `next/image` for local WebP posters. `VectorArtwork.tsx` and `scripts/generate-posters.cjs` preserve the procedural source. Assets are already committed; production builds do not regenerate them or depend on Windows fonts. Regeneration of glyph textures uses Nirmala UI on Windows.
- One persistent React Three Fiber canvas serves visible DOM regions through scissored Three.js scenes. Each world is lazy loaded. A maximum of two worlds mount at a time. A shared 320-point field interpolates between adjacent project forms on larger, capable screens.
- GSAP and ScrollTrigger load after motion preferences are resolved. Scoped contexts clean up on route changes. A desktop-only pinned hero expands with native scrolling. Rolling project letters, staggered reveals, title parallax, magnetic links, and an animated mobile menu provide the motion language. Internal page navigation uses a short GSAP curtain before routing; modifier clicks, external links, downloads, and anchors retain native behavior. Mobile scrolling stays unpinned.
- `SceneControls` provides accessible state buttons and live explanatory text. A case change resets its controls. Controls describe an illustration, not model predictions.
- `app/layout.tsx` owns local fonts, navigation, JSON-LD, metadata defaults, and progressive graphics. Route metadata adds canonical URLs and social images. `app/error.tsx` uses this installed Next.js version's `retry` API.

## Performance and accessibility

Visible worlds animate continuously, including on lower quality tiers. Rendering stops when no world is visible or the tab is hidden. Scroll, resize, controls, and pointer input update the scene composition. Coarse pointers and lower-capability devices use fewer vertices and lower DPR; sustained slow frames reduce quality further. Desktop DPR is capped at 1.75; the lower tier is capped at 1.25 and may drop to 1. Geometry and materials are disposed as scenes unmount. No external environment maps, videos, stock models, analytics scripts, or live AI calls are required.

Posters remain available when JavaScript is absent, motion is reduced, WebGL is unavailable, or the context fails. The system reduced-motion preference always wins. The footer's Motion setting can reduce motion further, persists locally, and removes the canvas entirely. All substantive content and navigation remain in server HTML. Mobile navigation uses a native modal dialog with Escape and focus restoration; a noscript navigation is included. The graphics layer never receives pointer events. Focus rings, skip navigation, native links/buttons, semantic headings, and live control descriptions are present.

## Routes

`/`, `/work`, `/work/mygym`, `/work/vanicert`, `/work/firstdrop-ai`, `/work/bhashabuddy`, `/work/posture-engine`.

Also: `/robots.txt`, `/sitemap.xml`, `/opengraph-image`, per-project `/opengraph-image` endpoints, favicon, error and 404 views.

## Before final publication

Supply the real résumé PDF. Place it under `public/` and set `profile.resume` to its actual root-relative PDF path; the navigation then exposes Resume ↗. The test suite verifies that any configured PDF exists. Until then the link is omitted.

Supply the brand-new GitHub repository and final domain. No code or configuration here connects to the old portfolio repository. Product screenshots can be added later if desired, but no screenshots or performance metrics have been fabricated to fill gaps.

## Vercel deployment — when authorized

1. Publish this local repository only to the new GitHub repository supplied by the owner. Do not select or configure `BaconKage/Personal_Portfolio`.
2. In Vercel, create a new project and import that new repository. Use repository root `.`, Framework Preset **Next.js**, Node.js **22.x**, install command **npm ci**, build command **npm run build**, and the default Next.js output directory. No custom routing file or static-export setting is needed. [Vercel build settings](https://vercel.com/docs/builds/configure-a-build).
3. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin, without a trailing slash, in the Production environment. For Preview, use the same production origin for canonical links. The app emits noindex/nofollow on Preview and local builds. If an explicit origin is absent on Vercel, it uses `VERCEL_PROJECT_PRODUCTION_URL`.
4. Complete résumé and content checks before clicking Deploy. Vercel's first deployment of a new project is a production deployment, including a dashboard repository import. Subsequent non-production branch deployments are previews. [Vercel environments](https://vercel.com/docs/deployments/environments).
5. Verify all seven content routes, unknown-project 404, six social images, robots, sitemap, contact links, résumé, mobile navigation, and reduced motion on the generated deployment URL. Check that canonical URLs use the final origin.
6. Add the final domain in the new project's domain settings, follow Vercel's displayed DNS records, and verify HTTPS. Rebuild if the origin environment variable changes. Keep local milestone history.

## Validation scope and limitations

See `QA.md` for the performed visual and technical checks. Browser viewport emulation does not replace testing on a physical iPhone/Android device and Safari. No Lighthouse score, field Core Web Vitals, clinical accuracy, or product usage metrics are claimed. GPU context-failure recovery is implemented but was not induced on the user's graphics device. The site is ready for local review; final hosting, domain, and résumé verification remain publication steps.


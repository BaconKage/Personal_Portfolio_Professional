# Shubhang Srinivas Varda — immersive portfolio

A standalone Next.js portfolio for Shubhang Srinivas Varda, maintained at [BaconKage/Personal_Portfolio_Professional](https://github.com/BaconKage/Personal_Portfolio_Professional). 

## Run locally

Use Node.js 22 and npm:

```bash
git clone https://github.com/BaconKage/Personal_Portfolio_Professional.git
cd Personal_Portfolio_Professional
npm ci
npm run dev
```

Open http://localhost:3000. To verify and serve a production build:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run start -- --port 3001
```

In a second terminal, run `node scripts/check-routes.mjs`. It checks the production server at port 3001. Set `CHECK_ORIGIN` to test another local address. Development output is `.next-dev`; production output is `.next`, so a production build does not overwrite the running development bundle.

## Creative direction

Oversized editorial typography, warm paper, cobalt, and large project-specific environments. MyGym is a connected modular operating system; VaniCert is a waveform passing through an analysis aperture; FirstDropAI is a conversation between two responsive contour fields; BhashaBuddy is an orbit of four Indian scripts; Posture Engine is an articulated joint study. The full-screen dark hero combines a prominent full name and headline with a metallic knot of illuminated pathways. Travelling light, gentle deformation and orbiting particles suggest an active AI core. Desktop positions the sculpture to the right; mobile frames it between the headline and supporting copy. A short SVG cursor trail fades within 650 milliseconds and is disabled for touch and reduced motion.

The artwork is original conceptual illustration, not a product screenshot or live model output. It sits behind semantic titles, descriptions, and links. Case studies distinguish team delivery from individual contribution and a pilot from a production rollout. Factual sources and attribution decisions are recorded in `CONTENT-SOURCES.md`.

## Architecture

- Next.js 16 App Router, React 19, strict TypeScript. Homepage, work index, and five case studies are prerendered. Server components deliver substantive content before client JavaScript.
- `data/profile.ts` holds identity, experience, and résumé configuration. `data/projects.ts` holds the five case studies and source-backed links.
- `components/Artwork.tsx` uses `next/image` for local WebP posters. `VectorArtwork.tsx` and `scripts/generate-posters.cjs` preserve the procedural source. Assets are already committed; production builds do not regenerate them or depend on Windows fonts. Regeneration of glyph textures uses Nirmala UI on Windows.
- One persistent React Three Fiber canvas serves visible DOM regions through scissored Three.js scenes. Each world is lazy loaded. A maximum of two worlds mount at a time. A shared 320-point field interpolates between adjacent project forms on larger, capable screens.
- GSAP and ScrollTrigger load after motion preferences are resolved. Scoped contexts clean up on route changes. The hero enters with staggered typography and leaves with a gentle scale/fade during native, unpinned scrolling. Rolling project/contact letters, staggered reveals, title parallax, magnetic links, and an animated mobile menu provide the motion language. Internal page navigation uses a short GSAP curtain before routing; modifier clicks, external links, downloads, and anchors retain native behavior.
- `SceneControls` provides accessible state buttons and live explanatory text. A case change resets its controls. Controls describe an illustration, not model predictions.
- `app/layout.tsx` owns local fonts, navigation, JSON-LD, metadata defaults, and progressive graphics. Route metadata adds canonical URLs and social images. `app/error.tsx` uses this installed Next.js version's `retry` API.

## Performance and accessibility

Visible worlds animate continuously, including on lower quality tiers. Rendering stops when no world is visible and layout has settled, or the tab is hidden. Geometry quality is chosen once for the device; sustained slow frames lower resolution without rebuilding worlds or removing effects. Desktop DPR is capped at 1.75 and coarse-pointer/lower-capability devices at 1.25, with additional full-canvas budgets of 2.8 and 1.8 million pixels. Resolution can decrease toward 0.75 DPR (or the pixel-budget ceiling if lower) in a few large steps and does not step back up, because each change reallocates the drawing buffer. Initial compilation and hidden-tab gaps are excluded from sampling. At the lowest resolution, the cursor trail (the one optional full-screen pass) is dropped as an experiment. If frames recover without it, it stays off and is retried after 8 seconds, with the wait doubling up to 2 minutes. If they do not recover (for example under a browser's 30 fps battery-saving cap, or load elsewhere), it returns within about 1.5 seconds and is not suspected again for 1 minute, doubling up to 10 minutes. Earlier builds dropped it permanently, so the trail could vanish for the rest of a visit.

The renderer batches layout measurements before scene updates and reuses them across worlds. Stationary scenes do not rescan page layout. Nearby scene modules preload; only two visible worlds mount. Tunnel and Orbit motion run in vertex shaders, removing up to 5,760 animated CPU vertices and their buffer uploads per frame. Instancing reduces MyGym from 58 drawing operations to 8 and FirstDropAI's 24 dots to one. Shared transition shapes and posture targets reuse memory; playground hit targets move with CSS transforms. Geometry and materials are disposed as scenes unmount. No external environment maps, videos, stock models, analytics scripts, or live AI calls are required.

`tests/render-budget.test.mjs` exercises resolution limits, sustained load, slow recovery, high-refresh timing, and idle gaps. Development builds expose a 90-frame average on the canvas as `data-frame-ms` for local inspection; this is not a field-performance metric or a promise of a fixed frame rate on every device.

Posters remain available when JavaScript is absent, motion is reduced, WebGL is unavailable, or the context fails. The system reduced-motion preference always wins. The footer's Motion setting can reduce motion further, persists locally, and removes the canvas entirely. All substantive content and navigation remain in server HTML. Mobile navigation uses a native modal dialog with Escape and focus restoration; a noscript navigation is included. The graphics layer never receives pointer events. Focus rings, skip navigation, native links/buttons, semantic headings, and live control descriptions are present.

## Routes

`/`, `/work`, `/work/mygym`, `/work/vanicert`, `/work/firstdrop-ai`, `/work/bhashabuddy`, `/work/posture-engine`.

Also: `/robots.txt`, `/sitemap.xml`, `/opengraph-image`, per-project `/opengraph-image` endpoints, favicon, error and 404 views.

## Résumé and content updates

When the real résumé PDF is ready, place it under `public/` and set `profile.resume` to its actual root-relative PDF path; the navigation then exposes Resume ↗. The test suite verifies that any configured PDF exists. Until then the link is omitted, and the site can be deployed without it.

No code or configuration here connects to the old portfolio repository. Product screenshots can be added later if desired, but no screenshots or performance metrics have been fabricated to fill gaps.

## Deploy on Vercel

1. Open [Vercel New Project](https://vercel.com/new), connect your GitHub account if needed, and import **BaconKage/Personal_Portfolio_Professional**. Select the **main** branch. Do not import the old `Personal_Portfolio` repository.
2. Use the settings below, then click **Deploy**. Next.js is supported directly by Vercel; no custom routing file, static export, database, API keys, or paid integrations are needed. [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs).

| Setting | Value |
| --- | --- |
| Root directory | Repository root (`.`) |
| Framework preset | Next.js |
| Node.js | 22.x (pinned in `package.json`) |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | Leave the Next.js default; do not override |
| Required environment variables | None for the initial Vercel deployment |

The Node.js version is pinned to the tested major version so Vercel does not select a newer major from an open-ended range. [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

3. For the initial deployment, the app uses Vercel's automatically provided `VERCEL_PROJECT_PRODUCTION_URL` for canonical URLs, sitemap, and social images. Keep **Automatically expose System Environment Variables** enabled (Vercel's default). Preview deployments and local builds emit noindex/nofollow.
4. If you add a custom domain, set `NEXT_PUBLIC_SITE_URL` to its HTTPS origin without a trailing slash in Production and Preview, then redeploy. Example: `https://your-domain.com`. Add the domain in Vercel's project settings and follow its DNS instructions. Do not set this variable to localhost or a placeholder.
5. On the deployed URL, check the homepage, work index, all five case studies, contact/social links, mobile navigation, and reduced motion. Confirm `/robots.txt`, `/sitemap.xml`, and `/opengraph-image` work, and that canonical URLs use your production origin. Add the résumé whenever the real PDF is available.

Vercel's first import is a production deployment. Subsequent pushes to `main` normally redeploy production; other branches produce previews. [Vercel environments](https://vercel.com/docs/deployments/environments).

## Validation scope and limitations

See `QA.md` for the performed visual and technical checks. Browser viewport emulation does not replace testing on a physical iPhone/Android device and Safari. No Lighthouse score, field Core Web Vitals, clinical accuracy, or product usage metrics are claimed. GPU context-failure recovery is implemented but was not induced on the user's graphics device. The repository is prepared for owner-managed Vercel deployment; the first hosted build and final domain still need verification on Vercel.



## Core interaction and additional section motion

The homepage plays a 3.2-second core ignition on initial entry and every refresh. A successful render of the hero world starts the sequence: a luminous leading edge traces the knot, its metallic surface arrives, and its framing settles as the name and headline enter. The same mesh remains interactive afterward. A shared duration drives the shader and proportionally timed CSS reveals; the light edge fades gradually and pointer response eases in with the scene. A refresh returns to the hero, while returning through client-side navigation skips automatic replay. The small Replay intro control allows an explicit repeat. Skip, Escape, scrolling away, a hidden tab, and reduced motion release the sequence. Graphics readiness has a 2.5-second maximum wait, after which the static hero remains available. No document scroll lock, simulated percentage, extra canvas, video, or asset download is introduced.

The hero uses a shader-modified Three.js material with travelling emissive threads and gentle surface deformation. Dragging the sculpture turns it with damped motion; arrow keys provide the same control. Clicking the sculpture, pressing Enter/Space, or choosing Energise the core builds a strong blue pathway glow over 2.2 seconds. The sculpture then disperses into a full-hero star field over 2.8 seconds. Those particles are sampled from the actual knot geometry and expand along curved paths, with depth, gentle twinkle, and damped pointer parallax. The stars remain until Reform the core is selected; reconstruction takes 3.2 seconds and blends the returning particles into the original surface. A shared state machine prevents overlapping activations, preserves the phase when the scene goes offscreen, and resets on intro replay, route exit, reduced motion, or graphics failure. The effect adds one points draw call and one soft glow plane to the existing canvas, with 1,100 or 2,600 stars according to the quality tier and no extra assets or postprocessing dependencies.

A transparent semantic DOM surface handles interaction while the canvas remains pointer-transparent. Vertical touch scrolling is preserved. The action button stays in place through all phases, announces progress to assistive technology, and remains focusable while busy. CSS sculptural rings remain visible before graphics load and under reduced motion; inactive graphics controls are hidden. About uses scroll-linked word emphasis, the research symbol rotates gently with scrolling, experience entries arrive in a stagger, and the desktop contact panel expands into view. Reduced motion restores static text and artwork and disables CSS letter/menu animation. Smaller labels and supporting text have been enlarged for readability.

Project cards use a shared zoom transition before entering a case study. Homepage cards capture the live WebGL frame; index cards use their local artwork. Other internal navigation keeps the curtain transition. The zoom is disabled under reduced motion.

## Project playground

The interactive project playground at `/#playground` sits after Experience, followed by the original tunnel and then Contact. Five original sculptures represent MyGym's modules, VaniCert's waveform, FirstDropAI's paired forms, BhashaBuddy's script ring, and Posture Engine's articulated figure. It lazy-loads into the existing shared canvas and reuses the local glyph textures and project posters. No physics dependency, additional canvas, or remote asset is needed.

Mouse and pen users can drag and throw the sculptures. A 120 Hz fixed-step planar simulation uses circular collision proxies, bounded velocity, damping, and angular impulses to drive the 3D objects. Assemble returns them to a deliberate formation. Selecting an object lifts it forward and reveals its source-backed project description and Explore project link; the link extends the existing captured-frame zoom transition. The objects also have semantic project buttons, keyboard selection, arrow-key impulses, and Escape to assemble. Touch uses tap-to-select while preserving vertical scrolling and pinch zoom.

Projected DOM buttons follow the scene camera without per-frame React updates. Pointer capture is released on cancellation, resize, blur, tab hiding, scene unmount, and graphics failure. Offscreen scenes unmount under the existing renderer policy and return in their starting formation. Reduced motion and WebGL failure expose five static artwork links; the same links work without JavaScript. Kinetic type bands between Selected Work and About remain driven only by scrolling.

Physics tests cover momentum transfer, stage containment, throw limits, cancellation, assembly at desktop and mobile sizes, frame-rate consistency, resizing, and long pauses. Inspiration: [Lusion's playful physical interactions](https://v2.lusion.co/work/maxmara-bearing-gifts/); all project sculptures here are original.

## Spatial passage

The original SignalJourney remains between the playground and Contact. It uses the shared canvas for a scroll-through particle tunnel and a selectable orbit formation. PortalWorld lazy-loads with two draw calls (points and line segments) and follows existing quality tiers. The scroll-linked title sequence, progress line, Tunnel/Orbit controls, contact shortcut, and static CSS spiral are preserved. Reduced motion collapses the passage to one viewport and hides its visual mode controls.

## Command palette and live details

Press ⌘K (Ctrl+K elsewhere) on any page, or use the key chip in the header or the floating pill, to open a keyboard-first command palette. It jumps to sections, the work index and each case study; copies the email address; energises the core or replays the intro on the homepage; toggles reduced motion (kept in sync with the footer setting); and opens the paper, GitHub, LinkedIn and this repository. Selections go through the site's existing link handling, so in-page jumps glide and route changes keep their curtain and zoom transitions. Search matches labels, project descriptors, categories and stack keywords; for example, "audio" finds VaniCert. The palette is a native modal dialog with a combobox and listbox, arrow/Home/End navigation, Escape and backdrop dismissal, and a polite live region for results such as "Copied". It never opens over the site menu, and it is hidden on touch-first screens, where the menu covers the same ground.

The hero location now shows the current time in Bengaluru (IST) beside a pulsing live dot once the client runs; server HTML keeps the static "Bengaluru, India" label. Opening DevTools prints a short note for engineers explaining the rendering approach, with the repository and contact links.

## Talk to the core

The hero's "Talk to the core" button (also in the ⌘K palette) opens the microphone and drives the reactor with the visitor's voice. The ten acrylic blocks act as a circular spectrum: each follows one log-spaced band from 80 Hz to 8 kHz. Loudness lifts the glow and the light, spectral flux spins the HUD rings, and holding a note for about 1.4 seconds draws sparks inward and energises the core from standby. Once the core is online, the voice keeps colouring the coils. A HUD under the headline shows live voice activity, pitch, spectral centroid, flux and the charge meter.

`lib/voice-analysis.ts` holds the signal processing as pure functions: RMS loudness above an adaptive noise floor that never absorbs a held note, McLeod normalised-square-difference pitch detection on a frame decimated to about 16 kHz (about 0.5 ms per frame in local Node timing), banded spectrum with a gentle high-frequency tilt, centroid and flux. `lib/voice.ts` connects the microphone to a Web Audio `AnalyserNode` that is never routed to the speakers or a recorder, so audio never leaves the device. The scene and HUD read the features directly each frame, with no per-frame React state. These are illustrative signal readings, not VaniCert's model or an authenticity verdict.

The microphone closes when the hero leaves the viewport, the tab is hidden, the route changes, motion is reduced or graphics fail. Blocked, missing and failed microphones get a visible message, and the button exposes `aria-pressed` with a polite status announcement. The control is hidden when the browser lacks `getUserMedia`/Web Audio and under reduced motion. `tests/voice-analysis.test.mjs` covers band layout, pitch accuracy and octave robustness, noise rejection, silence, charge and drain timing, noise-floor adaptation and spectral flux. Browser checks used Chromium's fake capture device with a synthesised vowel; a physical microphone and Safari/Firefox were not tested here.

## Ask the core

Visitors can ask questions about Shubhang's work and get short answers written by Claude from the site's own content. In the ⌘K palette, any question becomes "Ask the core" (listed first when the text reads as a question). An inline panel under Contact offers the same thing on every screen size. Answers stream in, link to the case studies they mention, and support follow-up questions. A note tells visitors that answers can be wrong and that their questions are sent to Anthropic. Unlike the voice feature, this one does leave the device.

**It is off until you add a key, so a deployment without one spends nothing.** Without `ANTHROPIC_API_KEY`, no Ask UI is rendered and `/api/ask` returns 503. To switch it on:

1. Create an API key in the Anthropic Console and **set a monthly spend limit** on its workspace. That limit is the real cost ceiling.
2. In Vercel → Project → Settings → Environment Variables, add `ANTHROPIC_API_KEY` for Production (and Preview if you want it there).
3. Redeploy. Pages are prerendered, so the on/off flag is read at build time.

Optional: `ASK_MODEL` chooses the model. It defaults to `claude-opus-5-5`. `claude-haiku-5-5` costs roughly a fortieth as much per token, but its refusals have no automatic fallback. By rough estimate, each answer on Opus 5.5 costs about half a cent with a warm prompt cache, and a few cents for the first question after five quiet minutes, when the cache is rewritten.

**How it works.** `lib/ask-knowledge.ts` builds about 4,000 tokens of instructions and site content from `data/profile.ts` and `data/projects.ts` (the same data the pages render), plus the editorial boundaries from `CONTENT-SOURCES.md`. The prompt is identical on every request, so it is cached. The core answers in two to four sentences, in the third person, keeps the site's attribution and claim limits, says when the site doesn't cover something, and declines unrelated tasks. `app/api/ask/route.ts` streams newline-delimited JSON from the Anthropic SDK with low effort, a 1,500-token output cap, and server-side refusal fallback (`fallbacks: "default"`) on models that support it. When a fallback replaces a declined partial answer, the page discards the partial.

**Guards** (`lib/ask-guard.ts`): same-origin requests only; questions up to 400 characters; history limited to the last three exchanges, which must alternate and end on an answer; and a per-visitor limit of 6 questions a minute and 60 a day. The limit is kept in memory per server instance, so it is a brake rather than an exact quota; the spend limit is the hard cap. Refused or failed questions never become history. Closing the palette, or leaving the page mid-answer, cancels generation upstream.

**Tests.** `tests/ask.test.mjs` covers validation, rate limiting, the origin check, the knowledge base built from the real data files (complete, stable, no missing fields), and project linking. Browser checks ran against a local stand-in for the Messages API streaming protocol (no real key or calls). They covered streaming, follow-up history, refusal, fallback replacement, upstream errors, cancellation, the rate limit, the inline mobile layout, and the keyless build rendering no Ask UI. Real model answers have not been reviewed yet. Try a few questions on a preview deployment once a key is set.

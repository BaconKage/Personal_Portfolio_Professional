# Shubhang Srinivas Varda — Portfolio: Project Guide

A complete reference for this repository: what it is, how it is built, where
everything lives, and a record of the Lusion-inspired redesign (September 2026).

- **Repository:** [BaconKage/Personal_Portfolio_Professional](https://github.com/BaconKage/Personal_Portfolio_Professional)
- **Live site:** https://personal-portfolio-professional-gamma.vercel.app
- **Inspiration:** [lusion.co](https://lusion.co), used as a reference for motion and interaction and not copied.

---

## Contents

1. [Overview](#1-overview)
2. [Tech stack](#2-tech-stack)
3. [Running the project](#3-running-the-project)
4. [Routes and page structure](#4-routes-and-page-structure)
5. [Directory map](#5-directory-map)
6. [How it works](#6-how-it-works)
7. [Redesign changelog](#7-redesign-changelog)
8. [Bugs found and fixed](#8-bugs-found-and-fixed)
9. [Tuning guide](#9-tuning-guide)
10. [Testing and verification](#10-testing-and-verification)
11. [Deployment](#11-deployment)
12. [Known limitations and follow-ups](#12-known-limitations-and-follow-ups)

---

## 1. Overview

An immersive personal portfolio for a full-stack and applied-AI engineer. All
substantive content (projects, experience, research, contact) is server-rendered
HTML. A single WebGL canvas adds a 3D "world" per section on top of that.
Everything still works without JavaScript, without WebGL, or with reduced
motion.

**Signature experiences**

| Where | What happens |
| --- | --- |
| First load | A preloader draws a glowing blueprint of an arc reactor as the page loads (000 → 100). |
| Hero intro | The real 3D arc reactor assembles itself piece by piece. |
| Hero | Click **Energise the core**: coils light in sequence, sparks spiral in, the core flickers and fires, and the hero floods with cyan light. Click again to power down. "SV" glows in the core. |
| Everywhere | Inertial smooth scrolling, and a fluid mouse trail that smears the 3D scenes. |
| Project cards | Each card unfurls into place as a bending sheet. Hover leans the image toward the cursor with 3D parallax. Click zooms the page into the card, then opens the case study. |
| Navigation | Floating pills, a full-screen menu, and rolling-letter hovers. |
| Page end | A "keep scrolling" runway leads to the next page. |

**Projects featured:** MyGym (full-stack platform), VaniCert (applied AI · audio),
FirstDropAI (conversational AI), BhashaBuddy (language learning), Posture Engine
(computer vision).

---

## 2. Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js **16.3.4** (App Router), React **19.2.4**, strict TypeScript |
| 3D | three **0.182**, @react-three/fiber **9.5**, @react-three/drei **10.7** |
| Motion | GSAP **3.14** (ScrollTrigger, SplitText), @gsap/react |
| Smooth scroll | **Lenis 1.3** (added in the redesign) |
| Styling | Plain CSS: `app/globals.css` plus `styles/*.css`. No Tailwind. |
| Fonts | Geist and Geist Mono via `next/font` |
| Tests | Node's built-in test runner (`node --test`) |
| Runtime | Node **22.x** (pinned in `package.json`) |
| Hosting | Vercel, deploying from `main` |

> **Note:** this Next.js version differs from older releases. Read the guides in
> `node_modules/next/dist/docs/` before changing framework-level code (see
> `AGENTS.md`).

---

## 3. Running the project

```bash
npm ci
npm run dev          # http://localhost:3000 (output: .next-dev)
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (output: `.next`) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (includes the React Compiler hooks rules) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Content, core-sequence, playground-physics and render-budget tests |
| `node scripts/check-routes.mjs` | Smoke-tests routes on a running production server (port 3001 by default; override with `CHECK_ORIGIN`) |

Development and production use different output folders, so a production build
never overwrites a running development bundle.

---

## 4. Routes and page structure

| Route | Contents |
| --- | --- |
| `/` | Home |
| `/work` | Work index (all five projects) |
| `/work/[slug]` | Case studies: `mygym`, `vanicert`, `firstdrop-ai`, `bhashabuddy`, `posture-engine` |
| `/robots.txt`, `/sitemap.xml`, `/opengraph-image`, `/work/[slug]/opengraph-image` | SEO and social |
| `error.tsx`, `not-found.tsx` | Error and 404 views |

**Home, top to bottom**

1. **Preloader** (first visit): blueprint reactor, counter, skip.
2. **Hero:** name, headline, arc reactor (WebGL), *Energise the core* control, social links, intro controls.
3. **Selected work:** four project cards (MyGym, VaniCert, FirstDropAI, BhashaBuddy) rendered as landing sheets.
4. **About:** discipline band, bio with scroll-coloured reading text.
5. **Research:** peer-reviewed paper (AI & Society, Springer Nature).
6. **Experience:** roles and recognitions.
7. **Playground:** five draggable, throwable 3D sculptures, one per project.
8. **Signal journey:** pinned portal scene.
9. **Contact and footer.**
10. **Next-page runway:** keep scrolling to reach `/work`.

**Case study pages:** breadcrumb, intro, WebGL case visual with step controls,
overview, context, system diagram, contribution, result, a next-project card,
footer, and a runway to the next project.

---

## 5. Directory map

### `app/`
| File | Role |
| --- | --- |
| `layout.tsx` | Fonts, navigation, JSON-LD, metadata defaults, global styles, `<Motion/>` |
| `page.tsx` | Home page composition (sections listed above) |
| `work/page.tsx` | Work index |
| `work/[slug]/page.tsx` | Case study template (static params for all five projects) |
| `globals.css` | Tokens (`--paper`, `--ink`, `--blue`, `--gutter`), base layout, sections |
| `opengraph-image.tsx`, `work/[slug]/opengraph-image.tsx` | Generated social images |
| `sitemap.ts`, `robots.ts`, `icon.svg`, `error.tsx`, `not-found.tsx` | Site plumbing |

### `components/` (DOM)
| File | Role |
| --- | --- |
| `Motion.tsx` | Resolves motion preference, then mounts SmoothScroll, Graphics, Cursor, RouteTransition and the choreography |
| `SmoothScroll.tsx` | *(new)* Lenis on the GSAP ticker; smooth in-page anchors; resync on route change |
| `choreography.ts` | All GSAP ScrollTrigger work: hero exit, card text reveals, SplitText line reveals, magnetic buttons, runway, progress bar |
| `Navigation.tsx` | *(rebuilt)* Header, floating pills, full-screen menu dialog |
| `RollingText.tsx` | *(new)* Rolling-letter hover primitive |
| `KineticText.tsx` | Letter-by-letter project titles (scroll reveal and hover roll) |
| `Cursor.tsx` | *(new)* Context label ("View ↗" / "Drag") that follows the native cursor |
| `Preloader.tsx` | *(new)* Blueprint reactor SVG, counter, skip button |
| `CoreIgnition.tsx` | First-visit intro: drives the preloader's progress and the hero ignition timeline |
| `NeuralPrompt.tsx` | *Energise the core / Power down* button and live status text |
| `CoreInteraction.tsx` | Drag and keyboard surface over the reactor (turn, click to energise) |
| `RouteTransition.tsx` | Curtain transition, and the zoom-into-card transition for project links |
| `NextPage.tsx` | *(new)* End-of-page "keep scrolling" runway |
| `ProjectPlayground.tsx` | Playground DOM: hit targets, detail panel, accessibility |
| `SignalJourney.tsx`, `SceneControls.tsx`, `SystemDiagram.tsx`, `ReadingText.tsx`, `SocialLinks.tsx`, `Footer.tsx` | Section components |
| `Artwork.tsx`, `VectorArtwork.tsx` | Static poster fallbacks (`public/art/*.webp`) and their vector source |

### `components/canvas/` (WebGL)
| File | Role |
| --- | --- |
| `Graphics.tsx` | The single shared canvas and renderer loop: slots, clock, layout, sheets, screen paint, hover, zoom, render budget |
| `HeroWorld.tsx` | *(rebuilt)* Arc reactor: geometry, materials, energise sequence, 3D assembly intro, "SV" monogram |
| `ProjectSheet.ts` | *(new)* Bending-sheet renderer for home project cards |
| `ScreenPaint.ts` | *(new)* Fluid cursor trail and distortion post pass |
| `MyGymWorld`, `VoiceWorld`, `ConversationWorld`, `LanguageWorld`, `PostureWorld` | Project worlds |
| `PlaygroundWorld.tsx` | Playground sculptures and physics-driven motion |
| `PortalWorld.tsx`, `PortalGeometry.ts` | Signal-journey tunnel |
| `TransitionField.ts` | Shared point field bridging adjacent project cards |
| `types.ts` | `SceneProps` shared by every world (now includes `active`) |

### `lib/`
| File | Role |
| --- | --- |
| `core-sequence.ts` | *(rewritten)* Reactor power states: idle → charging → online → cooling |
| `render-budget.ts` | Device profile (DPR caps, pixel budgets) and the adaptive resolution policy |
| `scroll.ts` | *(new)* Scroll owner: Lenis handle, named scroll locks, `scrollToTarget` |
| `zoom.ts` | *(new)* Shared state for the zoom-into-card transition |
| `playground-physics.ts`, `playground-input.ts` | Playground simulation and input events |
| `motion.ts` | `CORE_IGNITION_MS` (3200 ms intro) |
| `site.ts` | Site URL and indexability from environment |

### `styles/`
| File | Role |
| --- | --- |
| `motion.css` | *(new)* Rolling text, cursor label, pills, menu, preloader and blueprint, runway, reactor text glow, card hover |
| `refinements.css` | Hero, ignition states, kinetic text, CSS reactor fallback, misc |
| `graphics.css` | Canvas layer, poster hiding, sheet hand-off |
| `projects.css`, `playground.css` | Work pages and playground |

### Other
`data/profile.ts`, `data/projects.ts` (all copy and case-study content) ·
`tests/*.test.mjs` · `scripts/check-routes.mjs`, `scripts/generate-posters.cjs` ·
`public/art/` (posters, glyph textures) · `CONTENT-SOURCES.md` (attribution
decisions) · `QA.md` · `README.md` · `AGENTS.md`.

---

## 6. How it works

### 6.1 One canvas, many worlds
`Graphics.tsx` owns one fixed, full-screen, transparent canvas. Every element
with a `data-scene` attribute gets its own `THREE.Scene` and camera (a "slot").
Each frame, the renderer:

1. **Measures:** reads each slot's DOM rect after scroll and GSAP have written, but only while something is moving. It picks up to two visible slots as *active*.
2. **Mounts:** worlds within 1.25 viewports of the screen load and stay mounted. The rest mount ahead of time, one per idle moment, never during the intro or while the reader scrolls, so no mount lands mid-scroll. Their shaders compile in a separate task in the background (project cards compile the variants they use inside their sheet) and the poster covers the wait. Off-screen worlds pause through an `active` flag instead of unmounting.
3. **Renders:** each active slot draws into its own DOM rect using viewport and scissor. Home project cards draw as sheets instead (6.4).
4. **Post-processes:** if the mouse has moved recently, the screen-paint distortion runs over the whole frame (6.5).

### 6.2 One clock
Lenis (smooth scroll), GSAP/ScrollTrigger and the R3F renderer
(`frameloop="never"`) all run on `gsap.ticker`, in that order, every frame. So
the scroll position, DOM animation and WebGL never drift apart. When nothing is
visible or moving, the renderer skips its work entirely. Scroll locks (menu,
preloader, route transition) are named, so they can overlap safely
(`lib/scroll.ts`). `scrollbar-gutter: stable` prevents layout shift when scroll
is locked.

### 6.3 Resolution budget
`lib/render-budget.ts` starts from the device: it reads the GPU's name once and
classes it as software (SwiftShader, llvmpipe), low (older Intel HD/UHD, entry
Mali/Adreno, PowerVR) or standard. It caps device pixel ratio (1.75 on desktop,
1.25 on low-end GPUs and lower-capability devices, 0.75 for software rendering)
plus a total pixel budget, and sets MSAA to match (the software tier renders
without it, and low-end GPUs use 2× for project sheets instead of 4×).

If frames stay slow (below about 50 fps, with a fifth of them late), resolution
**only steps down**: at most about two steps, each followed by a cooldown, and
it never recovers. Every change reallocates the drawing buffer, which is a
visible hitch. Resize changes are debounced, and world mounts reset the
measurement so a one-off cost is never read as sustained load. If frames are
still slow at the lowest resolution, the mouse trail (the one optional
full-screen pass) switches off.

### 6.4 Project sheets (landing, hover, zoom)
Modelled on Lusion's reel panel (`ProjectSheet.ts`).

- **Landing.** The card's world renders into a multisampled render target. A 32×32 plane carries it from a smaller "from" rectangle into the card's DOM rectangle. Each vertex lands on its own schedule, which bends the edges; the sheet twists slightly, and blooms from brand blue into full colour.
  - The shader draws the card's background itself (including MyGym's radial gradient), so the DOM card becomes transparent.
  - Progress follows scroll but is **time-smoothed**, and never lands faster than `LANDING_SECONDS` (1.4 s). A fast scroll still plays the whole animation.
  - Card copy reveals only when the sheet has actually landed (the `data-landed` attribute).
  - If a card's 3D finishes loading while the card is already on screen, it takes over from the poster in place, with no flash.
- **Hover.** The image zooms slightly toward the cursor inside a thin frame of the card's background. The world camera slides with the mouse for real depth parallax, and the title letters roll.
- **Click (zoom into the card).** The whole projects section scales around the chosen card until it overfills the screen by 20%, with a cubic ease over 1.15 s. The card's own camera pushes in for a "dive", and its text fades. The final frame is frozen, the case study loads underneath, and the frozen frame fades away.

### 6.5 Mouse trail (screen paint)
Ported from Lusion's technique (`ScreenPaint.ts`).

- **The trail.** The pointer paints a line segment into a quarter-resolution, half-float texture. Faster movement paints a wider stroke. Each texel stores velocity and two fading weights.
- **The swirl.** Each frame the paint is carried along its own velocity and a blurred low-resolution copy, swirled by curl noise, and dissipated.
- **Distortion pass.** The rendered frame is copied, then redrawn smeared along the paint's velocity (9 taps) with a thin iridescent fringe.
- **Cost.** Mouse only. It runs only for about 3.5 s after movement, and does no work at rest.

### 6.6 The arc reactor (hero)
`HeroWorld.tsx`, modelled on a real arc reactor replica photo.

- **Housing.** An open drum: outer shell, front face ring, a tapered tunnel wall and a back plate.
- **Outer ring.** Ten copper coils (wound-wire texture with bump) alternate with ten acrylic blocks. The acrylic is a lit inner block inside a glossy transparent shell. Coils sit in clamp bars with four ball bolts each, and black wire rings link the bolts.
- **Inner ring.** A gunmetal ring, extruded with 30 pill-shaped slots and lit from behind, plus three ridged clamp brackets with screws.
- **Centre.** Five stepped glow rings recede to a meshed emitter. A dark bezel sits in front. The **"SV" monogram** is drawn in the site's wordmark font, with a dark keyline so it stays legible when the core is white-hot.
- **Lighting.** A studio environment map (RoomEnvironment) for reflections, an internal point light, a core halo, slow light rays, a hero-wide light wash, and HUD tick rings.
- **Power sequence** (`lib/core-sequence.ts`):

  | Phase | Duration | What happens |
  | --- | --- | --- |
  | idle | — | Faint breathing standby glow |
  | charging | 2.6 s | Acrylic blocks light in order, sparks spiral inward, HUD rings spin up, output flickers near the end |
  | online | until clicked | Ignition flash and shockwave, then a sustained glow: current circles the coils, rays turn, and the hero's headline takes on a neon glow (CSS on `data-core-phase`) |
  | cooling | 1.8 s | Everything dims back to standby |

  Phase endpoints are continuous, so there are no visual snaps at timer handoffs (tested).
- **Controls.** Click or tap the reactor, press Enter or Space, or use the *Energise / Power down* button. Drag or use the arrow keys to turn it.

### 6.7 Preloader and intro
`Preloader.tsx` + `CoreIgnition.tsx`.

- **Blueprint.** On first visit, a blueprint of the reactor draws itself as real loading progress rises: fonts, renderer, and a compiled hero. The progress drives a `--p` custom property, and each SVG part traces in over its own slice.
  - Order: crosshairs and ticks → housing → 20 segments around the ring → slotted ring and brackets → tunnel rings → bezel → "SV".
  - The counter never runs faster than about 1.3 s from empty to full, so the drawing is always visible.
- **Hand-off.** At 100 the drawing flares and the curtain lifts.
- **3D assembly.** During the 3.2 s intro, the real reactor builds itself: the drum rises, coils fly in radially and turn into place, clamps drop in, acrylic slides in from the front, bolts pop in, the slotted ring twists into its seat, the tunnel stacks in, the bezel seats, and "SV" powers on.
- **Skip and replay.** There is a skip button, Escape, and a replay button in the hero. Hidden tabs and reduced motion bypass the intro.

### 6.8 Navigation and page motion
- **Header.** The wordmark, inline links, and *Let's talk* / *Menu* pills. Once scrolled past, a floating pill pair stays in reach.
- **Menu.** Full-screen, grows out of the pill that opened it, and locks scroll. Links show index numbers and roll their letters on hover. Email, socials and Bengaluru time sit at the bottom. It keeps native dialog focus handling and Escape.
- **Text.** Headings and short copy reveal line by line with SplitText masks. Rolling-letter hovers are used across links and buttons.
- **Cursor.** The native cursor stays, with a small context label ("View ↗" over cards, "Drag" over the reactor and playground).
- **Runway.** A sticky "keep scrolling" section with a progress ring ends each page. It follows its link only after you actually scroll into it, and it is also an ordinary link.
- **Transitions.** Curtain for general routes, and the zoom-into-card transition for projects.

### 6.9 Accessibility and fallbacks
- All content and navigation are in server HTML, with a no-script navigation.
- **Reduced motion** (system setting, or the footer's *Motion* setting) removes Lenis, the canvas, the cursor, the preloader, the SplitText reveals and the runway behaviour. It shows posters and a static CSS reactor instead.
- WebGL failure or context loss clears the sheet and ready states, so the DOM cards and posters return.
- Dialogs use native focus management. The reactor surface and runway are keyboard reachable, and live regions describe the reactor's state.

---

## 7. Redesign changelog

The work is in commit `76a7eec` ("Lusion-inspired motion pass and arc reactor
hero") on `main`. Listed in the order it was requested.

### 7.1 Analysis against lusion.co
Compared the live portfolio with lusion.co. **Why the portfolio felt less
smooth:**
- The fixed canvas trailed native scroll by a frame.
- Changes to the adaptive resolution caused buffer-reallocation hitches.
- Worlds unmounted and recompiled their shaders when revisited.
- Small per-frame costs added up: a 16-circle SVG cursor, per-frame DOM writes, and scrubbed border radii.

**Lusion signatures to borrow:** a real preloader, a pill header with a full-screen menu, rolling-letter hovers, line reveals, a context cursor, and a "keep scrolling" page ending.

### 7.2 Phase 1: one clock
- Added **Lenis**. `lib/scroll.ts` and `components/SmoothScroll.tsx` put Lenis, ScrollTrigger and the renderer on `gsap.ticker`.
- The renderer switched to `frameloop="never"`, driven by the ticker. An idle frame skips all WebGL work.
- Removed CSS `scroll-behavior: smooth` (and Next's `data-scroll-behavior`). In-page anchors glide through Lenis, with focus management.
- Scroll locks are shared by the menu, the preloader and route transitions.

### 7.3 Phase 2: removing hitches
- **Resolution** is downgrade-only, in large steps, with cooldowns. Resizes are debounced.
- **Worlds** stay mounted once loaded and pause through `active` when off-screen. Shaders compile before first use.
- **Playground** writes its hit-target transforms only when they change.
- **Magnetic buttons** measure once per hover, not on every pointer move.
- **Cursor:** the 16-circle SVG trail was replaced.

### 7.4 Phase 3: Lusion-feel pieces
- **Preloader:** the first version was a counter and progress bar tracking real readiness.
- **Header and menu:** the pill header, floating pills and full-screen menu.
- **Text and cursor:** the `RollingText` primitive, SplitText line reveals, and the context cursor.
- **Runway:** the end-of-page `NextPage` runway, home → `/work` and case study → next project.

### 7.5 Mouse effect → Lusion's screen paint
The custom dot-and-ring cursor was replaced with Lusion's actual approach: the
native cursor plus a WebGL fluid trail that distorts the rendered frame
(`ScreenPaint.ts`). Settings match Lusion's (dissipation, curl noise, push
strength, distortion amount and fringe).

### 7.6 Project cards land like Lusion's reel
Added `ProjectSheet.ts`: the bending, blue-tinted sheet that unfurls into each
home project card. Card copy is retimed to reveal after landing. Also fixed a
pre-existing 13 px horizontal scroll on desktop (see §8).

### 7.7 Longer landing for fast scrolls
Landing progress became time-smoothed, with a minimum duration of 1.4 s. Copy
waits for the sheet's own `data-landed` signal. A late-loading world takes over
from the poster without flashing.

### 7.8 BhashaBuddy colour
The home card changed from light (#e2e9e2) to a deep green gradient, so its
landing reads as strongly as the others. Its text and hover colours were
updated, and its glyphs and orbit rings brightened on the dark card only. The
case study keeps its light palette.

### 7.9 Zoom into the card on click
Ported Lusion's featured-work click: the section scales around the chosen card
(`lib/zoom.ts`, `RouteTransition.tsx`), the card's camera dives, and the frame
freezes as the route changes. Added `scrollbar-gutter: stable`.

### 7.10 Card hover and the first arc reactor
- **Hover:** zoom toward the cursor, a background-coloured frame, camera parallax, and the title roll.
- **Hero:** the torus knot and star-field explosion were replaced by an arc-reactor core and the idle → charging → online → cooling sequence. That meant rewriting `lib/core-sequence.ts` and its tests, updating the button and aria labels, adding the neon headline glow, and adding a CSS reactor fallback. `CoreStars.ts` was removed.

### 7.11 Realistic arc reactor
Rebuilt from a reference photo:
- a thick drum,
- alternating copper coils and acrylic blocks with clamps, bolts and wires,
- a slotted gunmetal ring with brackets and a tunnel core,
- environment reflections,
- a three-quarter view that shows its depth.

### 7.12 "SV" monogram
Added the "SV" monogram in the core, in the wordmark font. It has a dark keyline
so it stays readable at full power, and it tracks the tunnel's depth when the
reactor turns.

### 7.13 Loading animation builds the reactor
- **Preloader:** now a self-drawing blueprint of the reactor.
- **Hero intro:** now a 3D assembly of the real reactor.

### 7.14 Performance pass (no effects removed)
Profiled a production build with frame timing, GPU timer queries, long-frame
attribution and Chrome traces. The WebGL itself costs 1 to 6 ms of GPU time per
frame. The stutters came from main-thread stalls and repaints:

| Problem | Fix |
| --- | --- |
| 50 to 200 ms freezes on the first scroll past each project card | Cards render into a texture, which needs different shader variants from on-screen rendering. Each card now compiles those variants (and the sheet shader) in the background. |
| Freeze on the first mouse move | The four screen-paint passes and the bridge field compile when they are created. Production skips reading shader logs, which waits for the driver. |
| Frames dropped while energising; the budget then lowered resolution for the rest of the visit | The headline's neon glow was a transitioning `text-shadow` (blurs up to 110 px) that re-rasterised every frame. The shadows now live on pre-rasterised copies of each line and cross-fade with opacity. |
| A world's first mount could stall a scroll | Remaining worlds mount while idle; shader compilation runs in its own task. |
| Scroll-scrubbed text repainted every frame | The headline, hero art, card titles, bands, signal copy and progress bar have their own layers. |
| 47 permanent per-letter layers | Removed; letters are promoted only while they animate. |
| Card radius scrub repainted a transparent card | Paused while the WebGL sheet paints the card; kept for the DOM fallback. |
| Idle hero drew invisible layers | The ray fan and sparks skip drawing while dark. |

Result on the test machine (AMD Radeon integrated, 1440×900 at 1.25×): 60 fps
with no frame over 17.4 ms in every scenario, and resolution never
downgrades. With 4× CPU throttling on an emulated phone, scrolling holds 58 to
60 fps at full resolution (previously a 150 ms freeze on first scroll).

---

### 7.15 Buttermax-style mouse effects
Modelled on buttermax.net's shaders (read from its compiled shader bundle):
- **Text changes colour under the mouse** (`components/TextLens.tsx`). A soft brush with a short trail (fades ×0.94 per frame) turns text an accent colour through a white edge, with a shifting rainbow rim. Buttermax draws text in WebGL; here the brush is painted into each text element's background and clipped to its glyphs, so the text stays real HTML. Stamps stay where they were painted and fade in place; only elements under the brush repaint, and only stamps that reach an element add layers to it. Mouse only; off with reduced motion.
- **The screen trail** keeps the Lusion velocity field but disturbs the frame the buttermax way: it warps along the flow, steps into wavy ~8 px pixel bands, and splits RGB. It reads 3 texels per pixel instead of 9, and its fading is frame-rate independent.

### 7.16 Responsiveness pass and scroll-reactive detail (November 2026)
Re-profiled the production build first (1920×1080 buffer, AMD Radeon
integrated, 60Hz): scrolling, flicks and mouse sweeps already held 60fps with
no long frames. What felt slow was lag by design, plus one budget bug.

- **Scroll-linked motion stays attached to the scroll.** Lenis already eases
  the scroll position; scrubs of 0.5 to 1s on top were a second lag, so
  parallax kept drifting for about a second after the page stopped. All
  scrubs share `SCRUB` (0.28s) and now settle about 0.2s after the scroll
  does. Lenis `lerp` went from 0.095 to 0.11.
- **A frame cap is no longer read as load.** Under a 30Hz cap (browser energy
  saver, battery modes, a throttled window) every frame is 33ms, so the
  budget lowered resolution twice and then switched off the mouse trail,
  none of which can win back a capped frame. The budget now learns the
  display's cadence from frames in which nothing was drawn
  (`calibrate()`), and judges load against that: never stricter than 60fps,
  never more lenient than 30Hz.
- **Sheets flex with scroll speed** (`ProjectSheet.ts`, `SHEET_BEND`). A
  landed card bows as it moves, its middle trailing its edges by up to
  26px, and its colour channels pull apart along the direction of travel;
  both ease back when the scroll stops. Driven by one uniform.
- **Labels decode** (`decodeLabel` in `choreography.ts`). Monospace section
  labels resolve left to right out of cycling glyphs as they arrive. Only
  text nodes are rewritten and they are restored afterwards.
- **Rules draw.** The hairlines above the personal line, experience rows,
  recognitions and contact footer draw across (`.rule-draw`).
- **Experience list holds focus.** The row under the pointer shifts and
  takes the accent colour while the others dim (CSS only).

After the pass, on the same machine: no frame over 17.4ms in any scenario.

### 7.17 Sound and the powered state (November 2026)
- **Sound** (`lib/sound.ts`, `components/SoundToggle.tsx`). Synthesised with
  Web Audio, so there are no audio files. It is **off until the reader turns
  it on** (header, floating pills and menu); the choice is remembered, and a
  remembered "on" waits for the first press or key, as browsers require.
  - The reactor is the instrument: charging winds a filtered hum up under a
    riser and stutters before it fires, ignition is a thump with a ringing
    open fifth, online is a low hum that recedes as the hero scrolls away,
    and cooling winds it down.
  - Hovers tick, presses knock, and the menu and page changes move air.
  - A limiter sits on the output. A hidden page suspends audio.
- **The powered state follows you** (`components/CoreAmbience.tsx`). The core
  no longer resets on leaving the home page: it stays on across pages until
  it is powered down, from the hero or from a **power pill** that joins the
  floating pills while it is on.
  - `<html data-power="on">` is set while charging and online. CSS eases the
    progress bar, pills, menu, footer, cursor label and status dots to the
    core's cyan, and the text brush takes the same colour (`--lens`).
  - The WebGL loop reads the core's output directly: the mouse trail glows
    cyan over light and dark (`ScreenPaint.ts`, `u_power`), and each project
    card carries a lit rim with two pulses circling it (`ProjectSheet.ts`).
  - The attribute changes only on the reader's click. Changing it at
    ignition too restyled the whole document (about 10ms) on the flash.

### 7.18 Dive, bloom, hold, dusk and the section rail (November 2026)
- **The dive** (`lib/dive.ts`, `choreography.ts`, `HeroWorld.tsx`,
  `html[data-dive]` in `styles/motion.css`). Scrolling out of the hero now
  flies through the reactor. On desktop the hero fills the viewport (it
  slides under the header) and holds still with CSS `position: sticky` for a
  runway of 120svh. Over that scroll its copy lifts away, the reactor slides
  to the centre and squares up, travels at the camera until the core's face
  fills the frame, and the core's light floods to the colour of the page
  below. Scrolling back runs it in reverse.
  - A sticky box is its own stacking context, so the hero sits above the
    canvas and is transparent; its gradient moved to `.hero-backdrop`
    beneath the canvas, and the flood is `.hero-flood` on top.
  - The reactor is scaled and lowered by the header's height so it sits
    exactly where it did in the shorter hero.
  - Diving lights the core by proximity whatever its power state. Once
    flooded, the hero scene draws nothing.
  - Mobile and reduced motion keep the plain hero.
- **Bloom** (`components/canvas/Bloom.ts`). While the core is lit, the
  frame's brightest parts are blurred at two sizes and added back over the
  hero. One framebuffer copy and five small passes; desktop only, skipped
  at rest and when the budget is saturated.
- **Hold to energise** (`lib/core-sequence.ts`, `CoreInteraction.tsx`). A
  click still runs the whole sequence. A still press of more than 180ms on
  the reactor charges it for as long as it is held: letting go early winds
  it back down from where it was (`releaseCore`), holding through fires it.
  The cursor label counts the charge. Mouse and pen only.
- **Dusk** (`choreography.ts`). With the playground 60% up the screen, the
  experience section and the page behind it turn dark with it, until
  contact covers the view. A toggle with a CSS ease, not a scrub: text
  colour cannot move on the compositor.
- **Section rail** (`components/SectionRail.tsx`). A slim rail on the left
  edge marks the section under the middle of the screen; hovering names
  every section and each is a link. Desktop with a mouse only; it hides for
  the hero and the pinned signal scene.

Profiled after the pass (production build, 1920×1080 buffer, 60Hz): the
dive with the core off and on, energising, mouse sweeps over the powered
hero with bloom and trail, and the rest of the page all held 60fps with no
frame over 17.5ms.

## 8. Bugs found and fixed

| Bug | Cause | Fix |
| --- | --- | --- |
| Uncaught `isReady` errors when leaving a page mid-compile | three.js `compileAsync` polled programs that had already been disposed | Our own compile poll, which stops when the world unmounts and skips released programs |
| Landed cards vanished and replayed after a pause | Re-entry was detected with a 250 ms time gap, so long frames and tab switches reset the card | Re-entry is detected by skipped render frames |
| Reactor centre hidden; "SV" invisible | The housing was a closed cylinder whose front cap covered the tunnel | Open drum: shell, face ring, tunnel wall and back plate |
| 13 px sideways scroll on desktop | The discipline band's `vw` negative margins include the scrollbar width | `body { overflow-x: clip }` |
| Layout jump when scroll is locked | Hiding overflow removed the scrollbar | `html { scrollbar-gutter: stable }` |
| Mobile menu pill not right-aligned | A desktop sibling selector outranked the mobile rule | Mobile rule covers both selectors |
| Card copy visible while the sheet was still bending | The fallback scroll trigger fired before the sheet drew | Choreography waits for `data-sheets` / `data-landed` |
| Online reactor washed out the hero | Light spill tuned too high | Rebalanced wash, halo, rays and point light |

---

## 9. Tuning guide

| To change | Where |
| --- | --- |
| Minimum card landing time | `LANDING_SECONDS` in `components/canvas/Graphics.tsx` |
| Card landing shape and tint | `ProjectSheet.ts`: the "from" rect in `render()`, `u_tint`, and the `placementWeight` stagger in the vertex shader |
| Card backgrounds (sheet) | `backgrounds` map in `ProjectSheet.ts` (keep in sync with `.project-*` CSS) |
| Hover strength | Graphics.tsx sheet branch (camera offsets `1.2` / `0.8`); ProjectSheet fragment (`0.05` zoom, `0.022` frame) |
| Click-zoom speed and overshoot | `RouteTransition.tsx`: `duration: 1.15`, `* 1.2` fill; dive depth `0.6` in Graphics.tsx |
| Mouse trail feel | `settings` in `ScreenPaint.ts` (brush size, `warp`, `band`, `drift`, `rgbSplit`) |
| Text colour brush | `TRAIL`, `EASE`, `MAX_STAMPS` in `components/TextLens.tsx`; accent per section with `--lens` (CSS) |
| Reactor light spill | `heroWash`, `rays`, `coreGlow` and point-light values in HeroWorld's `useFrame` |
| Reactor size, position, tilt | Root scale (`0.84` desktop / `0.5` mobile), position `halfWidth * 0.4`, tilt `0.1` / `0.42` in HeroWorld |
| Copper and glass look | `copper` and `glass` materials in HeroWorld |
| Monogram text and size | `drawMonogram()` in HeroWorld (`"SV"`, `size * 0.5`) |
| Power timings | `CORE_TIMING` in `lib/core-sequence.ts` |
| Intro build choreography | `assemble()` in HeroWorld (each part's start and duration) |
| Blueprint drawing order | `at(start)` values in `components/Preloader.tsx` |
| Preloader minimum pace | `dt * 0.75` in `CoreIgnition.tsx` |
| Headline neon glow | `.hero h1 .hero-line-inner::before/::after` and `.hero[data-core-phase=…]` rules in `styles/motion.css` (shadows on per-line copies, faded with opacity) |
| GPU classes, DPR caps, MSAA | `getGpuTier` / `getRenderProfile` in `lib/render-budget.ts` |
| When the budget steps down | `sample()` thresholds in `lib/render-budget.ts` (a fifth over the display's frame interval, 20% late) |
| How tightly motion follows scroll | `SCRUB` in `components/choreography.ts`; `lerp` in `components/SmoothScroll.tsx` |
| Sheet flex on scroll | `SHEET_BEND` and the `2600` px/s scale in `Graphics.tsx`; channel split `0.3` in `ProjectSheet.ts` |
| Label decode | `GLYPHS`, duration and the exclusion list in `components/choreography.ts` |
| Dive length | `.hero-stage` height (`+ 120svh`) in `styles/motion.css` |
| Dive choreography | The timeline positions in `choreography.ts` (copy out, `coreDive`, flood) |
| How close the dive ends | `DIVE_DEPTH` in `HeroWorld.tsx` (camera sits at 9.2) |
| Bloom threshold and strength | `smoothstep(0.74, 1.0, …)` and the `0.2` / `0.36` weights in `Bloom.ts` |
| Hold delay and release speed | `180` ms in `CoreInteraction.tsx`; `releaseCore` in `lib/core-sequence.ts` |
| When dusk falls | `start: "top 60%"` / `end: "top 40%"` in `choreography.ts`; colours under `.experience[data-tone]` |
| Rail sections | `sections` in `components/SectionRail.tsx` |
| Sound on by default | `DEFAULT_ON` in `lib/sound.ts` |
| Sound levels and voices | `peak` values in `lib/sound.ts` (`playTick`, `playPress`, `playWhoosh`, `applyPhase`) |
| Powered accent colours | `html[data-power]` rules in `styles/motion.css` |
| Trail glow and card rim strength | `u_power * 0.32` in `ScreenPaint.ts`; the rim line in `ProjectSheet.ts` |

---

## 10. Testing and verification

**Automated:** `npm test` runs 20 tests.
- `content`: slugs, case studies, fallback art, the résumé rule, and attribution and pilot wording.
- `core-sequence`: no mid-flight restarts, online persists, power-down cycle, continuous phase endpoints, cancellation, and a held charge releasing without a snap.
- `playground-physics`.
- `render-budget`: pixel budgets, downgrade-only with at most two changes and no oscillation, GPU classes, shedding the optional pass only under sustained load, and a 30Hz frame cap not being read as load.

**Also checked each round:**
- `npm run lint`, `npm run typecheck` and `npm run build` all pass.
- Checked in a browser:
  - scroll sync and the landing, hover and zoom flows;
  - the menu, the runway, and the zoom from cards on `/work`;
  - the reactor at rest and energised, the blueprint stages, and the 3D build stages;
  - mobile width and reduced motion.
- A production build showed no console output across the main flows.

**Checked in stages, not watched end to end:** the testing browser pauses
hidden pages, so the preloader and intro were verified by freezing the
blueprint at 35%, 70% and 100%, and by setting the 3D build to set points.
Watch a full first visit in a real browser.

---

## 11. Deployment

Vercel imports `BaconKage/Personal_Portfolio_Professional` and builds from `main`.

| Setting | Value |
| --- | --- |
| Framework preset | Next.js |
| Node | 22.x |
| Install / build | `npm ci` / `npm run build` |
| Environment variables | None required. Optional `NEXT_PUBLIC_SITE_URL` for canonical URLs; indexing is enabled in Vercel production. |

A push to `main` triggers a production deploy. Hard-refresh after it goes live
to see the new preloader.

---

## 12. Known limitations and follow-ups

- **`README.md` is partly out of date.** It still describes the torus-knot hero, the SVG cursor trail, "a maximum of two worlds mount", resolution that "recovers gradually", and a mobile-only menu. This document reflects the current behaviour.
- **Safari and Firefox** were not tested. The light effects use additive premultiplied output, which Chromium composites as intended.
- **Browser support:** screen paint needs WebGL2 and `EXT_color_buffer_float`, and project sheets need WebGL2. Without them the site falls back gracefully to direct rendering and DOM cards.
- **Scroll sync:** touch devices keep native scrolling (`syncTouch: false`), so on phones the canvas may trail scroll by a frame.
- **Other browsers:** the blueprint's `clamp()` / `calc()` in `stroke-dashoffset` is modern CSS. Older browsers show the blueprint fully drawn.
- **Local files:** `.claude/` (local preview-server config) is untracked and not part of the site. Add it to `.gitignore` or delete it.
- **Résumé:** the link is still hidden until `profile.resume` points to a real PDF in `public/`.

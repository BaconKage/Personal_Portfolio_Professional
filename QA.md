# Visual and technical QA

Checked in the Codex Chromium browser on Windows, 9 September 2026. This is an implementation QA record, not a cross-browser certification.

## Visual passes

1. Static hierarchy and composition: warm-paper hero, oversized type, large project stages, work index, and editorial case studies. Static content established before WebGL.
2. WebGL composition: desktop hero and MyGym scale; project-specific voice, conversation, language and posture scenes; mobile camera fitting and readable captions. Corrected stacking and pointer interception in the shared graphics layer.
3. Final fallback and interaction pass: strengthened the static hero poster, checked script glyphs, verified reduced motion persistence and canvas removal, repaired work-index social metadata, and reset illustration state between cases.

## Viewports actually inspected

| Size       | Views inspected                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------- |
| 1440 × 900 | Homepage hero, MyGym Selected Work entrance, MyGym artwork, VaniCert case title/scene/controls |
| 390 × 844  | Homepage, MyGym case and reading flow, mobile menu, reduced-motion fallback                    |
| 1280 × 800 | FirstDropAI case title and full artwork                                                        |
| 1024 × 768 | BhashaBuddy case title, glyphs, artwork                                                        |
| 768 × 1024 | Posture Engine case and illustration                                                           |
| 430 × 932  | Work index and MyGym card                                                                      |
| 375 × 667  | Homepage hero and responsive overflow                                                          |

The inspected DOM widths did not exceed their viewports. Longer pages remain natively scrollable. This matrix samples representative pages at each size; it does not assert every route was tested at every size.

## Functional checks

- Mobile dialog opens, closes on Escape, and restores focus to Menu.
- MyGym buttons activate by pointer and keyboard after the graphics hit-testing fix. Posture movement and language selection controls activate.
- Reduced motion removes all canvases and ready-state attributes. Choice persists after reload.
- Server-rendered case studies contain meaningful headings, text, source-backed links, and fallback artwork.
- Every case slug is unique and has an existing poster. Missing résumé stays absent. Attribution/pilot-status tests pass.
- Production build successfully prerenders homepage, index and five case studies.

Final production route smoke results are recorded by running `node scripts/check-routes.mjs` against the built application. This checks statuses, semantic HTML, canonical and social-image metadata, generated images, robots/sitemap, and an unknown project 404.

## Remaining external validation

Physical touch devices, Safari/Firefox, network-throttled Lighthouse, field Core Web Vitals, and real GPU context loss were not independently tested. Vercel, the final domain, and the owner's résumé PDF are intentionally not connected yet.

## Final production confirmation

- All seven content routes returned HTTP 200 with a main landmark, H1, canonical, and social-image metadata.
- All six generated social-image endpoints returned image responses; robots, sitemap, and hero poster returned 200.
- An unknown project returned HTTP 404.
- Raw server HTML was 23–38 KB per content page in this local production build. This is HTML size only, not a complete transfer or performance score.
- Production Chromium reported no warnings or errors during the final homepage/project navigation checks.
- Selecting VaniCert's Consensus then navigating to FirstDropAI resets to Scenario; browser Back returns to VaniCert with Input selected.
- Final production checks revisited the 390 × 844 fallback and WebGL Selected Work, plus the 1440 × 900 adjacent-world transition. The shared particle overlay stays behind readable links and text.

## Motion overhaul — 10 September 2026

Replaced the optical-ring hero with an instanced field of rotating connectors, spring separation and pointer repulsion. Visible worlds now animate continuously. Added the expanding desktop hero scroll sequence, rolling project letters, stronger project entrances, magnetic CTAs, mobile menu reveals and internal navigation curtains. Mobile title movement stays within the content gutters; mobile scrolling is unpinned.

Verified the updated production build at 1440 × 900 and 390 × 844: animated hero and scroll expansion, MyGym entrance, readable project composition, no horizontal overflow, and a live canvas through scrolling. Verified case-study routing and mobile menu-to-work routing: the curtain exits, dialog closes and document scrolling is restored. Reduced motion removes the canvas and pin spacers; returning to System restores graphics. The updated fallback uses a versioned filename to avoid stale optimized artwork.

Lint, production TypeScript/build, all three content tests, and the complete production route/image/404 smoke suite pass. The rebuilt production preview is served on port 3001. Earlier matrix entries describe the preceding implementation; the motion overhaul was visually retested at the two sizes above. Reference motion was reconstructed with original local geometry, not a frame-for-frame reproduction of every Lusion interaction.

## Neural hero and identity refinement

Replaced connector blocks with a responsive neural network and matching static poster. Added a short fading mouse trail, disabled for coarse pointers and reduced motion. Enlarged the full name to a responsive 30–68px and used a two-line name treatment on narrow screens. Artwork now follows the headline in normal flow.

Production browser review at 1440 × 900, 390 × 844, and 1920 × 993 found no horizontal overflow. The settled headline-to-art gaps measured 43.2px, 32px and 56px respectively. Inspected the name and neural scene at all three sizes. Pointer input produced trail coordinates and opacity; the trail subsequently faded to zero. Reduced motion removes both the WebGL canvas and cursor trail. Browser inspection initially hit a usage-limit rejection, then succeeded after continuation. Production build/TypeScript and lint pass.

## Thinking-network and readability pass

The neural hero now sends timed waves along its graph connections. Pointer focus brightens nearby nodes; clicking the artwork or the keyboard-accessible Send a signal button launches a propagation wave and ripple. Vertex colors and instanced glow shells show activity without adding postprocessing. Autonomous waves occur every 4.5 seconds. This remains an illustrative network, not an AI model output.

After revisiting https://lusion.co/, added scroll-linked word emphasis to About, rotation/scale to the research symbol, staggered experience entries, and an expanding contact panel on desktop. Increased smaller navigation, metadata, controls and supporting copy by about 1–2px. Hero controls stay outside the expanding artwork so they cannot be clipped by its scale.

Desktop 1440 × 900 and mobile 390 × 844 browser checks covered the active hero, keyboard/button activation, About reading layout and mobile experience copy. No horizontal overflow was detected. Reduced motion removes the canvas, hides the visual signal control and restores normal text colors. Lint, TypeScript/production build and all three content tests pass.

## Project-card zoom navigation

All homepage project articles and all five Work-index cards now expand their selected artwork to the viewport before revealing the case study. Homepage artwork is clickable in addition to the existing semantic title/CTA links. A one-frame WebGL copy preserves the visible live world; local posters provide a bounded fallback. Navigation is prefetched, duplicate clicks are guarded, and the temporary overlay clears on completion or timeout. Reduced motion retains direct native Link navigation; modifier clicks, downloads and external links are not intercepted.

Checked MyGym from the desktop homepage, VaniCert from the desktop Work index, and FirstDropAI, BhashaBuddy and Posture Engine from the mobile Work index. All reached their correct case study. Verified the transition overlay is hidden and emptied after completion, and reviewed desktop card composition and the mobile destination. Production build/TypeScript and lint pass.

## Spatial interlude and kinetic typography

Following a fresh review of Lusion home/About, added an original particle passage before Contact. Scrolling travels through luminous spiral paths; pointer movement shifts perspective. Tunnel and Orbit buttons transform the same 1,400–3,200 particles and 16 paths between a spatial passage and a rotating sphere. The shared WebGL renderer still mounts at most two visible worlds. CSS sticky positioning provides the passage, with a direct contact shortcut and a shorter mobile duration. Opposing scroll-linked type bands bridge Selected Work and About.

Reviewed the rendered tunnel and orbit at 1440 × 900, and the tunnel at 390 × 844. Keyboard mode changes and the contact shortcut work. No mobile horizontal overflow was found. Reduced motion removes the canvas and interactive mode controls and uses a single-screen static spiral composition. Inspected the typography bands and fallback visually. The first starfield was strengthened with visible spiral paths; the fallback inherited background fill was corrected. Build/TypeScript and lint pass.

## Immersive core hero — 11 September 2026

Replaced the separate network panel with a full-screen dark composition: prominent identity, oversized headline, and a metallic knot with travelling illuminated pathways. The geometry breathes gently, follows the pointer, and supports drag rotation plus keyboard arrows. Clicking or activating Energise the core increases the travelling light, expands nearby particles and releases a fading orbit ripple. A DOM interaction surface preserves native vertical touch scrolling; physical touch hardware remains untested. The contact invitation now uses the same rolling-letter treatment as project titles.

Browser review at 1440 × 900 and 390 × 844 covered the hero composition, pointer drag, keyboard rotation/charge, visible button feedback, mobile menu and contact typography. The initial mobile sculpture crowded text; its scale and position were adjusted, and the supporting copy has a dark gradient. Desktop work navigation has a dark backing for contrast over the moving sculpture. No horizontal overflow was found; a wide-desktop check also measured the page within the 1920px viewport.

Reduced motion removes all canvases and hides the core interaction surface and charge button. Static CSS rings remain. The footer preference now also disables CSS animation, including the rolling letters and menu entrance. A return-from-footer check exposed hero supporting copy remaining faded after a preference change; those text blocks now remain visible while scrolling, and the same sequence was retested with computed opacity 1.

Production compilation and TypeScript, lint, and all three content tests pass. The seven content routes, six social images, robots, sitemap, poster and unknown-project 404 pass the local production smoke suite. No browser warnings or errors were reported during production interaction checks. Reference review included the current Lusion homepage in the browser and its About page content; this implementation uses original local geometry and does not claim frame-for-frame equivalence.

## Core ignition opening

Added a first-visit opening driven by the hero's first successful rendered frame. The shader traces a luminous leading edge around the knot and reveals its metallic surface. Scale and position settle into the normal hero while CSS reveals the identity and headline. Automatic playback is remembered in session storage; Replay intro is optional. Removed the competing GSAP entrance so one sequence owns hero entry. The renderer now writes its ready attribute only when it changes, avoiding repeated observer notifications.

Inspected consecutive trace frames and the settled hero at 1440 × 900 and 390 × 844. Verified pointer Skip, Escape, focus restoration to the named H1, automatic first entry in a new tab, and a warm refresh reaching the completed state in under the 1.45-second animation duration. Reduced motion removed the canvas and hid both intro controls. Mobile charge-button spacing was increased to keep it clear of supporting copy. No horizontal overflow appeared at the two target sizes. The 2.5-second graphics timeout and route/event cleanup were reviewed in code; an actual GPU failure was not induced.

Lint, production compilation/TypeScript, and the complete production route/image/404 smoke suite pass. The production hero completed normally and reported no browser warnings or errors. The updated local preview runs on port 3001.

## Slower ignition and refresh playback

Extended the ignition to 3.2 seconds using one shared clock for the shader and proportional CSS timing. Framing and particle arrival use a smoother easing curve, the bright leading edge fades out gradually, and pointer response blends into the final scene. Identity, headline, supporting copy and the charge control now enter with longer overlapping reveals. Replaced the session-storage gate with a document-local guard: a full refresh plays the intro again, while client-side return navigation stays direct. Refreshing after scrolling returns to the hero, with scroll-restoration settings restored when the intro finishes or unmounts.

Checked the trace-to-type handoff at 1440 × 900 and the settled mobile composition at 390 × 844. Confirmed refresh re-enters the waiting/running sequence, a refresh from Contact returns to scroll position 0, and completion restores the interactive hero. No mobile horizontal overflow or browser warnings/errors were observed. Earlier first-visit/session behavior above describes the preceding milestone.

Lint and production build/TypeScript pass. Verified the rebuilt port-3001 preview completes normally and a subsequent refresh starts a fresh ignition with the shared duration set to 3200ms.

## Social profile placement

Added a shared GitHub/LinkedIn link treatment to the hero footer, contact section, and mobile menu's Elsewhere row. Hero links arrive with the ignition's supporting copy. Text links use the existing color palette, an underline reveal, and subtle diagonal arrow movement on hover/focus. Each opens the owner's exact supplied URL in a new tab with noopener/noreferrer and a screen-reader hint.

Reviewed the desktop hero at 1440 × 900 and mobile layout/menu at 390 × 844. Confirmed all six rendered link destinations match the supplied profiles, mobile link hit areas are 44px tall, and the page has no horizontal overflow. Lint and production build/TypeScript pass.

## GitHub and Vercel handoff

Prepared the new `BaconKage/Personal_Portfolio_Professional` repository for owner-managed deployment. Pinned Node.js to 22.x in the package manifest and lockfile, ignored local Vercel metadata, and documented the exact import settings and optional custom-domain environment variable. All existing commit authors and committers use the owner's Git identity, with no assistant co-author trailers. No common credential patterns were found in tracked text files.

On Node.js 22.22.3, lint, all three content tests, the production build/TypeScript check, and the full production route/image/404 smoke suite pass. Vercel's hosted build has not been run; deployment remains with the owner.

## Reversible core explosion

Energise now builds a blue pathway glow over 2.2 seconds, releases the sculpture into a full-hero star field over 2.8 seconds, and leaves a persistent Reform the core action. Reconstruction takes 3.2 seconds. A shared state machine coordinates the UI and GPU without per-frame React updates. Stars sample the sculpture's actual geometry, use curved outward/returning paths, and retain depth, soft glow, subtle twinkle, and damped pointer parallax. Rendering still uses the shared canvas and existing quality tiers.

Visually inspected the charge, star field, and restored sculpture at 1440 × 900 and 390 × 844, plus the tablet composition at 768 × 1024. Fixed the lower hero content area intercepting part of the action button by raising its stacking order and increasing its clearance. Verified pointer and keyboard activation, reconstruction, persistent stars while the offscreen scene unmounts, and clean cancellation during Replay Intro and reduced motion. Reduced motion removes the canvas and resets the core state; mobile has no horizontal overflow.

Lint, all six tests (content and sequence lifecycle/continuity/cancellation), production build/TypeScript, and the production route/image/404 smoke suite pass. Rechecked the full production charge/reform cycle and replay cancellation before push; the browser reported no warnings or errors. Physical-device/Safari checks remain outside this browser-based verification.

## Project playground — 12 September 2026

Added five draggable project sculptures in the shared WebGL canvas, a project selection/detail panel, captured-frame case-study navigation, and an Assemble action. Circular planar collision proxies drive the 3D objects, with fixed timesteps and bounded throws. DOM buttons follow the rendered positions. Mouse/pen dragging, keyboard impulses and selection, touch tap selection, gesture cancellation, and reduced-motion/static artwork fallbacks are implemented. Following the owner's correction, the original particle tunnel, Orbit mode, styling, and scroll choreography are restored intact after the playground and before Contact.

Validation: lint, TypeScript, all 11 tests, production build, and the existing production route/image/404 smoke suite pass. The five new physics tests exercise collision momentum and separation, containment, release/cancellation, formation restoration at desktop/mobile sizes, 30/60/120 FPS consistency, resize cancellation, coincident bodies, and long pauses. The development homepage returned HTTP 200, and a local preview was requested at `/#playground`.

Browser interaction and visual QA were not performed for this addition. In particular, the projected DOM hit targets, actual GPU composition, touch scrolling, keyboard behavior, and live zoom transition still need an in-browser check. Earlier visual QA entries cover previous versions, not this playground. No new hosted deployment was made.

After restoring the tunnel alongside the playground, lint and the production build/TypeScript pass again. The generated homepage contains Playground → Tunnel/Orbit → Contact in that order. The tunnel component, world, styling, and scroll choreography match their original committed versions.

## Rendering optimization and playground browser QA — 14 September 2026

Kept the core ignition/charge/reform sequence, all project worlds, playground, tunnel, Orbit, and scroll/navigation effects. Added device pixel budgets and gradual runtime resolution adjustment while keeping geometry stable. Centralized layout reads, preloaded approaching scenes, moved portal animation into GPU shaders, instanced repeated MyGym and conversation objects, and removed repeated transition/posture allocations.

Chromium checks at 1440 × 900 and 390 × 844 covered the playground composition, projected object selection, desktop drag/release, keyboard selection/impulses, Escape assembly, MyGym case navigation and transition cleanup, and MyGym's optimized illustration/control state. Inspected both mobile tunnel and Orbit formations. Browser review caught and fixed an aspect-ratio-driven mobile stage overflow and Fiber's copying of shader uniform wrappers; the portal now owns materials whose live uniforms stay shared. The mobile document fits its content viewport after the width fix. Reduced motion removes all canvases and ready attributes, preserves the five static project links, and System restores full motion.

Lint, all 15 tests, and the production build including TypeScript pass. The tests cover content, core sequence continuity/cancellation, physics, and adaptive resolution behavior. The initial restricted test runner could not spawn Node workers; the authorized rerun passed. The production route/image/404 smoke suite passed. A stationary local development tunnel sample averaged 16.67 ms across 90 rendered frames; this is a single local observation, not a before/after benchmark or a claim about physical phones. Physical-device thermal behavior, Safari/Firefox, and field performance remain unmeasured.

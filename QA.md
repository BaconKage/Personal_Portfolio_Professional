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

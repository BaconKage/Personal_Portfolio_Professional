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

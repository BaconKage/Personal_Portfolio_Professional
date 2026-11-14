/**
 * The scroll dive through the reactor: 0 at rest, 1 with the camera inside
 * the core. Written by the scroll choreography, read every frame by the
 * hero scene. A plain object: no React state, no events.
 */
export const coreDive = { amount: 0 };

/** Height of the site header the hero slides under while the dive is on. */
export const DIVE_HEADER = 104;

/**
 * The project card being opened by a route transition, and how far (0..1).
 * RouteTransition writes it; the WebGL renderer reads it.
 *
 * mode "sheet": the card's own WebGL sheet bursts open from `origin` (the
 * click, 0..1 across the card, y down) until it is the whole viewport, while
 * its world's camera pushes in. mode "page": the fallback for cards that are
 * not sheets, where the page itself scales around the card.
 */
export const projectZoom: {
  element: HTMLElement | null;
  amount: number;
  mode: "sheet" | "page";
  origin: { x: number; y: number };
} = {
  element: null,
  amount: 0,
  mode: "page",
  origin: { x: 0.5, y: 0.5 },
};

/**
 * The project card being zoomed into by a route transition, and how far
 * (0..1). RouteTransition writes it; the WebGL renderer reads it to push that
 * card's camera in, so the world deepens as the page zooms around it.
 */
export const projectZoom: { element: HTMLElement | null; amount: number } = {
  element: null,
  amount: 0,
};

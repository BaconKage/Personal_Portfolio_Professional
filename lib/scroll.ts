import type Lenis from "lenis";

/**
 * One owner for page scrolling. Lenis (when motion is allowed) and native
 * scrolling share the same API, so callers never branch on which is active.
 */
let lenis: Lenis | null = null;
const locks = new Set<string>();

function apply() {
  const locked = locks.size > 0;
  document.documentElement.classList.toggle("scroll-locked", locked);
  if (!lenis) return;
  if (locked) lenis.stop();
  else lenis.start();
}

export function attachLenis(instance: Lenis | null) {
  lenis = instance;
  if (instance) apply();
}

export function getLenis() {
  return lenis;
}

/** Named locks let the menu, preloader, and route curtain overlap safely. */
export function lockScroll(reason: string) {
  locks.add(reason);
  apply();
}

export function unlockScroll(reason: string) {
  if (locks.delete(reason)) apply();
}

export function scrollToTarget(
  target: HTMLElement | number,
  { immediate = false }: { immediate?: boolean } = {},
) {
  if (lenis && !immediate) {
    lenis.scrollTo(target, {
      duration: 1.25,
      easing: (t) => 1 - Math.pow(1 - t, 4),
      force: true,
    });
    return;
  }
  lenis?.scrollTo(target, { immediate: true, force: true });
  if (typeof target === "number")
    window.scrollTo({ top: target, behavior: "instant" });
  else target.scrollIntoView({ block: "start", behavior: "instant" });
}

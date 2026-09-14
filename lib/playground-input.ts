/** DOM controls communicate only with their own scene slot. */
export type PlaygroundInput =
  | { kind: "grab" | "move"; index: number; x: number; y: number }
  | { kind: "release"; vx: number; vy: number }
  | { kind: "select"; index: number }
  | { kind: "hover"; index: number }
  | { kind: "nudge"; index: number; x: number; y: number }
  | { kind: "assemble" | "cancel" };

export function sendPlaygroundInput(
  element: HTMLElement | null,
  detail: PlaygroundInput,
) {
  element?.dispatchEvent(new CustomEvent("playground-input", { detail }));
}

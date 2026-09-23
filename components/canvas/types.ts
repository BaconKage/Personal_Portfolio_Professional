import type { SceneId } from "@/components/Artwork";
import type { PerspectiveCamera } from "three";
export type SceneLayout = {
  rect: DOMRectReadOnly | null;
  clip: DOMRectReadOnly | null;
  section: DOMRectReadOnly | null;
  viewportWidth: number;
  viewportHeight: number;
};
export type SceneProps = {
  id: SceneId;
  progress: { current: number };
  pointer: { x: number; y: number };
  step: { current: number };
  quality: number;
  element: HTMLElement;
  camera: PerspectiveCamera;
  layout: SceneLayout;
  /** False while mounted off-screen: worlds skip their per-frame work. */
  active: { current: boolean };
};

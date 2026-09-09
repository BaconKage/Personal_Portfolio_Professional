import type { SceneId } from "@/components/Artwork";
export type SceneProps = {
  id: SceneId;
  progress: { current: number };
  pointer: { x: number; y: number };
  step: { current: number };
  quality: number;
};

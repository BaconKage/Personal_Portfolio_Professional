import Image from "next/image";
export type SceneId =
  | "hero"
  | "mygym"
  | "vanicert"
  | "firstdrop-ai"
  | "bhashabuddy"
  | "posture-engine";
/** Original artwork remains visible without JavaScript or WebGL. */
export default function Artwork({
  scene,
  className = "",
  eager = false,
}: {
  scene: SceneId;
  className?: string;
  eager?: boolean;
}) {
  return (
    <Image
      src={`/art/${scene === "hero" ? "hero-kinetic" : scene}.webp`}
      alt=""
      aria-hidden="true"
      width={1200}
      height={800}
      sizes="(max-width: 767px) 100vw, 90vw"
      preload={scene === "hero"}
      loading={scene === "hero" || eager ? "eager" : "lazy"}
      className={`artwork ${className}`}
    />
  );
}

import Image from "next/image";
import type { Project } from "@/data/projects";

/**
 * Real screens from the product, on its case study. The 3D scene above is an
 * illustration; this is what the thing looks like. Phone screens sit in a
 * row that scrolls sideways on narrow screens; a web page sits in a plain
 * browser frame with its address.
 */
export default function ProductShots({ project }: { project: Project }) {
  const shots = project.shots;
  if (!shots?.length) return null;
  const phones = shots[0].kind === "phone";
  return (
    <section className="case-shots" aria-labelledby="shots-title">
      <div className="case-shots-head">
        <span className="eyebrow">THE PRODUCT</span>
        <div>
          <h2 id="shots-title">
            {phones ? "Screens from the app." : "What it looks like."}
          </h2>
          {project.shotsNote && <p>{project.shotsNote}</p>}
        </div>
      </div>
      <div className={phones ? "shot-row shot-phones" : "shot-row shot-web"}>
        {shots.map((shot) => (
          <figure key={shot.src} className={`shot shot-${shot.kind}`}>
            <div className="shot-frame">
              {shot.kind === "web" && (
                <div className="shot-bar" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <b>{shot.address}</b>
                </div>
              )}
              <Image
                src={shot.src}
                alt={shot.alt}
                width={shot.width}
                height={shot.height}
                sizes={
                  phones
                    ? "(max-width: 767px) 62vw, 220px"
                    : "(max-width: 767px) 100vw, 1100px"
                }
              />
            </div>
            <figcaption>
              <b>{shot.label}</b>
              {shot.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

import Link from "next/link";
import RollingText from "./RollingText";

/**
 * The page ends by leading somewhere. Scrolling through the runway fills the
 * ring and follows the link (see choreography.ts); it is also an ordinary link.
 */
export default function NextPage({
  href,
  eyebrow,
  title,
}: {
  href: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="next-page" aria-label="Next page">
      <div className="next-page-sticky">
        <span className="eyebrow next-page-eyebrow">{eyebrow}</span>
        <Link className="next-page-link" href={href} data-next-page>
          <RollingText text={title} />
          <span className="next-page-arrow" aria-hidden="true">
            ↗
          </span>
        </Link>
        <span className="next-page-hint eyebrow" aria-hidden="true">
          <svg viewBox="0 0 44 44" className="next-page-ring">
            <circle cx="22" cy="22" r="20" />
            <circle cx="22" cy="22" r="20" pathLength="1" />
          </svg>
          KEEP SCROLLING
        </span>
      </div>
    </section>
  );
}

import { profile } from "@/data/profile";

export default function SocialLinks() {
  return (
    <div className="social-links" role="group" aria-label="Social profiles">
      {[
        { name: "GitHub", href: profile.github },
        { name: "LinkedIn", href: profile.linkedin },
      ].map(({ name, href }) => (
        <a key={name} href={href} target="_blank" rel="noopener noreferrer">
          <span>{name}</span>
          <span className="social-arrow" aria-hidden="true">
            ↗
          </span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ))}
    </div>
  );
}

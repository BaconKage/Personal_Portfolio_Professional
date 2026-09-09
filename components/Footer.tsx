import Link from "next/link";
import { profile } from "@/data/profile";
export default function Footer() {
  return (
    <footer className="case-footer">
      <Link href="/" className="wordmark">
        sv<span>·</span>
      </Link>
      <a href={`mailto:${profile.email}`}>Let’s talk ↗</a>
      <span className="eyebrow">
        BENGALURU, INDIA · {new Date().getFullYear()}
      </span>
    </footer>
  );
}

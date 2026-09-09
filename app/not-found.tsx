import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="not-found">
      <span className="eyebrow">404 / OFF THE MAP</span>
      <h1>This path ends here.</h1>
      <p>The work is still one click away.</p>
      <Link className="text-link" href="/work">
        Explore the work ↗
      </Link>
    </main>
  );
}

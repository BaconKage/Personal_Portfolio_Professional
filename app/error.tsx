"use client";
import Link from "next/link";
export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main id="main" className="not-found">
      <span className="eyebrow">SOMETHING DIDN’T LOAD</span>
      <h1>Let’s try that again.</h1>
      <button className="retry-button" onClick={retry}>
        Retry page ↗
      </button>
      <Link className="text-link" href="/">
        Back to home
      </Link>
    </main>
  );
}

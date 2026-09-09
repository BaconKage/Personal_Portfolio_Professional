"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { profile } from "@/data/profile";

export default function Navigation() {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const path = usePathname();
  useEffect(() => {
    dialog.current?.close();
  }, [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  function close() {
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <>
      <header className="nav">
        <Link href="/" className="wordmark" aria-label="Shubhang Varda home">
          sv<span>·</span>
        </Link>
        <span className="nav-role">
          INDEPENDENT MIND.
          <br />
          ENGINEERING INSTINCT.
        </span>
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link href="/work">
            Work <sup>05</sup>
          </Link>
          <Link href="/#about">About</Link>
          {profile.resume && (
            <a href={profile.resume} target="_blank" rel="noreferrer">
              Resume ↗
            </a>
          )}
          <a className="contact-pill" href={`mailto:${profile.email}`}>
            Let’s talk <span>↗</span>
          </a>
        </nav>
        <button
          className="menu-trigger"
          ref={trigger}
          onClick={() => {
            dialog.current?.showModal();
            setOpen(true);
          }}
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          Menu <span>＋</span>
        </button>
      </header>
      <noscript>
        <nav className="nojs-nav" aria-label="Navigation without JavaScript">
          <Link href="/work">Work</Link>
          <Link href="/#about">About</Link>
          <Link href="/#contact">Contact</Link>
        </nav>
      </noscript>
      <dialog
        ref={dialog}
        id="mobile-menu"
        className="mobile-menu"
        onClose={() => setOpen(false)}
        onCancel={close}
      >
        <div className="menu-top">
          <Link href="/" onClick={close} className="wordmark">
            sv·
          </Link>
          <button onClick={close}>Close ×</button>
        </div>
        <nav aria-label="Mobile navigation">
          <Link href="/work" onClick={close}>
            Work <sup>05</sup>
          </Link>
          <Link href="/#about" onClick={close}>
            About
          </Link>
          {profile.resume && <a href={profile.resume}>Resume ↗</a>}
          <Link href="/#contact" onClick={close}>
            Contact ↗
          </Link>
        </nav>
        <a className="menu-email" href={`mailto:${profile.email}`}>
          {profile.email}
        </a>
      </dialog>
    </>
  );
}

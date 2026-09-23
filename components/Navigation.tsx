"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { profile } from "@/data/profile";
import { lockScroll, unlockScroll } from "@/lib/scroll";
import SocialLinks from "./SocialLinks";
import RollingText from "./RollingText";

const menuLinks = [
  { href: "/work", label: "Work", note: "05" },
  { href: "/#about", label: "About" },
  { href: "/#playground", label: "Playground" },
  { href: "/#contact", label: "Contact" },
];

function localTime() {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

export default function Navigation() {
  const [open, setOpen] = useState(false);
  const [floating, setFloating] = useState(false);
  const [time, setTime] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null);
  const path = usePathname();

  useEffect(() => {
    if (closing.current) clearTimeout(closing.current);
    dialog.current?.close();
  }, [path]);

  useEffect(() => {
    if (!open) return;
    lockScroll("menu");
    const clock = setInterval(() => setTime(localTime()), 20_000);
    return () => {
      clearInterval(clock);
      unlockScroll("menu");
    };
  }, [open]);

  // Once the header has scrolled away, a compact pill pair stays in reach.
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setFloating(window.scrollY > 160);
    };
    const scroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", scroll);
    };
  }, [path]);

  function show(trigger: HTMLButtonElement) {
    const menu = dialog.current;
    if (!menu || menu.open) return;
    opener.current = trigger;
    // The panel grows out of whichever pill opened it.
    const r = trigger.getBoundingClientRect();
    menu.style.setProperty("--menu-x", `${r.left + r.width / 2}px`);
    menu.style.setProperty("--menu-y", `${r.top + r.height / 2}px`);
    delete menu.dataset.closing;
    menu.showModal();
    setTime(localTime());
    setOpen(true);
  }

  function close() {
    const menu = dialog.current;
    if (!menu?.open || menu.dataset.closing) return;
    unlockScroll("menu");
    const finish = () => {
      closing.current = null;
      delete menu.dataset.closing;
      menu.close();
      opener.current?.focus({ preventScroll: true });
    };
    if (document.documentElement.dataset.motion === "reduced") return finish();
    menu.dataset.closing = "true";
    closing.current = setTimeout(finish, 420);
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
            <RollingText text="Work" /> <sup>05</sup>
          </Link>
          <Link href="/#about">
            <RollingText text="About" />
          </Link>
          {profile.resume && (
            <a href={profile.resume} target="_blank" rel="noreferrer">
              <RollingText text="Resume" /> ↗
            </a>
          )}
          <a className="contact-pill" href={`mailto:${profile.email}`}>
            <RollingText text="Let’s talk" /> <span>↗</span>
          </a>
        </nav>
        <button
          className="menu-trigger"
          onClick={(e) => show(e.currentTarget)}
          aria-expanded={open}
          aria-controls="site-menu"
          aria-haspopup="dialog"
        >
          <RollingText text="Menu" />{" "}
          <span className="menu-dots" aria-hidden="true">
            <i />
            <i />
          </span>
        </button>
      </header>
      <div
        className="nav-float"
        data-visible={floating && !open ? "true" : undefined}
        inert={!floating || open}
      >
        <a className="float-pill float-talk" href={`mailto:${profile.email}`}>
          <RollingText text="Let’s talk" /> <span aria-hidden="true">↗</span>
        </a>
        <button
          className="float-pill float-menu"
          onClick={(e) => show(e.currentTarget)}
          aria-expanded={open}
          aria-controls="site-menu"
          aria-haspopup="dialog"
        >
          <RollingText text="Menu" />{" "}
          <span className="menu-dots" aria-hidden="true">
            <i />
            <i />
          </span>
        </button>
      </div>
      <noscript>
        <nav className="nojs-nav" aria-label="Navigation without JavaScript">
          <Link href="/work">Work</Link>
          <Link href="/#about">About</Link>
          <Link href="/#contact">Contact</Link>
        </nav>
      </noscript>
      <dialog
        ref={dialog}
        id="site-menu"
        className="site-menu"
        aria-label="Site menu"
        data-lenis-prevent
        onClose={() => setOpen(false)}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        <div className="menu-inner">
          <div className="menu-top">
            <Link href="/" onClick={close} className="wordmark">
              sv<span>·</span>
            </Link>
            <button className="menu-close" onClick={close}>
              <RollingText text="Close" /> <span aria-hidden="true">×</span>
            </button>
          </div>
          <nav className="menu-links" aria-label="Site">
            {menuLinks.map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                style={{ "--item": i } as React.CSSProperties}
              >
                <span className="menu-index">0{i + 1}</span>
                <RollingText text={link.label} />
                {link.note && <sup>{link.note}</sup>}
              </Link>
            ))}
            {profile.resume && (
              <a
                href={profile.resume}
                style={{ "--item": menuLinks.length } as React.CSSProperties}
              >
                <span className="menu-index">0{menuLinks.length + 1}</span>
                <RollingText text="Resume" />
              </a>
            )}
          </nav>
          <div className="menu-foot">
            <div>
              <p className="eyebrow">SAY HELLO</p>
              <a className="menu-email" href={`mailto:${profile.email}`}>
                <RollingText text={profile.email} />
              </a>
            </div>
            <div className="menu-socials">
              <p className="eyebrow">ELSEWHERE</p>
              <SocialLinks />
            </div>
            <p className="eyebrow menu-time" suppressHydrationWarning>
              <i /> BENGALURU {time && `· ${time} IST`}
            </p>
          </div>
        </div>
      </dialog>
    </>
  );
}

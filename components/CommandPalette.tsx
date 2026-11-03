"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { profile, research } from "@/data/profile";
import { projects } from "@/data/projects";
import { getCoreState } from "@/lib/core-sequence";
import { lockScroll, unlockScroll } from "@/lib/scroll";

const SOURCE_URL = "https://github.com/BaconKage/Personal_Portfolio_Professional";

type Group = "Navigate" | "Projects" | "Actions" | "Elsewhere";
type Context = { path: string; motion: "system" | "reduced"; core: string };
type Command = {
  id: string;
  group: Group;
  label: string;
  hint?: string;
  keywords?: string;
  /** Internal route or anchor; activation reuses the site's link handling. */
  href?: string;
  external?: string;
  /** Returns a status message to announce, or nothing to close the palette. */
  run?: () => string | void;
};

const groups: Group[] = ["Navigate", "Projects", "Actions", "Elsewhere"];

function readMotion(): "system" | "reduced" {
  try {
    return localStorage.getItem("portfolio-motion") === "reduced"
      ? "reduced"
      : "system";
  } catch {
    return "system";
  }
}

function setMotion(value: "system" | "reduced") {
  try {
    localStorage.setItem("portfolio-motion", value);
  } catch {}
  window.dispatchEvent(new CustomEvent("motion-change", { detail: value }));
  // Keep the footer's select in step with a change made from here.
  const select = document.querySelector<HTMLSelectElement>("#motion-mode");
  if (select) select.value = value;
}

function buildCommands({ path, motion, core }: Context): Command[] {
  const home = path === "/";
  const animated =
    motion !== "reduced" &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const list: Command[] = [
    { id: "home", group: "Navigate", label: "Home", hint: "/", keywords: "start top hero core", href: home ? "/#main" : "/" },
    { id: "work", group: "Navigate", label: "All work", hint: "/work", keywords: "projects case studies index", href: "/work" },
    { id: "about", group: "Navigate", label: "About", keywords: "person bio education university", href: "/#about" },
    { id: "research", group: "Navigate", label: "Research", keywords: "paper publication springer ai society imperfection", href: "/#research" },
    { id: "experience", group: "Navigate", label: "Experience", keywords: "jobs roles career first drop catalyst", href: "/#experience" },
    { id: "playground", group: "Navigate", label: "Playground", keywords: "physics drag throw objects play", href: "/#playground" },
    { id: "contact", group: "Navigate", label: "Contact", keywords: "hire talk hello reach", href: "/#contact" },
    ...projects.map<Command>((p) => ({
      id: `project-${p.slug}`,
      group: "Projects",
      label: p.title,
      hint: p.number,
      keywords: `${p.descriptor} ${p.category} ${p.stack.join(" ")}`,
      href: `/work/${p.slug}`,
    })),
    {
      id: "copy-email",
      group: "Actions",
      label: "Copy email address",
      hint: profile.email,
      keywords: "clipboard contact mail",
      run: () => {
        navigator.clipboard?.writeText(profile.email).catch(() => {});
        return `Copied ${profile.email}`;
      },
    },
    { id: "write-email", group: "Actions", label: "Write an email", keywords: "mailto contact hire", external: `mailto:${profile.email}` },
  ];
  if (home && animated) {
    list.push(
      {
        id: "core",
        group: "Actions",
        label: core === "online" ? "Power down the core" : "Energise the core",
        keywords: "reactor charge hero signal",
        href: "/#main",
        run: () => {
          // The hero world remounts as the page glides back; fire once it renders.
          const started = performance.now();
          const wait = () => {
            const art = document.querySelector<HTMLElement>(".hero-art");
            if (art?.dataset.ready === "true" && window.scrollY < 40)
              window.dispatchEvent(new Event("neural-signal"));
            else if (performance.now() - started < 3500) setTimeout(wait, 120);
          };
          setTimeout(wait, 200);
        },
      },
      {
        id: "replay",
        group: "Actions",
        label: "Replay the intro",
        keywords: "ignition preloader animation again",
        run: () => {
          document.querySelector<HTMLButtonElement>(".ignition-replay")?.click();
        },
      },
    );
  }
  list.push(
    {
      id: "motion",
      group: "Actions",
      label: motion === "reduced" ? "Restore full motion" : "Reduce motion",
      hint: motion === "reduced" ? "Off" : "On",
      keywords: "animation accessibility webgl graphics calm",
      run: () => {
        const next = motion === "reduced" ? "system" : "reduced";
        setMotion(next);
        return next === "reduced" ? "Motion reduced" : "Full motion restored";
      },
    },
    { id: "source", group: "Actions", label: "View this site’s source", hint: "GitHub", keywords: "code repository open source how built", external: SOURCE_URL },
    { id: "paper", group: "Elsewhere", label: "Read the paper", hint: research.journal, keywords: "research springer publication doi", external: research.url },
    { id: "github", group: "Elsewhere", label: "GitHub", hint: "@BaconKage", keywords: "code profile", external: profile.github },
    { id: "linkedin", group: "Elsewhere", label: "LinkedIn", keywords: "profile career network", external: profile.linkedin },
  );
  if (profile.resume)
    list.push({ id: "resume", group: "Elsewhere", label: "Résumé", hint: "PDF", keywords: "cv resume download", external: profile.resume });
  return list;
}

/** Every query word must appear; label matches outrank keyword matches. */
function rank(commands: Command[], query: string) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return commands;
  return commands
    .map((command, order) => {
      const label = command.label.toLowerCase();
      const haystack = `${label} ${command.hint ?? ""} ${command.keywords ?? ""} ${command.group}`.toLowerCase();
      if (!words.every((w) => haystack.includes(w))) return null;
      const score = words.reduce(
        (s, w) =>
          s +
          (label.startsWith(w) ? 4 : label.split(/\s+/).some((t) => t.startsWith(w)) ? 3 : label.includes(w) ? 2 : 1),
        0,
      );
      return { command, score, order };
    })
    .filter((x): x is { command: Command; score: number; order: number } => x !== null)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map((x) => x.command);
}

export function openPalette() {
  window.dispatchEvent(new Event("palette-open"));
}

export default function CommandPalette() {
  const path = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState("");
  const [context, setContext] = useState<Context>({ path, motion: "system", core: "idle" });
  const uid = useId();

  const results = useMemo(
    () => (open ? rank(buildCommands(context), query) : []),
    [open, context, query],
  );
  const current = Math.min(active, Math.max(0, results.length - 1));

  const show = useCallback(() => {
    const panel = dialog.current;
    if (!panel || panel.open) return;
    // Never stack over the site menu or another modal.
    if (document.querySelector("dialog[open]")) return;
    opener.current = document.activeElement;
    setContext({ path: location.pathname, motion: readMotion(), core: getCoreState().phase });
    setQuery("");
    setActive(0);
    setStatus("");
    panel.showModal();
    lockScroll("palette");
    setOpen(true);
    input.current?.focus();
  }, []);

  const close = useCallback(() => {
    unlockScroll("palette");
    dialog.current?.close();
  }, []);

  // ⌘K / Ctrl+K anywhere toggles the palette; other components can open it by event.
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (dialog.current?.open) close();
        else show();
      }
    };
    window.addEventListener("keydown", key);
    window.addEventListener("palette-open", show);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("palette-open", show);
    };
  }, [show, close]);

  useEffect(() => {
    if (dialog.current?.open) close();
  }, [path, close]);

  useEffect(() => {
    list.current
      ?.querySelector<HTMLElement>(`[data-index="${current}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [current, open]);

  function activate(index: number, element?: HTMLElement | null) {
    const command = results[index];
    if (!command) return;
    const target = element ?? list.current?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (command.href || command.external) {
      // Release the lock before the site's own link handling starts a glide or
      // curtain, so restarting smooth scroll cannot cancel it.
      close();
      command.run?.();
      if (!element) target?.click();
      return;
    }
    const message = command.run?.();
    if (message) {
      setStatus(message);
      setContext({ path: location.pathname, motion: readMotion(), core: getCoreState().phase });
    } else close();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const count = results.length;
    if (!count) return;
    if (event.key === "ArrowDown" || (event.ctrlKey && event.key === "n")) {
      event.preventDefault();
      setActive((current + 1) % count);
    } else if (event.key === "ArrowUp" || (event.ctrlKey && event.key === "p")) {
      event.preventDefault();
      setActive((current - 1 + count) % count);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(count - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      activate(current);
    }
  }

  const optionId = (i: number) => `${uid}-option-${i}`;

  return (
    <dialog
      ref={dialog}
      className="palette"
      aria-label="Command palette"
      data-lenis-prevent
      data-scroll-lock="palette"
      onClose={() => {
        unlockScroll("palette");
        setOpen(false);
        // Native dialogs restore focus; only step in if it was lost entirely.
        if (document.activeElement === document.body && opener.current instanceof HTMLElement)
          opener.current.focus({ preventScroll: true });
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="palette-panel">
        <div className="palette-search">
          <span className="palette-prompt" aria-hidden="true">›</span>
          <input
            ref={input}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={`${uid}-list`}
            aria-activedescendant={results.length ? optionId(current) : undefined}
            aria-autocomplete="list"
            aria-label="Search pages, projects and actions"
            placeholder="Jump to a project, copy my email, energise the core…"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              setStatus("");
            }}
            onKeyDown={onKeyDown}
          />
          <kbd className="palette-esc">esc</kbd>
        </div>
        <div className="palette-list" id={`${uid}-list`} role="listbox" ref={list} aria-label="Results">
          {results.length === 0 && open && (
            <p className="palette-empty">
              Nothing matches “{query}”. Try <em>work</em>, <em>email</em> or <em>audio</em>.
            </p>
          )}
          {groups.map((group) => {
            const items = results.filter((c) => c.group === group);
            if (!items.length) return null;
            return (
              <div role="group" aria-labelledby={`${uid}-${group}`} key={group} className="palette-group">
                <p className="palette-heading" id={`${uid}-${group}`} aria-hidden="true">
                  {group}
                </p>
                {items.map((command) => {
                  const i = results.indexOf(command);
                  const props = {
                    id: optionId(i),
                    role: "option",
                    "aria-selected": i === current,
                    "data-index": i,
                    "data-active": i === current ? "true" : undefined,
                    className: "palette-option",
                    tabIndex: -1,
                    onMouseMove: () => i !== current && setActive(i),
                  } as const;
                  const body = (
                    <>
                      <span className="palette-label">{command.label}</span>
                      {command.hint && <span className="palette-hint">{command.hint}</span>}
                      {command.external && <span className="palette-arrow" aria-hidden="true">↗</span>}
                    </>
                  );
                  if (command.href)
                    return (
                      <Link key={command.id} href={command.href} {...props} onClick={(e) => activate(i, e.currentTarget)}>
                        {body}
                      </Link>
                    );
                  if (command.external)
                    return (
                      <a
                        key={command.id}
                        href={command.external}
                        {...(command.external.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                        {...props}
                        onClick={(e) => activate(i, e.currentTarget)}
                      >
                        {body}
                      </a>
                    );
                  return (
                    <div key={command.id} {...props} onClick={() => activate(i)}>
                      {body}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="palette-foot">
          <span aria-hidden="true">
            <kbd>↑</kbd>
            <kbd>↓</kbd> move <kbd>↵</kbd> open
          </span>
          <span className="palette-status" role="status" aria-live="polite">
            {status}
          </span>
        </div>
      </div>
    </dialog>
  );
}

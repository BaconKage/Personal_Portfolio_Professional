"use client";
import Link from "next/link";
import { projects } from "@/data/projects";
import { buildToolkit, toolkitIndex, TOOLKIT_CATEGORIES } from "@/lib/toolkit";

const toolkit = buildToolkit(projects);
const families = toolkitIndex(toolkit);

/** Static view of the same constellation for no-JS, reduced motion and WebGL failure. */
const VIEW = { width: 900, height: 560 };
const sx = (x: number) =>
  VIEW.width / 2 + (x / toolkit.extent.x) * VIEW.width * 0.41;
const sy = (y: number) =>
  VIEW.height / 2 - (y / toolkit.extent.y) * VIEW.height * 0.38;

/**
 * Every technology in the project stacks, wired to the projects that used
 * it. The WebGL constellation is decoration over this: the list is the
 * accessible way in, and drives the same highlight.
 */
export default function Toolkit() {
  const signal = (target: HTMLElement, index: number, pin = false) =>
    target
      .closest("section")
      ?.querySelector("[data-scene='toolkit']")
      ?.dispatchEvent(
        new CustomEvent("toolkit-focus", { detail: { index, pin } }),
      );

  return (
    <section className="toolkit" id="toolkit" aria-labelledby="toolkit-title">
      <header className="toolkit-header">
        <div>
          <span className="eyebrow">05 / THE TOOLKIT</span>
          <h2 id="toolkit-title">
            Tools, wired
            <br />
            <em>to the work.</em>
          </h2>
        </div>
        <p>
          Every technology here is linked to the project that used it.
          <br />
          Hover one to trace where it went.
        </p>
      </header>
      <div className="toolkit-layout">
        <div className="toolkit-stage" data-scene="toolkit" data-cursor="drag">
          <svg
            className="toolkit-poster"
            viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
            aria-hidden="true"
          >
            {toolkit.edges.map(([tool, hub], i) => (
              <line
                key={i}
                x1={sx(toolkit.nodes[tool].x)}
                y1={sy(toolkit.nodes[tool].y)}
                x2={sx(toolkit.nodes[hub].x)}
                y2={sy(toolkit.nodes[hub].y)}
              />
            ))}
            {toolkit.nodes.map((n) => (
              <g key={n.index} transform={`translate(${sx(n.x)} ${sy(n.y)})`}>
                <circle r={n.kind === "project" ? 7 : 3.5} fill={n.color} />
                {n.kind === "project" && (
                  <text y={-16} textAnchor="middle">
                    {n.label}
                  </text>
                )}
              </g>
            ))}
          </svg>
          <div className="toolkit-labels" aria-hidden="true" data-lens-off>
            {toolkit.nodes.map((n) => (
              <span key={n.index} data-node={n.index} data-kind={n.kind}>
                {n.label}
              </span>
            ))}
          </div>
          <span className="toolkit-hint" aria-hidden="true">
            DRAG TO TURN · HOVER TO TRACE · TAP A PROJECT TO OPEN IT
          </span>
        </div>
        <div className="toolkit-index">
          {families.map((family) => (
            <div className="toolkit-family" key={family.id}>
              <p className="eyebrow">
                <i style={{ background: family.color }} /> {family.name}
              </p>
              <ul>
                {family.tools.map((tool) => (
                  <li key={tool.index}>
                    <button
                      type="button"
                      data-tool={tool.index}
                      aria-pressed="false"
                      onPointerEnter={(e) =>
                        signal(e.currentTarget, tool.index)
                      }
                      onPointerLeave={(e) => signal(e.currentTarget, -1)}
                      onFocus={(e) => signal(e.currentTarget, tool.index)}
                      onBlur={(e) => signal(e.currentTarget, -1)}
                      onClick={(e) => signal(e.currentTarget, tool.index, true)}
                    >
                      {tool.label}
                      <span className="sr-only">, used in </span>
                      <small>{tool.projects.join(" · ")}</small>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="toolkit-projects">
            <p className="eyebrow">THE PROJECTS</p>
            <ul>
              {toolkit.nodes
                .filter((n) => n.kind === "project")
                .map((n) => (
                  <li key={n.index}>
                    <Link
                      href={`/work/${n.slug}`}
                      data-toolkit-project={n.slug}
                      onPointerEnter={(e) => signal(e.currentTarget, n.index)}
                      onPointerLeave={(e) => signal(e.currentTarget, -1)}
                      onFocus={(e) => signal(e.currentTarget, n.index)}
                      onBlur={(e) => signal(e.currentTarget, -1)}
                    >
                      <i style={{ background: n.color }} />
                      {n.label}
                      <span aria-hidden="true">↗</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>
      <p className="sr-only">
        {TOOLKIT_CATEGORIES.length} families of tools across {projects.length}{" "}
        projects.
      </p>
    </section>
  );
}

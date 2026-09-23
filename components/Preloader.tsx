/**
 * Painted with the first HTML so the hero never flashes before the intro.
 * While the page loads, a blueprint of the reactor draws itself part by part,
 * driven by CoreIgnition through the --p custom property (0..1). CSS hides it
 * for no-JS, reduced motion, and (as a failsafe) if scripts never take over.
 */

const SEGMENTS = 20;
const SLOTS = 30;
const TICKS = 72;
const TUNNEL = [100, 92.5, 85, 77.5, 70];

/** Each part draws over a slice of the load, starting at `s`. */
const at = (start: number) => ({ "--s": start }) as React.CSSProperties;

export default function Preloader() {
  return (
    <div className="preloader">
      <noscript>
        <style>{".preloader{display:none!important}"}</style>
      </noscript>
      <span className="preloader-mark eyebrow" aria-hidden="true">
        SV / CORE SYSTEMS
      </span>
      <svg
        className="preloader-reactor"
        viewBox="-270 -270 540 540"
        aria-hidden="true"
      >
        {/* Frame: crosshairs, measuring ticks and the housing. */}
        <g className="bp-faint">
          <line
            x1="-262"
            y1="0"
            x2="262"
            y2="0"
            pathLength={1}
            data-draw
            style={at(0)}
          />
          <line
            x1="0"
            y1="-262"
            x2="0"
            y2="262"
            pathLength={1}
            data-draw
            style={at(0.02)}
          />
          {Array.from({ length: TICKS }, (_, i) => (
            <line
              key={i}
              x1="0"
              y1={i % 6 === 0 ? -256 : -252}
              x2="0"
              y2="-247"
              transform={`rotate(${(i / TICKS) * 360})`}
              data-fade
              style={at(0.02 + (i / TICKS) * 0.12)}
            />
          ))}
        </g>
        <circle r="240" pathLength={1} data-draw style={at(0.06)} />
        <circle r="232" pathLength={1} data-draw style={at(0.1)} />
        {/* Outer ring: coils (wound) alternating with glass blocks. */}
        {Array.from({ length: SEGMENTS }, (_, k) => {
          const start = 0.2 + (k / SEGMENTS) * 0.3;
          return (
            <g key={k} transform={`rotate(${(k / SEGMENTS) * 360})`}>
              {k % 2 === 0 ? (
                <>
                  <rect
                    x="-25"
                    y="-238"
                    width="50"
                    height="80"
                    rx="4"
                    pathLength={1}
                    data-draw
                    style={at(start)}
                  />
                  {[-15, -7.5, 0, 7.5, 15].map((x) => (
                    <line
                      key={x}
                      x1={x}
                      y1="-231"
                      x2={x}
                      y2="-165"
                      className="bp-faint"
                      data-fade
                      style={at(start + 0.04)}
                    />
                  ))}
                </>
              ) : (
                <>
                  <rect
                    x="-23"
                    y="-234"
                    width="46"
                    height="72"
                    rx="8"
                    pathLength={1}
                    data-draw
                    style={at(start)}
                  />
                  <rect
                    x="-15"
                    y="-226"
                    width="30"
                    height="56"
                    rx="5"
                    className="bp-glow"
                    data-fade
                    style={at(start + 0.05)}
                  />
                </>
              )}
            </g>
          );
        })}
        {/* Slotted inner ring and its three clamp brackets. */}
        <circle r="152" pathLength={1} data-draw style={at(0.5)} />
        <circle r="108" pathLength={1} data-draw style={at(0.54)} />
        {Array.from({ length: SLOTS }, (_, i) => (
          <rect
            key={i}
            x="-4.5"
            y="-139"
            width="9"
            height="17"
            rx="4.5"
            transform={`rotate(${(i / SLOTS) * 360 + 6})`}
            className="bp-glow"
            data-fade
            style={at(0.56 + (i / SLOTS) * 0.12)}
          />
        ))}
        {[0, 120, 240].map((deg, i) => (
          <g key={deg} transform={`rotate(${deg})`}>
            <rect
              x="-18"
              y="-122"
              width="36"
              height="28"
              rx="2"
              pathLength={1}
              data-draw
              style={at(0.66 + i * 0.02)}
            />
            {[-114, -107, -100].map((y) => (
              <line
                key={y}
                x1="-13"
                y1={y}
                x2="13"
                y2={y}
                className="bp-faint"
                data-fade
                style={at(0.7 + i * 0.02)}
              />
            ))}
          </g>
        ))}
        {/* The tunnel steps inward to the bezel. */}
        {TUNNEL.map((r, i) => (
          <circle
            key={r}
            r={r}
            pathLength={1}
            data-draw
            className="bp-glow"
            style={at(0.7 + i * 0.025)}
          />
        ))}
        <circle r="64" pathLength={1} data-draw style={at(0.8)} />
        {/* Last: the monogram powers on. */}
        <text className="bp-monogram" x="0" y="4" data-fade style={at(0.84)}>
          SV
        </text>
      </svg>
      <span className="preloader-spec eyebrow" aria-hidden="true">
        ARC CORE — ASSEMBLY
      </span>
      <span className="preloader-count" aria-hidden="true">
        000
      </span>
      <span className="sr-only" role="status">
        Loading
      </span>
      <button className="preloader-skip eyebrow" type="button">
        Skip intro ↗
      </button>
    </div>
  );
}

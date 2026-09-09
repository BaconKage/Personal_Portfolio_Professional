import { useId } from "react";
export type SceneId =
  | "hero"
  | "mygym"
  | "vanicert"
  | "firstdrop-ai"
  | "bhashabuddy"
  | "posture-engine";

/** Original vector compositions: the complete visual baseline, independent of JS/GPU. */
export default function Artwork({
  scene,
  className = "",
}: {
  scene: SceneId;
  className?: string;
}) {
  const id = useId().replaceAll(":", "");
  const grad = `${id}-gradient`;
  const metal = `${id}-metal`;
  return (
    <svg
      className={`artwork ${className}`}
      viewBox="0 0 1200 800"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={grad}
          x1="200"
          y1="100"
          x2="950"
          y2="750"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={scene === "firstdrop-ai" ? "#ffc6a8" : "#93b4ff"} />
          <stop
            offset=".38"
            stopColor={scene === "firstdrop-ai" ? "#de7959" : "#3158ff"}
          />
          <stop offset="1" stopColor="#101d72" />
        </linearGradient>
        <linearGradient
          id={metal}
          x1="300"
          y1="150"
          x2="800"
          y2="700"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f1f3f9" />
          <stop offset=".4" stopColor="#9cabc3" />
          <stop offset=".8" stopColor="#3b4862" />
          <stop offset="1" stopColor="#bac6dc" />
        </linearGradient>
      </defs>
      {scene === "hero" && (
        <g>
          {Array.from({ length: 30 }, (_, i) => {
            const x = (i % 6) * 230 - 20,
              y = Math.floor(i / 6) * 195 - 15;
            const d = "M-22-70H22V-22H70V22H22V70H-22V22H-70V-22H-22Z";
            return (
              <g
                key={i}
                transform={`translate(${x} ${y}) rotate(${i * 37}) scale(${0.85 + (i % 4) * 0.14})`}
              >
                <path
                  d={d}
                  transform="translate(12 18)"
                  fill={i % 3 === 0 ? "#152689" : "#424b60"}
                  stroke="#12151d"
                  strokeWidth="6"
                  strokeLinejoin="round"
                />
                <path
                  d={d}
                  fill={
                    i % 3 === 0
                      ? "#244cff"
                      : i % 3 === 1
                        ? "#a3b0c4"
                        : "#d1d7e1"
                  }
                  stroke={i % 3 === 0 ? "#5273ff" : "#e3e8ef"}
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
                <ellipse
                  rx="13"
                  ry="17"
                  fill="#141a26"
                  stroke="#657795"
                  strokeWidth="3"
                />
              </g>
            );
          })}
        </g>
      )}
      {scene === "mygym" && (
        <g transform="translate(600 340)">
          <ellipse cy="310" rx="410" ry="50" fill="#000" opacity=".18" />
          {Array.from({ length: 7 }, (_, i) => {
            const x = ((i % 3) - 1) * 225,
              y = Math.floor(i / 3) * 125 - 145;
            return (
              <g key={i} transform={`translate(${x} ${y})`}>
                <path
                  d="M-95 0 0-53 95 0 0 53Z"
                  fill={i === 3 ? `url(#${grad})` : `url(#${metal})`}
                  stroke="#ced9f7"
                  strokeOpacity=".5"
                />
                <path
                  d="M-95 0 0 53 0 122-95 69Z"
                  fill={i === 3 ? "#2549db" : "#414e66"}
                />
                <path
                  d="M0 53 95 0 95 69 0 122Z"
                  fill={i === 3 ? "#15309c" : "#697c9a"}
                />
                <path
                  d="M-95 55 0 108 95 55"
                  stroke="#5a83ff"
                  strokeWidth="2"
                />
                <path
                  d="M-44 0 0-25 44 0 0 25Z"
                  stroke="#dfe7ff"
                  strokeWidth="1.5"
                />
                <circle cy="0" r="5" fill={i === 3 ? "#b9f77d" : "#dbe5ff"} />
              </g>
            );
          })}
          <path
            d="M-225-20 0 105 225-20M0 105V230"
            stroke="#b8d4ff"
            strokeWidth="3"
          />
        </g>
      )}
      {scene === "vanicert" && (
        <g transform="translate(600 400) rotate(-16)">
          {Array.from({ length: 110 }, (_, i) => {
            const x = (i - 55) * 8,
              h = 30 + Math.abs(Math.sin(i * 0.17) * Math.cos(i * 0.037)) * 210;
            return (
              <path
                key={i}
                d={`M${x} ${-h} Q${x + 42} 0 ${x} ${h}`}
                stroke={`url(#${grad})`}
                strokeWidth="3"
                opacity={0.4 + Math.sin(i * 0.07) ** 2 * 0.6}
              />
            );
          })}
          <ellipse rx="185" ry="260" stroke="#c5d5ff" strokeWidth="1" />
          <ellipse rx="191" ry="266" stroke="#7e9bff" strokeOpacity=".25" />
        </g>
      )}
      {scene === "firstdrop-ai" && (
        <g>
          {[0, 1].map((side) => (
            <g
              key={side}
              transform={`translate(${side ? 810 : 390} ${side ? 440 : 350}) rotate(${side ? 25 : -25})`}
            >
              {Array.from({ length: 30 }, (_, i) => (
                <ellipse
                  key={i}
                  rx={70 + i * 2.8}
                  ry={140 + i * 2.7}
                  transform={`rotate(${i * 3})`}
                  stroke={side ? `url(#${grad})` : `url(#${metal})`}
                  strokeWidth="1.8"
                  opacity=".8"
                />
              ))}
            </g>
          ))}
          {Array.from({ length: 25 }, (_, i) => (
            <circle
              key={i}
              cx={470 + i * 11}
              cy={395 + Math.sin(i * 0.2) * 45}
              r={2 + (i % 3)}
              fill="#e3a78c"
              opacity=".6"
            />
          ))}
        </g>
      )}
      {scene === "bhashabuddy" && (
        <g transform="translate(600 400) rotate(-12)">
          {[0, 1, 2, 3].map((n) => (
            <ellipse
              key={n}
              rx={230 + n * 65}
              ry={75 + n * 45}
              stroke="#244cff"
              strokeOpacity={0.12 + n * 0.06}
              transform={`rotate(${n * 32})`}
            />
          ))}
          {["अ", "அ", "అ", "ಅ"].map((glyph, i) => (
            <text
              key={glyph}
              x={[-290, 0, 200, -30][i]}
              y={[50, -110, 100, 240][i]}
              fill={i === 1 ? "#db7348" : "#244cff"}
              fontSize={150 + i * 13}
              fontFamily="sans-serif"
              textAnchor="middle"
            >
              {glyph}
            </text>
          ))}
          <circle cx="285" cy="-130" r="20" fill="#dc7954" />
          <circle cx="-190" cy="-200" r="10" fill="#244cff" />
        </g>
      )}
      {scene === "posture-engine" && (
        <g transform="translate(600 360)">
          <circle cy="-170" r="39" stroke="#c0ed91" strokeWidth="3" />
          <path
            d="M0-130V45M-110-85H110M-110-85-160 35-110 115M110-85 160 35 110 115M-60 45H60M-60 45-100 180-60 290M60 45 100 180 60 290"
            stroke="#c0ed91"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {[
            [-110, -85],
            [110, -85],
            [0, -85],
            [-160, 35],
            [160, 35],
            [-60, 45],
            [60, 45],
            [-100, 180],
            [100, 180],
            [-60, 290],
            [60, 290],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="8" fill="#e7ffc9" />
          ))}
          <path
            d="M-78 140A48 48 0 0 0-2 176M78 140A48 48 0 0 1 2 176"
            stroke="#c0ed91"
            strokeDasharray="4 6"
          />
          <rect
            x="-240"
            y="-240"
            width="480"
            height="590"
            rx="12"
            stroke="#c0ed91"
            strokeOpacity=".18"
            strokeDasharray="8 12"
          />
        </g>
      )}
    </svg>
  );
}

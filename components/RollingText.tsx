/**
 * Letters roll up to an identical copy when the nearest link or button is
 * hovered or focused. Pure CSS; screen readers get the plain text once.
 */
export default function RollingText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <span className={`roll ${className}`}>
      <span className="roll-word" aria-hidden="true">
        {Array.from(text).map((letter, i) => {
          const glyph = letter === " " ? " " : letter;
          return (
            <span className="roll-cell" key={i}>
              <span
                className="roll-letter"
                style={{ "--letter-index": i } as React.CSSProperties}
              >
                <span>{glyph}</span>
                <span>{glyph}</span>
              </span>
            </span>
          );
        })}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}

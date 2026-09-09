export default function KineticText({ text }: { text: string }) {
  return (
    <>
      <span className="kinetic-word" aria-hidden="true">
        {Array.from(text).map((letter, i) => (
          <span className="kinetic-cell" key={i}>
            <span
              className="kinetic-letter"
              style={{ "--letter-index": i } as React.CSSProperties}
            >
              <span>{letter === " " ? "\u00a0" : letter}</span>
              <span className="letter-copy">
                {letter === " " ? "\u00a0" : letter}
              </span>
            </span>
          </span>
        ))}
      </span>
      <span className="sr-only">{text}</span>
    </>
  );
}

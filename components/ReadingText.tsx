export default function ReadingText({ text }: { text: string }) {
  return <><span aria-hidden="true">{text.split(' ').map((word,i)=><span key={i} className="reading-word">{word}{' '}</span>)}</span><span className="sr-only">{text}</span></>;
}

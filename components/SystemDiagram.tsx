/** MyGym's two clients feed its API; other diagrams read top to bottom. */
export default function SystemDiagram({
  nodes,
  caption,
}: {
  nodes: string[];
  caption: string;
}) {
  const parallel = nodes[0].startsWith("Web console");
  return (
    <figure className={`system-diagram ${parallel ? "diagram-parallel" : ""}`}>
      <ol className="diagram-nodes">
        {nodes.map((node, i) => (
          <li className="diagram-node" key={node}>
            <span className="eyebrow">0{i + 1}</span>
            <strong>{node.split(" / ")[0]}</strong>
            {node.includes(" / ") && <span>{node.split(" / ")[1]}</span>}
            {i < nodes.length - 1 && <b aria-hidden="true">↓</b>}
          </li>
        ))}
      </ol>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export default function Laden() {
  return (
    <div className="p-wrap p-results" aria-busy="true" aria-label="Resultaten worden geladen">
      <div className="p-stack">{[1, 2, 3, 4].map(i => <div key={i} className="p-skel" style={{ height: 24 }} />)}</div>
      <div className="p-stack">{[1, 2, 3].map(i => <div key={i} className="p-skel" style={{ height: 170, borderRadius: 22 }} />)}</div>
    </div>
  );
}

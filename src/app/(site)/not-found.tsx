import Link from 'next/link';
export default function NietGevonden() {
  return (
    <div className="p-narrow" style={{ maxWidth: 620, padding: '56px 26px 80px' }}>
      <h1 className="p-h2" style={{ marginBottom: 10 }}>Deze pagina bestaat niet (meer)</h1>
      <p style={{ marginBottom: 18 }}>Misschien is de opdracht gesloten of het profiel verwijderd.</p>
      <div className="p-row"><Link className="btn btn-blue" href="/opdrachten">Bekijk opdrachten</Link><Link className="btn btn-line" href="/freelancers-zoeken">Zoek freelancers</Link></div>
    </div>
  );
}

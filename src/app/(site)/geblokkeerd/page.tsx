export const metadata = { title: 'Account geblokkeerd', robots: { index: false } };
export default async function Page() {
  return (
    <div className="p-narrow" style={{ maxWidth: 620, padding: '48px 26px 72px' }}>
      <h1 className="p-h2" style={{ marginBottom: 10 }}>Je account is geblokkeerd</h1>
      <p style={{ marginBottom: 12 }}>Je kunt op dit moment niet inloggen. In de e-mail die we je stuurden staat de reden.</p>
      <p className="p-muted">Ben je het er niet mee eens? Mail naar <a className="p-link" href="mailto:info@holland-recruitment.nl">info@holland-recruitment.nl</a> met je toelichting. We reageren binnen vijf werkdagen.</p>
    </div>
  );
}

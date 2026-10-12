import { VergetenForm } from '@/components/ResetForms';
export const metadata = { title: 'Wachtwoord vergeten', robots: { index: false } };
export default function Page() {
  return (
    <div className="p-narrow" style={{ maxWidth: 520, padding: '40px 26px 64px' }}>
      <h1 className="p-h2" style={{ marginBottom: 8 }}>Wachtwoord vergeten</h1>
      <p className="p-muted" style={{ marginBottom: 18 }}>Vul je e-mailadres in. We sturen je een link om een nieuw wachtwoord te kiezen.</p>
      <VergetenForm />
    </div>
  );
}

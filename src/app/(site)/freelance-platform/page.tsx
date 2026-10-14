import { permanentRedirect } from 'next/navigation';
// Sinds V31 staat het platform op de home (optie A uit de audit van 14-10-2026).
export default function Page() { permanentRedirect('/'); }

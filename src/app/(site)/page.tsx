import { redirect } from 'next/navigation';
// Op www.holland-recruitment.nl serveert de bestaande website "/". Op het eigen platformdomein (preview) gaat "/" naar de platform-home.
export default function Root() { redirect('/freelance-platform'); }

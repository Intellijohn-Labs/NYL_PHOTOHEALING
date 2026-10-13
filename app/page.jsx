import { redirect } from 'next/navigation';
import Dashboard from '../components/Dashboard';
import { currentHealer } from '../lib/server';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const healer = await currentHealer();
  if (!healer) redirect('/login');
  return <Dashboard healerName={healer.name} />;
}

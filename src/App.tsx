import { useState, useCallback } from 'react';
import { Home } from './pages/Home';
import { MeetingRoom } from './components/MeetingRoom';

const TOKEN_SERVER = import.meta.env.VITE_TOKEN_SERVER ?? 'http://localhost:3001';

interface Session {
  meetingId: string;
  name: string;
  token: string;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = useCallback(async (meetingId: string, name: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${TOKEN_SERVER}/token?room=${encodeURIComponent(meetingId)}&username=${encodeURIComponent(name)}`
      );
      if (!res.ok) throw new Error('Failed to get token from server');
      const { token } = await res.json() as { token: string };
      setSession({ meetingId, name, token });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect — is the token server running?');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLeave = useCallback(() => setSession(null), []);

  if (session) {
    return (
      <MeetingRoom
        meetingId={session.meetingId}
        localName={session.name}
        token={session.token}
        onLeave={handleLeave}
      />
    );
  }

  return <Home onJoin={handleJoin} loading={loading} error={error} />;
}

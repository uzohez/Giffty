import { useState } from 'react';

interface HomeProps {
  onJoin: (meetingId: string, name: string) => void;
  loading?: boolean;
  error?: string;
}

export function Home({ onJoin, loading, error }: HomeProps) {
  const [name, setName] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [tab, setTab] = useState<'new' | 'join'>('new');
  const [validationError, setValidationError] = useState('');

  const generateId = () =>
    Array.from({ length: 3 }, () => Math.random().toString(36).slice(2, 5)).join('-');

  const handleSubmit = () => {
    if (!name.trim()) { setValidationError('Please enter your name'); return; }
    if (tab === 'join' && !meetingId.trim()) { setValidationError('Please enter a meeting ID'); return; }
    setValidationError('');
    onJoin(tab === 'new' ? generateId() : meetingId.trim(), name.trim());
  };

  const displayError = validationError || error;

  return (
    <div style={s.root}>
      <div style={s.bg} />
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.logoIcon}>📹</div>
          <div>
            <div style={s.logoTitle}>Giffty</div>
            <div style={s.logoSub}>HD Video Conferencing</div>
          </div>
        </div>

        <div style={s.tabs}>
          {(['new', 'join'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setValidationError(''); }}
              style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}
            >
              {t === 'new' ? '+ New Meeting' : '🔗 Join Meeting'}
            </button>
          ))}
        </div>

        <div style={s.form}>
          <label style={s.label}>Your name</label>
          <input
            style={s.input}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter your name"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
            disabled={loading}
          />

          {tab === 'join' && (
            <>
              <label style={s.label}>Meeting ID</label>
              <input
                style={s.input}
                value={meetingId}
                onChange={e => setMeetingId(e.target.value)}
                placeholder="e.g. abc-def-ghi"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                disabled={loading}
              />
            </>
          )}

          {tab === 'new' && (
            <div style={s.hint}>A unique meeting ID will be generated for you to share.</div>
          )}

          {displayError && <div style={s.error}>{displayError}</div>}

          <button
            style={{ ...s.primaryBtn, opacity: loading ? 0.6 : 1 }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Connecting…' : tab === 'new' ? 'Start Meeting' : 'Join Meeting'}
          </button>
        </div>

        <div style={s.features}>
          {[
            { icon: '🔒', text: 'End-to-end encrypted' },
            { icon: '📺', text: 'HD video & audio' },
            { icon: '💬', text: 'Real-time chat' },
          ].map(f => (
            <div key={f.text} style={s.feature}>
              <span style={{ fontSize: 18 }}>{f.icon}</span>
              <span style={s.featureText}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>
      <p style={s.footer}>Built with React + LiveKit + WebRTC</p>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: '#0d0f14', fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: '#e8eaf0', padding: 20, position: 'relative', overflow: 'hidden',
  },
  bg: {
    position: 'absolute', width: 600, height: 600, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(79,110,247,0.08) 0%, transparent 70%)',
    top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none',
  },
  card: {
    background: '#181b22', border: '0.5px solid #2e3340', borderRadius: 16,
    padding: '36px 40px', width: '100%', maxWidth: 440, position: 'relative', zIndex: 1,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 },
  logoIcon: {
    width: 48, height: 48, background: 'rgba(79,110,247,0.15)',
    border: '0.5px solid rgba(79,110,247,0.4)', borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
  },
  logoTitle: { fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px' },
  logoSub: { fontSize: 12, color: '#8b90a0', marginTop: 2 },
  tabs: {
    display: 'flex', gap: 4, background: '#22262f',
    borderRadius: 10, padding: 4, marginBottom: 24,
  },
  tab: {
    flex: 1, padding: '9px 0', border: 'none', borderRadius: 7,
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
    background: 'none', color: '#8b90a0', transition: 'all 0.15s',
  },
  tabActive: { background: '#2d3245', color: '#e8eaf0', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' },
  form: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 12, color: '#8b90a0', fontWeight: 500 },
  input: {
    background: '#22262f', border: '0.5px solid #2e3340', color: '#e8eaf0',
    borderRadius: 8, padding: '12px 14px', fontSize: 14, outline: 'none',
    fontFamily: 'inherit', transition: 'border-color 0.15s',
  },
  hint: { fontSize: 12, color: '#8b90a0', lineHeight: 1.5, marginTop: 2 },
  error: {
    fontSize: 12, color: '#e54b4b', background: 'rgba(229,75,75,0.1)',
    border: '0.5px solid rgba(229,75,75,0.3)', borderRadius: 6, padding: '8px 12px',
  },
  primaryBtn: {
    background: '#4f6ef7', border: 'none', color: '#fff', borderRadius: 9,
    padding: '13px 0', fontSize: 15, fontWeight: 600, cursor: 'pointer',
    marginTop: 6, transition: 'opacity 0.15s',
  },
  features: {
    display: 'flex', justifyContent: 'space-between', marginTop: 28,
    paddingTop: 20, borderTop: '0.5px solid #2e3340',
  },
  feature: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 },
  featureText: { fontSize: 11, color: '#8b90a0', textAlign: 'center' },
  footer: { fontSize: 12, color: '#555', marginTop: 24, position: 'relative', zIndex: 1 },
};

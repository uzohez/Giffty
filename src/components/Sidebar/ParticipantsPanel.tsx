import { useParticipants, useLocalParticipant } from '@livekit/components-react';

export function ParticipantsPanel() {
  const participants = useParticipants();
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled } = useLocalParticipant();

  const all = [
    { identity: localParticipant.identity, name: localParticipant.name ?? localParticipant.identity, isMuted: !isMicrophoneEnabled, isVideoOff: !isCameraEnabled, isHost: true },
    ...participants
      .filter(p => p.identity !== localParticipant.identity)
      .map(p => ({
        identity: p.identity,
        name: p.name ?? p.identity,
        isMuted: !p.isMicrophoneEnabled,
        isVideoOff: !p.isCameraEnabled,
        isHost: false,
      })),
  ];

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={s.sectionLabel}>In meeting · {all.length}</div>
      {all.map(p => (
        <div key={p.identity} style={s.row}>
          <div style={{ ...s.avatar, background: avatarBg(p.name), color: avatarColor(p.name) }}>
            {initials(p.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.name}>
              {p.name}
              {p.isHost && <span style={s.hostBadge}>Host</span>}
            </div>
          </div>
          <div style={s.icons}>
            <span title={p.isMuted ? 'Muted' : 'Mic on'} style={{ fontSize: 13 }}>{p.isMuted ? '🔇' : '🎤'}</span>
            <span title={p.isVideoOff ? 'Camera off' : 'Camera on'} style={{ fontSize: 13 }}>{p.isVideoOff ? '📵' : '📹'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const COLORS = ['#4f6ef7','#22c55e','#e54b4b','#7c3aed','#f59e0b','#06b6d4'];
const BG = ['rgba(79,110,247,.15)','rgba(34,197,94,.15)','rgba(229,75,75,.15)','rgba(124,58,237,.15)','rgba(245,158,11,.15)','rgba(6,182,212,.15)'];
const idx = (name: string) => (name.charCodeAt(0) + (name.charCodeAt(1) ?? 0)) % 6;
const avatarColor = (n: string) => COLORS[idx(n)];
const avatarBg = (n: string) => BG[idx(n)];
const initials = (n: string) => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const s: Record<string, React.CSSProperties> = {
  sectionLabel: { fontSize: 11, color: '#8b90a0', padding: '4px 8px 8px', fontWeight: 500, letterSpacing: '.04em', textTransform: 'uppercase' },
  row: { display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', borderRadius: 7 },
  avatar: { width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 },
  name: { fontSize: 12, fontWeight: 500, color: '#e8eaf0', display: 'flex', gap: 6, alignItems: 'center' },
  hostBadge: { fontSize: 10, background: 'rgba(79,110,247,.2)', color: '#4f6ef7', padding: '1px 6px', borderRadius: 4 },
  icons: { display: 'flex', gap: 4, alignItems: 'center' },
};

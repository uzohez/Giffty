import { useState } from 'react';
import { useParticipants, useLocalParticipant } from '@livekit/components-react';
import type { HostAction } from '../../types';

interface ParticipantsPanelProps {
  hasHostRights: boolean;
  isHost: boolean;
  cohosts: string[];
  admittedParticipants: string[];
  localIdentity: string;
  sendHostAction: (action: HostAction) => void;
}

export function ParticipantsPanel({
  hasHostRights, isHost, cohosts, admittedParticipants, localIdentity, sendHostAction,
}: ParticipantsPanelProps) {
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled } = useLocalParticipant();
  const allParticipants = useParticipants();

  // Exclude self from remote list
  const remoteParticipants = allParticipants.filter(p => p.identity !== localIdentity);

  // Split remote into waiting and active
  const waiting = remoteParticipants.filter(p => !admittedParticipants.includes(p.identity));
  const active = remoteParticipants.filter(p => admittedParticipants.includes(p.identity));

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Waiting room section — only visible to host/cohost */}
      {hasHostRights && waiting.length > 0 && (
        <div style={s.section}>
          <div style={{ ...s.sectionLabel, color: '#f59e0b' }}>
            ⏳ Waiting · {waiting.length}
          </div>
          {waiting.map(p => (
            <div key={p.identity} style={s.row}>
              <div style={{ ...s.avatar, background: avatarBg(p.name ?? p.identity), color: avatarColor(p.name ?? p.identity) }}>
                {initials(p.name ?? p.identity)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.name}>{p.name ?? p.identity}</div>
              </div>
              <button style={s.admitBtn} onClick={() => sendHostAction({ type: 'ADMIT', targetIdentity: p.identity })}>
                Admit
              </button>
              <button style={s.denyBtn} onClick={() => sendHostAction({ type: 'DENY', targetIdentity: p.identity })}>
                ✕
              </button>
            </div>
          ))}
          <div style={s.sectionDivider} />
        </div>
      )}

      {/* Active participants */}
      <div style={s.sectionLabel}>In meeting · {active.length + 1}</div>

      {/* Local user */}
      <ParticipantRow
        name={(localParticipant.name ?? localIdentity).split('-')[0]}
        identity={localIdentity}
        isMuted={!isMicrophoneEnabled}
        isVideoOff={!isCameraEnabled}
        isHost={isHost}
        isCohost={cohosts.includes(localIdentity)}
        isLocal={true}
        hasHostRights={false}
        sendHostAction={sendHostAction}
        cohosts={cohosts}
      />

      {/* Active remote participants */}
      {active.map(p => (
        <ParticipantRow
          key={p.identity}
          name={(p.name ?? p.identity).split('-')[0]}
          identity={p.identity}
          isMuted={!p.isMicrophoneEnabled}
          isVideoOff={!p.isCameraEnabled}
          isHost={false}
          isCohost={cohosts.includes(p.identity)}
          isLocal={false}
          hasHostRights={hasHostRights}
          sendHostAction={sendHostAction}
          cohosts={cohosts}
        />
      ))}
    </div>
  );
}

interface RowProps {
  name: string;
  identity: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isHost: boolean;
  isCohost: boolean;
  isLocal: boolean;
  hasHostRights: boolean;
  cohosts: string[];
  sendHostAction: (action: HostAction) => void;
}

function ParticipantRow({ name, identity, isMuted, isVideoOff, isHost, isCohost, isLocal, hasHostRights, sendHostAction }: RowProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={s.row}>
      <div style={{ ...s.avatar, background: avatarBg(name), color: avatarColor(name) }}>
        {initials(name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={s.name}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}{isLocal ? ' (You)' : ''}
          </span>
          {isHost && <span style={s.hostBadge}>Host</span>}
          {isCohost && !isHost && <span style={s.cohostBadge}>Co-host</span>}
        </div>
      </div>
      <div style={s.icons}>
        <span style={{ fontSize: 12 }}>{isMuted ? '🔇' : '🎤'}</span>
        <span style={{ fontSize: 12 }}>{isVideoOff ? '📵' : '📹'}</span>

        {hasHostRights && !isLocal && (
          <div style={{ position: 'relative' }}>
            <button style={s.menuTrigger} onClick={() => setMenuOpen(v => !v)}>⋮</button>
            {menuOpen && (
              <>
                <div style={s.backdrop} onClick={() => setMenuOpen(false)} />
                <div style={s.menu}>
                  <div style={s.menuHeader}>{name}</div>
                  <button style={s.menuItem} onClick={() => { sendHostAction({ type: isMuted ? 'UNMUTE_REQUEST' : 'MUTE', targetIdentity: identity }); setMenuOpen(false); }}>
                    {isMuted ? '🎙️ Ask to Unmute' : '🔇 Mute'}
                  </button>
                  <button style={s.menuItem} onClick={() => { sendHostAction({ type: isVideoOff ? 'START_VIDEO_REQUEST' : 'STOP_VIDEO', targetIdentity: identity }); setMenuOpen(false); }}>
                    {isVideoOff ? '📹 Ask to Start Video' : '📵 Stop Video'}
                  </button>
                  <div style={s.menuDivider} />
                  <button style={s.menuItem} onClick={() => { sendHostAction({ type: isCohost ? 'REMOVE_COHOST' : 'MAKE_COHOST', targetIdentity: identity }); setMenuOpen(false); }}>
                    {isCohost ? '👤 Remove Co-host' : '👑 Make Co-host'}
                  </button>
                  <div style={s.menuDivider} />
                  <button style={{ ...s.menuItem, color: '#e54b4b' }} onClick={() => { sendHostAction({ type: 'REMOVE_PARTICIPANT', targetIdentity: identity }); setMenuOpen(false); }}>
                    🚫 Remove from meeting
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const COLORS = ['#4f6ef7','#22c55e','#e54b4b','#7c3aed','#f59e0b','#06b6d4'];
const BG = ['rgba(79,110,247,.15)','rgba(34,197,94,.15)','rgba(229,75,75,.15)','rgba(124,58,237,.15)','rgba(245,158,11,.15)','rgba(6,182,212,.15)'];
const cidx = (n: string) => (n.charCodeAt(0) + (n.charCodeAt(1) ?? 0)) % 6;
const avatarColor = (n: string) => COLORS[cidx(n)];
const avatarBg = (n: string) => BG[cidx(n)];
const initials = (n: string) => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const s: Record<string, React.CSSProperties> = {
  section: { marginBottom: 8 },
  sectionDivider: { height: 0.5, background: '#2e3340', margin: '8px 0' },
  sectionLabel: { fontSize: 11, color: '#8b90a0', padding: '4px 8px 6px', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' },
  row: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 7 },
  avatar: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 },
  name: { fontSize: 12, fontWeight: 500, color: '#e8eaf0', display: 'flex', gap: 5, alignItems: 'center' },
  hostBadge: { fontSize: 9, background: 'rgba(79,110,247,.2)', color: '#4f6ef7', padding: '1px 5px', borderRadius: 4, whiteSpace: 'nowrap' },
  cohostBadge: { fontSize: 9, background: 'rgba(34,197,94,.2)', color: '#22c55e', padding: '1px 5px', borderRadius: 4, whiteSpace: 'nowrap' },
  icons: { display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0 },
  admitBtn: { background: '#4f6ef7', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  denyBtn: { background: 'rgba(229,75,75,0.15)', border: '0.5px solid #e54b4b', color: '#e54b4b', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' },
  menuTrigger: { background: 'none', border: 'none', color: '#8b90a0', cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1 },
  backdrop: { position: 'fixed', inset: 0, zIndex: 10 },
  menu: { position: 'absolute', right: 0, top: '100%', background: '#22262f', border: '0.5px solid #2e3340', borderRadius: 10, zIndex: 20, minWidth: 185, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' },
  menuHeader: { fontSize: 11, color: '#8b90a0', padding: '10px 14px 6px', fontWeight: 600, borderBottom: '0.5px solid #2e3340' },
  menuItem: { display: 'block', width: '100%', padding: '9px 14px', background: 'none', border: 'none', color: '#e8eaf0', fontSize: 12, cursor: 'pointer', textAlign: 'left' },
  menuDivider: { height: 0.5, background: '#2e3340' },
};

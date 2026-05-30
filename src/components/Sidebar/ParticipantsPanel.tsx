import { useState } from 'react';
import { useParticipants, useLocalParticipant } from '@livekit/components-react';
import type { Participant } from 'livekit-client';
import type { HostAction } from '../../types';

interface ParticipantsPanelProps {
  hasHostRights: boolean;
  isHost: boolean;
  cohosts: string[];
  localIdentity: string;
  sendHostAction: (action: HostAction) => void;
}

export function ParticipantsPanel({ hasHostRights, isHost, cohosts, localIdentity, sendHostAction }: ParticipantsPanelProps) {
  const participants = useParticipants();
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled } = useLocalParticipant();

  const remoteParticipants = participants.filter(p => p.identity !== localIdentity);

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={s.sectionLabel}>In meeting · {remoteParticipants.length + 1}</div>

      {/* Local participant */}
      <ParticipantRow
        name={localParticipant.name ?? localIdentity}
        identity={localIdentity}
        isMuted={!isMicrophoneEnabled}
        isVideoOff={!isCameraEnabled}
        isHost={isHost}
        isCohost={cohosts.includes(localIdentity)}
        isLocal={true}
        hasHostRights={false}
        sendHostAction={sendHostAction}
      />

      {/* Remote participants */}
      {remoteParticipants.map(p => (
        <ParticipantRow
          key={p.identity}
          name={p.name ?? p.identity}
          identity={p.identity}
          isMuted={!p.isMicrophoneEnabled}
          isVideoOff={!p.isCameraEnabled}
          isHost={false}
          isCohost={cohosts.includes(p.identity)}
          isLocal={false}
          hasHostRights={hasHostRights}
          participant={p}
          sendHostAction={sendHostAction}
        />
      ))}
    </div>
  );
}

interface ParticipantRowProps {
  name: string;
  identity: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isHost: boolean;
  isCohost: boolean;
  isLocal: boolean;
  hasHostRights: boolean;
  participant?: Participant;
  sendHostAction: (action: HostAction) => void;
}

function ParticipantRow({ name, identity, isMuted, isVideoOff, isHost, isCohost, isLocal, hasHostRights, sendHostAction }: ParticipantRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={s.row}>
      <div style={{ ...s.avatar, background: avatarBg(name), color: avatarColor(name) }}>
        {initials(name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={s.name}>
          {name}{isLocal ? ' (You)' : ''}
          {isHost && <span style={s.hostBadge}>Host</span>}
          {isCohost && !isHost && <span style={s.cohostBadge}>Co-host</span>}
        </div>
      </div>
      <div style={s.icons}>
        <span title={isMuted ? 'Muted' : 'Mic on'} style={{ fontSize: 13 }}>{isMuted ? '🔇' : '🎤'}</span>
        <span title={isVideoOff ? 'Camera off' : 'Camera on'} style={{ fontSize: 13 }}>{isVideoOff ? '📵' : '📹'}</span>

        {/* Host controls menu — only for remote participants when user has host rights */}
        {hasHostRights && !isLocal && (
          <div style={{ position: 'relative' }}>
            <button
              style={s.menuTrigger}
              onClick={() => setMenuOpen(v => !v)}
              title="Participant controls"
            >
              ⋮
            </button>

            {menuOpen && (
              <>
                {/* Backdrop to close menu */}
                <div style={s.backdrop} onClick={() => setMenuOpen(false)} />
                <div style={s.menu}>
                  <div style={s.menuHeader}>{name}</div>

                  {/* Mute/Unmute */}
                  <button style={s.menuItem} onClick={() => {
                    sendHostAction({ type: isMuted ? 'UNMUTE_REQUEST' : 'MUTE', targetIdentity: identity });
                    setMenuOpen(false);
                  }}>
                    {isMuted ? '🎙️ Ask to Unmute' : '🔇 Mute'}
                  </button>

                  {/* Video */}
                  <button style={s.menuItem} onClick={() => {
                    sendHostAction({ type: isVideoOff ? 'START_VIDEO_REQUEST' : 'STOP_VIDEO', targetIdentity: identity });
                    setMenuOpen(false);
                  }}>
                    {isVideoOff ? '📹 Ask to Start Video' : '📵 Stop Video'}
                  </button>

                  <div style={s.menuDivider} />

                  {/* Co-host toggle */}
                  <button style={s.menuItem} onClick={() => {
                    sendHostAction({ type: isCohost ? 'REMOVE_COHOST' : 'MAKE_COHOST', targetIdentity: identity });
                    setMenuOpen(false);
                  }}>
                    {isCohost ? '👤 Remove Co-host' : '👑 Make Co-host'}
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
const idx = (name: string) => (name.charCodeAt(0) + (name.charCodeAt(1) ?? 0)) % 6;
const avatarColor = (n: string) => COLORS[idx(n)];
const avatarBg = (n: string) => BG[idx(n)];
const initials = (n: string) => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const s: Record<string, React.CSSProperties> = {
  sectionLabel: { fontSize: 11, color: '#8b90a0', padding: '4px 8px 8px', fontWeight: 500, letterSpacing: '.04em', textTransform: 'uppercase' },
  row: { display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', borderRadius: 7 },
  avatar: { width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 },
  name: { fontSize: 12, fontWeight: 500, color: '#e8eaf0', display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' },
  hostBadge: { fontSize: 10, background: 'rgba(79,110,247,.2)', color: '#4f6ef7', padding: '1px 6px', borderRadius: 4 },
  cohostBadge: { fontSize: 10, background: 'rgba(34,197,94,.2)', color: '#22c55e', padding: '1px 6px', borderRadius: 4 },
  icons: { display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 },
  menuTrigger: { background: 'none', border: 'none', color: '#8b90a0', cursor: 'pointer', fontSize: 16, padding: '0 4px', borderRadius: 4, lineHeight: 1 },
  backdrop: { position: 'fixed', inset: 0, zIndex: 10 },
  menu: { position: 'absolute', right: 0, top: '100%', background: '#22262f', border: '0.5px solid #2e3340', borderRadius: 10, zIndex: 20, minWidth: 180, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' },
  menuHeader: { fontSize: 11, color: '#8b90a0', padding: '10px 14px 6px', fontWeight: 600, borderBottom: '0.5px solid #2e3340' },
  menuItem: { display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: '#e8eaf0', fontSize: 13, cursor: 'pointer', textAlign: 'left' },
  menuDivider: { height: 0.5, background: '#2e3340', margin: '4px 0' },
};

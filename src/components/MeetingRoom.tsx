import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LiveKitRoom,
  useParticipants,
  useLocalParticipant,
  useTracks,
  useRoomContext,
  RoomAudioRenderer,
} from '@livekit/components-react';
import { Track, RoomEvent } from 'livekit-client';
import type { TrackReferenceOrPlaceholder } from '@livekit/components-react';
import { MeetingProvider, useMeeting } from '../context/MeetingContext';
import { VideoTile } from './VideoTile';
import { ControlBar } from './ControlBar';
import { ParticipantsPanel } from './Sidebar/ParticipantsPanel';
import { ChatPanel } from './Sidebar/ChatPanel';
import type { ChatMessage, HostAction } from '../types';

interface MeetingRoomProps {
  meetingId: string;
  localName: string;
  token: string;
  isHost: boolean;
  onLeave: () => void;
}

type SidebarTab = 'participants' | 'chat' | null;

// ── Waiting room screen ───────────────────────────────────────────────────────
function WaitingRoom({ meetingId, onLeave }: { meetingId: string; onLeave: () => void }) {
  return (
    <div style={ws.root}>
      <div style={ws.card}>
        <div style={ws.icon}>⏳</div>
        <h2 style={ws.title}>Please wait…</h2>
        <p style={ws.sub}>The host will let you in shortly.</p>
        <div style={ws.idBox}>{meetingId}</div>
        <button style={ws.leave} onClick={onLeave}>Leave</button>
      </div>
    </div>
  );
}

const ws: Record<string, React.CSSProperties> = {
  root: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0f14', fontFamily: "'Segoe UI', system-ui, sans-serif" },
  card: { background: '#181b22', border: '0.5px solid #2e3340', borderRadius: 16, padding: '48px 40px', textAlign: 'center', maxWidth: 380, width: '90%' },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { color: '#e8eaf0', fontSize: 22, fontWeight: 600, margin: '0 0 8px' },
  sub: { color: '#8b90a0', fontSize: 14, margin: '0 0 20px' },
  idBox: { background: '#22262f', border: '0.5px solid #2e3340', borderRadius: 8, padding: '8px 16px', color: '#4f6ef7', fontSize: 13, fontFamily: 'monospace', marginBottom: 24 },
  leave: { background: 'none', border: '0.5px solid #2e3340', color: '#8b90a0', padding: '10px 28px', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
};

// ── Main room content ─────────────────────────────────────────────────────────
function RoomContent({ meetingId, isHost, onLeave }: Omit<MeetingRoomProps, 'token'>) {
  const { state, dispatch } = useMeeting();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const room = useRoomContext();
  const [sidebar, setSidebar] = useState<SidebarTab>(null);
  const [elapsed, setElapsed] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);

  // For non-hosts: start in waiting room; hosts go straight in
  const [isWaiting, setIsWaiting] = useState(!isHost);

  // Stable refs so data handler never has stale closures
  const localParticipantRef = useRef(localParticipant);
  useEffect(() => { localParticipantRef.current = localParticipant; }, [localParticipant]);
  const onLeaveRef = useRef(onLeave);
  useEffect(() => { onLeaveRef.current = onLeave; }, [onLeave]);
  const roomRef = useRef(room);
  useEffect(() => { roomRef.current = room; }, [room]);

  // Host auto-admits themselves
  useEffect(() => {
    if (isHost && localParticipant.identity) {
      dispatch({ type: 'ADMIT_PARTICIPANT', identity: localParticipant.identity });
    }
  }, [isHost, localParticipant.identity, dispatch]);

  // Meeting timer
  useEffect(() => {
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-dismiss notification
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 6000);
    return () => clearTimeout(t);
  }, [notification]);

  // Data channel — host actions + chat
  useEffect(() => {
    const decoder = new TextDecoder();
    const hostActionTypes = new Set([
      'MUTE','UNMUTE_REQUEST','STOP_VIDEO','START_VIDEO_REQUEST',
      'MAKE_COHOST','REMOVE_COHOST','END_MEETING','ADMIT','DENY','REMOVE_PARTICIPANT',
    ]);

    const handler = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(decoder.decode(payload)) as Record<string, unknown>;
        const lp = localParticipantRef.current;

        if (data.type && hostActionTypes.has(data.type as string)) {
          const action = data as unknown as HostAction;
          switch (action.type) {
            case 'END_MEETING':
              roomRef.current.disconnect();
              onLeaveRef.current();
              break;
            case 'ADMIT':
              if (action.targetIdentity === lp.identity) {
                setIsWaiting(false);
                lp.setMicrophoneEnabled(true);
                lp.setCameraEnabled(true);
              }
              // Host side: mark as admitted
              if (action.targetIdentity) dispatch({ type: 'ADMIT_PARTICIPANT', identity: action.targetIdentity });
              break;
            case 'DENY':
            case 'REMOVE_PARTICIPANT':
              if (action.targetIdentity === lp.identity) {
                roomRef.current.disconnect();
                onLeaveRef.current();
              }
              break;
            case 'MUTE':
              if (action.targetIdentity === lp.identity)
                lp.setMicrophoneEnabled(false);
              break;
            case 'STOP_VIDEO':
              if (action.targetIdentity === lp.identity)
                lp.setCameraEnabled(false);
              break;
            case 'UNMUTE_REQUEST':
              if (action.targetIdentity === lp.identity)
                setNotification('The host would like you to unmute your microphone.');
              break;
            case 'START_VIDEO_REQUEST':
              if (action.targetIdentity === lp.identity)
                setNotification('The host would like you to start your camera.');
              break;
            case 'MAKE_COHOST':
              if (action.targetIdentity) {
                dispatch({ type: 'ADD_COHOST', identity: action.targetIdentity });
                if (action.targetIdentity === lp.identity)
                  setNotification('You have been made a co-host.');
              }
              break;
            case 'REMOVE_COHOST':
              if (action.targetIdentity)
                dispatch({ type: 'REMOVE_COHOST', identity: action.targetIdentity });
              break;
          }
        } else {
          const msg = data as unknown as ChatMessage;
          msg.timestamp = new Date(msg.timestamp);
          dispatch({ type: 'ADD_MESSAGE', message: msg });
        }
      } catch { /* ignore */ }
    };

    room.on(RoomEvent.DataReceived, handler);
    return () => { room.off(RoomEvent.DataReceived, handler); };
  }, [room, dispatch]);

  // Broadcast host action to all (each peer checks their own identity)
  const sendHostAction = useCallback((action: HostAction) => {
    const encoder = new TextEncoder();
    room.localParticipant.publishData(
      encoder.encode(JSON.stringify(action)),
      { reliable: true }
    );
    // Apply locally too
    if (action.type === 'MAKE_COHOST' && action.targetIdentity)
      dispatch({ type: 'ADD_COHOST', identity: action.targetIdentity });
    if (action.type === 'REMOVE_COHOST' && action.targetIdentity)
      dispatch({ type: 'REMOVE_COHOST', identity: action.targetIdentity });
    if (action.type === 'ADMIT' && action.targetIdentity)
      dispatch({ type: 'ADMIT_PARTICIPANT', identity: action.targetIdentity });
  }, [room, dispatch]);

  const handleEndMeeting = () => {
    if (!confirm('End meeting for everyone?')) return;
    sendHostAction({ type: 'END_MEETING' });
    room.disconnect();
    onLeave();
  };

  const isCohost = state.cohosts.includes(localParticipant.identity ?? '');
  const hasHostRights = isHost || isCohost;

  // Show waiting room if participant hasn't been admitted yet
  if (isWaiting) {
    return (
      <WaitingRoom
        meetingId={meetingId}
        onLeave={() => { room.disconnect(); onLeave(); }}
      />
    );
  }

  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
      : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const handlePin = (identity: string) => dispatch({ type: 'PIN_PARTICIPANT', id: identity || null });
  const toggleSidebar = (tab: SidebarTab) => setSidebar(prev => prev === tab ? null : tab);

  const pinned = state.pinnedParticipantId
    ? tracks.find(t => t.participant.identity === state.pinnedParticipantId)
    : null;
  const displayedTracks: TrackReferenceOrPlaceholder[] =
    state.layout === 'spotlight' ? [pinned ?? tracks[0]] : tracks;
  const stripTracks = state.layout === 'spotlight'
    ? tracks.filter(t => t.participant.identity !== (pinned ?? tracks[0])?.participant.identity)
    : [];

  const gridStyle: React.CSSProperties =
    state.layout === 'spotlight' ? { gridTemplateColumns: '1fr' }
    : tracks.length <= 1 ? { gridTemplateColumns: '1fr' }
    : tracks.length <= 2 ? { gridTemplateColumns: '1fr 1fr' }
    : tracks.length <= 4 ? { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }
    : { gridTemplateColumns: 'repeat(3, 1fr)' };

  const totalParticipants = participants.filter(p => p.identity !== localParticipant.identity).length + 1;

  return (
    <div style={s.root}>
      {notification && (
        <div style={s.notification}>
          <span>{notification}</span>
          <button style={s.notifClose} onClick={() => setNotification(null)}>✕</button>
        </div>
      )}

      <div style={s.topbar}>
        <div style={s.meetingInfo}>
          <span style={s.recDot} />
          <span style={s.meetingId}>{meetingId}</span>
          <span style={s.timer}>{fmt(elapsed)}</span>
          <span style={s.pcount}>👥 {totalParticipants}</span>
          {isHost && <span style={s.hostTag}>Host</span>}
          {isCohost && !isHost && <span style={s.cohostTag}>Co-host</span>}
        </div>
        <div style={s.topActions}>
          <TopBtn label="👥" active={sidebar === 'participants'} onClick={() => toggleSidebar('participants')} />
          <TopBtn label="💬" active={sidebar === 'chat'} onClick={() => toggleSidebar('chat')} />
        </div>
      </div>

      <div style={s.main}>
        <div style={s.videoArea}>
          <div style={{ ...s.grid, ...gridStyle }}>
            {displayedTracks.map(trackRef => (
              <VideoTile
                key={trackRef.participant.identity}
                trackRef={trackRef}
                isPinned={state.pinnedParticipantId === trackRef.participant.identity}
                onPin={handlePin}
              />
            ))}
          </div>
          {stripTracks.length > 0 && (
            <div style={s.strip}>
              {stripTracks.map(trackRef => (
                <div key={trackRef.participant.identity} style={s.stripTile}>
                  <VideoTile trackRef={trackRef} onPin={handlePin} />
                </div>
              ))}
            </div>
          )}
        </div>

        {sidebar && (
          <div style={s.sidebar}>
            <div style={s.sidebarTabs}>
              {(['participants', 'chat'] as SidebarTab[]).map(tab => (
                <button
                  key={tab!}
                  style={{ ...s.tab, ...(sidebar === tab ? s.tabActive : {}) }}
                  onClick={() => setSidebar(tab)}
                >
                  {tab === 'participants' ? 'People' : 'Chat'}
                </button>
              ))}
              <button style={s.closeTab} onClick={() => setSidebar(null)}>✕</button>
            </div>
            <div style={s.sidebarBody}>
              {sidebar === 'participants' && (
                <ParticipantsPanel
                  hasHostRights={hasHostRights}
                  isHost={isHost}
                  cohosts={state.cohosts}
                  admittedParticipants={state.admittedParticipants}
                  localIdentity={localParticipant.identity ?? ''}
                  sendHostAction={sendHostAction}
                />
              )}
              {sidebar === 'chat' && (
                <ChatPanel
                  localName={localParticipant.name ?? 'Guest'}
                  localIdentity={localParticipant.identity ?? ''}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <ControlBar
        onLeave={onLeave}
        isHost={isHost}
        onEndMeeting={handleEndMeeting}
      />
    </div>
  );
}

export function MeetingRoom({ meetingId, localName, token, isHost, onLeave }: MeetingRoomProps) {
  return (
    <MeetingProvider>
      <LiveKitRoom
        serverUrl={import.meta.env.VITE_LIVEKIT_URL}
        token={token}
        connect={true}
        audio={isHost}
        video={isHost}
        style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}
      >
        <RoomAudioRenderer />
        <RoomContent meetingId={meetingId} localName={localName} isHost={isHost} onLeave={onLeave} />
      </LiveKitRoom>
    </MeetingProvider>
  );
}

function TopBtn({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ ...s.topBtn, ...(active ? s.topBtnActive : {}) }}>
      {label}
    </button>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'Segoe UI', system-ui, sans-serif" },
  notification: { background: '#1e2235', borderBottom: '1px solid #4f6ef7', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: '#e8eaf0', flexShrink: 0 },
  notifClose: { background: 'none', border: 'none', color: '#8b90a0', cursor: 'pointer', fontSize: 16 },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#181b22', borderBottom: '0.5px solid #2e3340', flexShrink: 0, gap: 8 },
  meetingInfo: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, minWidth: 0 },
  recDot: { width: 8, height: 8, borderRadius: '50%', background: '#e54b4b', display: 'inline-block', flexShrink: 0 },
  meetingId: { fontSize: 11, color: '#8b90a0', background: '#22262f', padding: '2px 7px', borderRadius: 4, border: '0.5px solid #2e3340', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: 120 },
  timer: { fontSize: 12, color: '#8b90a0', fontVariantNumeric: 'tabular-nums', flexShrink: 0 },
  pcount: { fontSize: 12, color: '#8b90a0', flexShrink: 0 },
  hostTag: { fontSize: 10, background: 'rgba(79,110,247,.2)', color: '#4f6ef7', padding: '2px 8px', borderRadius: 4, fontWeight: 600, flexShrink: 0 },
  cohostTag: { fontSize: 10, background: 'rgba(34,197,94,.2)', color: '#22c55e', padding: '2px 8px', borderRadius: 4, fontWeight: 600, flexShrink: 0 },
  topActions: { display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 },
  topBtn: { background: '#22262f', border: '0.5px solid #2e3340', color: '#8b90a0', padding: '6px 12px', borderRadius: 6, fontSize: 16, cursor: 'pointer', lineHeight: 1 },
  topBtnActive: { background: 'rgba(79,110,247,.15)', borderColor: '#4f6ef7', color: '#4f6ef7' },
  main: { display: 'flex', flex: 1, overflow: 'hidden' },
  videoArea: { flex: 1, display: 'flex', flexDirection: 'column', padding: 8, gap: 8, overflow: 'hidden' },
  grid: { flex: 1, display: 'grid', gap: 6, overflow: 'hidden' },
  strip: { display: 'flex', gap: 6, height: 110, flexShrink: 0 },
  stripTile: { width: 150, flexShrink: 0 },
  sidebar: { width: 260, background: '#181b22', borderLeft: '0.5px solid #2e3340', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  sidebarTabs: { display: 'flex', borderBottom: '0.5px solid #2e3340', alignItems: 'center' },
  tab: { flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 500, color: '#8b90a0', textAlign: 'center', cursor: 'pointer', background: 'none', border: 'none', borderBottom: '2px solid transparent' },
  tabActive: { color: '#4f6ef7', borderBottom: '2px solid #4f6ef7' },
  closeTab: { background: 'none', border: 'none', color: '#8b90a0', cursor: 'pointer', padding: '0 10px', fontSize: 14 },
  sidebarBody: { flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column' },
};

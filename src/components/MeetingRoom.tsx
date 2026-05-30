import { useState, useEffect, useCallback } from 'react';
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

function RoomContent({ meetingId, isHost: _isHost, onLeave }: Omit<MeetingRoomProps, 'token'>) {
  const { state, dispatch } = useMeeting();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const room = useRoomContext();
  const [sidebar, setSidebar] = useState<SidebarTab>('participants');
  const [elapsed, setElapsed] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);

  // Determine host/cohost status from metadata
  const metadata = (() => { try { return JSON.parse(localParticipant.metadata ?? '{}'); } catch { return {}; } })();
  const isHost = metadata.isHost === true;
  const isCohost = state.cohosts.includes(localParticipant.identity ?? '');
  const hasHostRights = isHost || isCohost;

  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );

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

  // Handle incoming data channel messages
  useEffect(() => {
    const decoder = new TextDecoder();
    const handler = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(decoder.decode(payload)) as Record<string, unknown>;
        const hostActionTypes = ['MUTE','UNMUTE_REQUEST','STOP_VIDEO','START_VIDEO_REQUEST','MAKE_COHOST','REMOVE_COHOST','END_MEETING'];

        if (data.type && hostActionTypes.includes(data.type as string)) {
          const action = data as unknown as HostAction;
          switch (action.type) {
            case 'END_MEETING':
              room.disconnect();
              onLeave();
              break;
            case 'MUTE':
              if (action.targetIdentity === localParticipant.identity)
                localParticipant.setMicrophoneEnabled(false);
              break;
            case 'STOP_VIDEO':
              if (action.targetIdentity === localParticipant.identity)
                localParticipant.setCameraEnabled(false);
              break;
            case 'UNMUTE_REQUEST':
              if (action.targetIdentity === localParticipant.identity)
                setNotification('The host would like you to unmute your microphone.');
              break;
            case 'START_VIDEO_REQUEST':
              if (action.targetIdentity === localParticipant.identity)
                setNotification('The host would like you to start your camera.');
              break;
            case 'MAKE_COHOST':
              dispatch({ type: 'ADD_COHOST', identity: action.targetIdentity ?? '' });
              if (action.targetIdentity === localParticipant.identity)
                setNotification('You have been made a co-host.');
              break;
            case 'REMOVE_COHOST':
              dispatch({ type: 'REMOVE_COHOST', identity: action.targetIdentity ?? '' });
              break;
          }
        } else {
          // Chat message
          const msg = data as unknown as ChatMessage;
          msg.timestamp = new Date(msg.timestamp);
          dispatch({ type: 'ADD_MESSAGE', message: msg });
        }
      } catch { /* ignore malformed */ }
    };
    room.on(RoomEvent.DataReceived, handler);
    return () => { room.off(RoomEvent.DataReceived, handler); };
  }, [room, dispatch, localParticipant, onLeave]);

  // Send a host action over data channel
  const sendHostAction = useCallback((action: HostAction) => {
    const encoder = new TextEncoder();
    const opts = action.targetIdentity && action.type !== 'END_MEETING'
      ? { reliable: true, destinationIdentities: [action.targetIdentity] }
      : { reliable: true };
    room.localParticipant.publishData(encoder.encode(JSON.stringify(action)), opts);
    // Also apply locally if targeting self
    if (action.type === 'MAKE_COHOST') dispatch({ type: 'ADD_COHOST', identity: action.targetIdentity ?? '' });
    if (action.type === 'REMOVE_COHOST') dispatch({ type: 'REMOVE_COHOST', identity: action.targetIdentity ?? '' });
  }, [room, dispatch]);

  const handleEndMeeting = () => {
    if (!confirm('End meeting for everyone?')) return;
    sendHostAction({ type: 'END_MEETING' });
    room.disconnect();
    onLeave();
  };

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

  return (
    <div style={s.root}>
      {/* Notification banner */}
      {notification && (
        <div style={s.notification}>
          <span>{notification}</span>
          <button style={s.notifBtn} onClick={() => setNotification(null)}>✕</button>
        </div>
      )}

      {/* Top bar */}
      <div style={s.topbar}>
        <div style={s.meetingInfo}>
          <span style={s.recDot} />
          <span style={s.title}>Meeting</span>
          <span style={s.meetingId}>{meetingId}</span>
          <span style={s.timer}>{fmt(elapsed)}</span>
          <span style={s.pcount}>👥 {participants.length + 1}</span>
          {isHost && <span style={s.hostTag}>Host</span>}
          {isCohost && !isHost && <span style={s.cohostTag}>Co-host</span>}
        </div>
        <div style={s.topActions}>
          <TopBtn label="👥 Participants" active={sidebar === 'participants'} onClick={() => toggleSidebar('participants')} />
          <TopBtn label="💬 Chat" active={sidebar === 'chat'} onClick={() => toggleSidebar('chat')} />
          {isHost && (
            <button style={s.endBtn} onClick={handleEndMeeting}>End Meeting</button>
          )}
        </div>
      </div>

      {/* Main */}
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
            </div>
            <div style={s.sidebarBody}>
              {sidebar === 'participants' && (
                <ParticipantsPanel
                  hasHostRights={hasHostRights}
                  isHost={isHost}
                  cohosts={state.cohosts}
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

      <ControlBar onLeave={onLeave} />
    </div>
  );
}

export function MeetingRoom({ meetingId, localName: _localName, token, isHost, onLeave }: MeetingRoomProps) {
  return (
    <MeetingProvider>
      <LiveKitRoom
        serverUrl={import.meta.env.VITE_LIVEKIT_URL}
        token={token}
        connect={true}
        audio={true}
        video={true}
        style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}
      >
        <RoomAudioRenderer />
        <RoomContent meetingId={meetingId} localName={_localName} isHost={isHost} onLeave={onLeave} />
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
  notification: { background: '#2d3245', borderBottom: '0.5px solid #4f6ef7', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: '#e8eaf0', flexShrink: 0 },
  notifBtn: { background: 'none', border: 'none', color: '#8b90a0', cursor: 'pointer', fontSize: 14 },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#181b22', borderBottom: '0.5px solid #2e3340', flexShrink: 0 },
  meetingInfo: { display: 'flex', alignItems: 'center', gap: 10 },
  recDot: { width: 8, height: 8, borderRadius: '50%', background: '#e54b4b', display: 'inline-block' },
  title: { fontSize: 13, fontWeight: 500 },
  meetingId: { fontSize: 11, color: '#8b90a0', background: '#22262f', padding: '2px 8px', borderRadius: 4, border: '0.5px solid #2e3340' },
  timer: { fontSize: 12, color: '#8b90a0', fontVariantNumeric: 'tabular-nums' },
  pcount: { fontSize: 12, color: '#8b90a0' },
  hostTag: { fontSize: 10, background: 'rgba(79,110,247,.2)', color: '#4f6ef7', padding: '2px 8px', borderRadius: 4, fontWeight: 600 },
  cohostTag: { fontSize: 10, background: 'rgba(34,197,94,.2)', color: '#22c55e', padding: '2px 8px', borderRadius: 4, fontWeight: 600 },
  topActions: { display: 'flex', gap: 8, alignItems: 'center' },
  topBtn: { background: '#22262f', border: '0.5px solid #2e3340', color: '#8b90a0', padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  topBtnActive: { background: 'rgba(79,110,247,.15)', borderColor: '#4f6ef7', color: '#4f6ef7' },
  endBtn: { background: '#e54b4b', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  main: { display: 'flex', flex: 1, overflow: 'hidden' },
  videoArea: { flex: 1, display: 'flex', flexDirection: 'column', padding: 12, gap: 10, overflow: 'hidden' },
  grid: { flex: 1, display: 'grid', gap: 8, overflow: 'hidden' },
  strip: { display: 'flex', gap: 8, height: 120, flexShrink: 0 },
  stripTile: { width: 160, flexShrink: 0 },
  sidebar: { width: 260, background: '#181b22', borderLeft: '0.5px solid #2e3340', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  sidebarTabs: { display: 'flex', borderBottom: '0.5px solid #2e3340' },
  tab: { flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 500, color: '#8b90a0', textAlign: 'center', cursor: 'pointer', background: 'none', border: 'none', borderBottom: '2px solid transparent' },
  tabActive: { color: '#4f6ef7', borderBottom: '2px solid #4f6ef7' },
  sidebarBody: { flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column' },
};

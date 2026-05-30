import { useState, useEffect } from 'react';
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
import type { ChatMessage } from '../types';

interface MeetingRoomProps {
  meetingId: string;
  localName: string;
  token: string;
  onLeave: () => void;
}

type SidebarTab = 'participants' | 'chat' | null;

function RoomContent({ meetingId, localName, onLeave }: Omit<MeetingRoomProps, 'token'>) {
  const { state, dispatch } = useMeeting();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const room = useRoomContext();
  const [sidebar, setSidebar] = useState<SidebarTab>('participants');
  const [elapsed, setElapsed] = useState(0);

  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );

  // Meeting timer
  useEffect(() => {
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Receive chat messages via LiveKit data channel
  useEffect(() => {
    const decoder = new TextDecoder();
    const handler = (payload: Uint8Array) => {
      try {
        const msg = JSON.parse(decoder.decode(payload)) as ChatMessage;
        msg.timestamp = new Date(msg.timestamp);
        dispatch({ type: 'ADD_MESSAGE', message: msg });
      } catch { /* ignore malformed */ }
    };
    room.on(RoomEvent.DataReceived, handler);
    return () => { room.off(RoomEvent.DataReceived, handler); };
  }, [room, dispatch]);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
      : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const handlePin = (identity: string) => {
    dispatch({ type: 'PIN_PARTICIPANT', id: identity || null });
  };

  const toggleSidebar = (tab: SidebarTab) => setSidebar(prev => prev === tab ? null : tab);

  // In spotlight mode show pinned (or first) large; rest as strip
  const pinned = state.pinnedParticipantId
    ? tracks.find(t => t.participant.identity === state.pinnedParticipantId)
    : null;
  const displayedTracks: TrackReferenceOrPlaceholder[] =
    state.layout === 'spotlight' ? [pinned ?? tracks[0]] : tracks;
  const stripTracks = state.layout === 'spotlight'
    ? tracks.filter(t => t.participant.identity !== (pinned ?? tracks[0])?.participant.identity)
    : [];

  const gridStyle: React.CSSProperties =
    state.layout === 'spotlight'
      ? { gridTemplateColumns: '1fr' }
      : tracks.length <= 1
      ? { gridTemplateColumns: '1fr' }
      : tracks.length <= 2
      ? { gridTemplateColumns: '1fr 1fr' }
      : tracks.length <= 4
      ? { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }
      : { gridTemplateColumns: 'repeat(3, 1fr)' };

  return (
    <div style={s.root}>
      {/* Top bar */}
      <div style={s.topbar}>
        <div style={s.meetingInfo}>
          <span style={s.recDot} />
          <span style={s.title}>Meeting</span>
          <span style={s.meetingId}>{meetingId}</span>
          <span style={s.timer}>{fmt(elapsed)}</span>
          <span style={s.pcount}>👥 {participants.length + 1}</span>
        </div>
        <div style={s.topActions}>
          <TopBtn label="👥 Participants" active={sidebar === 'participants'} onClick={() => toggleSidebar('participants')} />
          <TopBtn label="💬 Chat" active={sidebar === 'chat'} onClick={() => toggleSidebar('chat')} />
        </div>
      </div>

      {/* Main area */}
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
              {sidebar === 'participants' && <ParticipantsPanel />}
              {sidebar === 'chat' && (
                <ChatPanel
                  localName={localName}
                  localIdentity={localParticipant.identity}
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

export function MeetingRoom({ meetingId, localName, token, onLeave }: MeetingRoomProps) {
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
        <RoomContent meetingId={meetingId} localName={localName} onLeave={onLeave} />
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
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#181b22', borderBottom: '0.5px solid #2e3340', flexShrink: 0 },
  meetingInfo: { display: 'flex', alignItems: 'center', gap: 10 },
  recDot: { width: 8, height: 8, borderRadius: '50%', background: '#e54b4b', display: 'inline-block' },
  title: { fontSize: 13, fontWeight: 500 },
  meetingId: { fontSize: 11, color: '#8b90a0', background: '#22262f', padding: '2px 8px', borderRadius: 4, border: '0.5px solid #2e3340' },
  timer: { fontSize: 12, color: '#8b90a0', fontVariantNumeric: 'tabular-nums' },
  pcount: { fontSize: 12, color: '#8b90a0' },
  topActions: { display: 'flex', gap: 8 },
  topBtn: { background: '#22262f', border: '0.5px solid #2e3340', color: '#8b90a0', padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  topBtnActive: { background: 'rgba(79,110,247,.15)', borderColor: '#4f6ef7', color: '#4f6ef7' },
  main: { display: 'flex', flex: 1, overflow: 'hidden' },
  videoArea: { flex: 1, display: 'flex', flexDirection: 'column', padding: 12, gap: 10, overflow: 'hidden' },
  grid: { flex: 1, display: 'grid', gap: 8, overflow: 'hidden' },
  strip: { display: 'flex', gap: 8, height: 120, flexShrink: 0 },
  stripTile: { width: 160, flexShrink: 0 },
  sidebar: { width: 240, background: '#181b22', borderLeft: '0.5px solid #2e3340', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  sidebarTabs: { display: 'flex', borderBottom: '0.5px solid #2e3340' },
  tab: { flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 500, color: '#8b90a0', textAlign: 'center', cursor: 'pointer', background: 'none', border: 'none', borderBottom: '2px solid transparent' },
  tabActive: { color: '#4f6ef7', borderBottom: '2px solid #4f6ef7' },
  sidebarBody: { flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column' },
};

import { useState } from 'react';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { useMeeting } from '../context/MeetingContext';

interface ControlBarProps {
  onLeave: () => void;
}

export function ControlBar({ onLeave }: ControlBarProps) {
  const { state, dispatch } = useMeeting();
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled } = useLocalParticipant();
  const room = useRoomContext();
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  const toggleMic = () => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  const toggleCamera = () => localParticipant.setCameraEnabled(!isCameraEnabled);
  const toggleScreenShare = () => localParticipant.setScreenShareEnabled(!isScreenShareEnabled);

  const setLayout = (layout: 'grid' | 'spotlight') => {
    dispatch({ type: 'SET_LAYOUT', layout });
    setShowLayoutMenu(false);
  };

  const handleLeave = () => {
    room.disconnect();
    onLeave();
  };

  return (
    <div style={styles.bar}>
      <CtrlBtn icon={isMicrophoneEnabled ? '🎤' : '🎙️'} label={isMicrophoneEnabled ? 'Mute' : 'Unmute'} danger={!isMicrophoneEnabled} onClick={toggleMic} />
      <CtrlBtn icon={isCameraEnabled ? '📹' : '📵'} label={isCameraEnabled ? 'Stop Video' : 'Start Video'} danger={!isCameraEnabled} onClick={toggleCamera} />
      <CtrlBtn icon="🖥️" label={isScreenShareEnabled ? 'Stop Share' : 'Share Screen'} active={isScreenShareEnabled} onClick={toggleScreenShare} />

      <div style={styles.divider} />

      <div style={{ position: 'relative' }}>
        <CtrlBtn icon="⊞" label="Layout" onClick={() => setShowLayoutMenu(v => !v)} />
        {showLayoutMenu && (
          <div style={styles.menu}>
            <button style={styles.menuItem} onClick={() => setLayout('grid')}>Grid view {state.layout === 'grid' ? '✓' : ''}</button>
            <button style={styles.menuItem} onClick={() => setLayout('spotlight')}>Spotlight {state.layout === 'spotlight' ? '✓' : ''}</button>
          </div>
        )}
      </div>

      <CtrlBtn icon="😊" label="React" onClick={() => {}} />

      <div style={styles.divider} />

      <button style={styles.leaveBtn} onClick={handleLeave}>Leave</button>
    </div>
  );
}

function CtrlBtn({ icon, label, onClick, danger, active }: { icon: string; label: string; onClick: () => void; danger?: boolean; active?: boolean }) {
  return (
    <div style={styles.ctrl}>
      <button onClick={onClick} title={label} style={{ ...styles.ctrlBtn, ...(danger ? styles.ctrlBtnDanger : {}), ...(active ? styles.ctrlBtnActive : {}) }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </button>
      <span style={styles.ctrlLabel}>{label}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', background: '#181b22', borderTop: '0.5px solid #2e3340' },
  ctrl: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 },
  ctrlBtn: { width: 44, height: 44, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#22262f', border: '0.5px solid #2e3340', color: '#e8eaf0', cursor: 'pointer' },
  ctrlBtnDanger: { background: 'rgba(229,75,75,0.15)', borderColor: '#e54b4b' },
  ctrlBtnActive: { background: 'rgba(79,110,247,0.15)', borderColor: '#4f6ef7' },
  ctrlLabel: { fontSize: 10, color: '#8b90a0' },
  divider: { width: 0.5, height: 36, background: '#2e3340', margin: '0 4px' },
  leaveBtn: { background: '#e54b4b', border: 'none', color: '#fff', padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  menu: { position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: '#22262f', border: '0.5px solid #2e3340', borderRadius: 8, marginBottom: 8, overflow: 'hidden', zIndex: 10, minWidth: 140 },
  menuItem: { display: 'block', width: '100%', padding: '9px 14px', background: 'none', border: 'none', color: '#e8eaf0', fontSize: 13, cursor: 'pointer', textAlign: 'left' },
};

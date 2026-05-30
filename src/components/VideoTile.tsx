import { useRef } from 'react';
import { VideoTrack, useIsSpeaking, useParticipantInfo } from '@livekit/components-react';
import type { TrackReferenceOrPlaceholder } from '@livekit/components-react';
import styles from './VideoTile.module.css';

interface VideoTileProps {
  trackRef: TrackReferenceOrPlaceholder;
  isPinned?: boolean;
  onPin?: (identity: string) => void;
}

const COLORS = ['#4f6ef7','#22c55e','#e54b4b','#7c3aed','#f59e0b','#06b6d4'];
function getColor(name: string) {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) ?? 0);
  return COLORS[code % COLORS.length];
}
function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function VideoTile({ trackRef, isPinned, onPin }: VideoTileProps) {
  const tileRef = useRef<HTMLDivElement>(null);
  const { participant } = trackRef;
  const isSpeaking = useIsSpeaking(participant);
  const { name, identity } = useParticipantInfo({ participant });
  const displayName = name ?? identity ?? 'Guest';

  const hasVideo = !!trackRef.publication && !trackRef.publication.isMuted && trackRef.publication.isSubscribed !== false;

  const handleDoubleClick = () => {
    const el = tileRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) document.exitFullscreen();
    else el.requestFullscreen();
  };

  return (
    <div
      ref={tileRef}
      onDoubleClick={handleDoubleClick}
      className={[
        styles.tile,
        isPinned ? styles.pinned : '',
        isSpeaking ? styles.speaking : '',
      ].join(' ')}
    >
      {hasVideo ? (
        <VideoTrack trackRef={trackRef as TrackReferenceOrPlaceholder & { publication: NonNullable<TrackReferenceOrPlaceholder['publication']> }} className={styles.video} />
      ) : (
        <div className={styles.avatar}>
          <div className={styles.avatarCircle} style={{ background: getColor(displayName) }}>
            {getInitials(displayName)}
          </div>
        </div>
      )}

      <div className={styles.info}>
        <span className={styles.name}>{displayName}</span>
        {isSpeaking && (
          <span className={styles.speakingBars} aria-label="Speaking">
            <span /><span /><span /><span />
          </span>
        )}
      </div>

      {onPin && (
        <button
          className={styles.pinBtn}
          onClick={() => onPin(isPinned ? '' : (identity ?? ''))}
          title={isPinned ? 'Unpin' : 'Pin'}
        >
          {isPinned ? '📌' : '📍'}
        </button>
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { useMeeting } from '../../context/MeetingContext';
import type { ChatMessage } from '../../types';

interface ChatPanelProps {
  localName: string;
  localIdentity: string;
}

export function ChatPanel({ localName, localIdentity }: ChatPanelProps) {
  const { state, dispatch } = useMeeting();
  const room = useRoomContext();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const encoder = new TextEncoder();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: localIdentity,
      senderName: localName,
      text: trimmed,
      timestamp: new Date(),
    };
    dispatch({ type: 'ADD_MESSAGE', message: msg });
    // Broadcast to all other participants
    room.localParticipant.publishData(encoder.encode(JSON.stringify(msg)), { reliable: true });
    setText('');
  };

  const fmt = (d: Date) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const COLORS: Record<string, string> = {};
  const palette = ['#4f6ef7','#22c55e','#e54b4b','#7c3aed','#f59e0b','#06b6d4'];
  let ci = 0;
  const colorFor = (id: string) => { if (!COLORS[id]) COLORS[id] = palette[ci++ % palette.length]; return COLORS[id]; };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={s.messages}>
        {state.messages.length === 0 && <p style={s.empty}>No messages yet. Say hello! 👋</p>}
        {state.messages.map(m => (
          <div key={m.id} style={s.msg}>
            <div style={s.msgHeader}>
              <span style={{ ...s.author, color: colorFor(m.senderId) }}>{m.senderName}</span>
              <span style={s.time}>{fmt(m.timestamp)}</span>
            </div>
            <div style={s.body}>{m.text}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={s.inputWrap}>
        <input
          style={s.input}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Send a message..."
        />
        <button style={s.sendBtn} onClick={send}>➤</button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  messages: { flex: 1, overflowY: 'auto', padding: '4px 0', display: 'flex', flexDirection: 'column', gap: 10 },
  empty: { fontSize: 12, color: '#8b90a0', textAlign: 'center', marginTop: 24 },
  msg: { fontSize: 12 },
  msgHeader: { display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 2 },
  author: { fontWeight: 500, fontSize: 11 },
  time: { fontSize: 10, color: '#8b90a0' },
  body: { color: '#e8eaf0', lineHeight: 1.5 },
  inputWrap: { padding: '8px', borderTop: '0.5px solid #2e3340', display: 'flex', gap: 6 },
  input: { flex: 1, background: '#22262f', border: '0.5px solid #2e3340', color: '#e8eaf0', borderRadius: 7, padding: '7px 10px', fontSize: 12, outline: 'none', fontFamily: 'inherit' },
  sendBtn: { background: '#4f6ef7', border: 'none', color: '#fff', borderRadius: 7, padding: '0 12px', cursor: 'pointer', fontSize: 13 },
};

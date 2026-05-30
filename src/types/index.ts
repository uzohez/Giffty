export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
}

export interface UIState {
  layout: 'grid' | 'spotlight';
  pinnedParticipantId: string | null;
  messages: ChatMessage[];
  cohosts: string[];
}

export type HostActionType =
  | 'MUTE' | 'UNMUTE_REQUEST'
  | 'STOP_VIDEO' | 'START_VIDEO_REQUEST'
  | 'MAKE_COHOST' | 'REMOVE_COHOST'
  | 'END_MEETING';

export interface HostAction {
  type: HostActionType;
  targetIdentity?: string;
}

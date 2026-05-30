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
}

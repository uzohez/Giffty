import React, { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { ChatMessage, UIState } from '../types';

type Action =
  | { type: 'SET_LAYOUT'; layout: 'grid' | 'spotlight' }
  | { type: 'PIN_PARTICIPANT'; id: string | null }
  | { type: 'ADD_MESSAGE'; message: ChatMessage };

const initialState: UIState = {
  layout: 'grid',
  pinnedParticipantId: null,
  messages: [],
};

function reducer(state: UIState, action: Action): UIState {
  switch (action.type) {
    case 'SET_LAYOUT':
      return { ...state, layout: action.layout };
    case 'PIN_PARTICIPANT':
      return { ...state, pinnedParticipantId: action.id };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] };
    default:
      return state;
  }
}

interface MeetingContextValue {
  state: UIState;
  dispatch: React.Dispatch<Action>;
}

const MeetingContext = createContext<MeetingContextValue | null>(null);

export function MeetingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <MeetingContext.Provider value={{ state, dispatch }}>
      {children}
    </MeetingContext.Provider>
  );
}

export function useMeeting() {
  const ctx = useContext(MeetingContext);
  if (!ctx) throw new Error('useMeeting must be inside MeetingProvider');
  return ctx;
}

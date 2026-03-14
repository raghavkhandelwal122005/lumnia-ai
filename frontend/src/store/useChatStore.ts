import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    image_url?: string;
}

export interface ChatSession {
    id: string;
    title: string;
    date: string;
    messages: ChatMessage[];
}

interface ChatState {
    sessions: ChatSession[];
    addSession: (session: ChatSession) => void;
    updateSession: (id: string, messages: ChatMessage[]) => void;
    deleteSession: (id: string) => void;
}

export const useChatStore = create<ChatState>()(
    persist(
        (set) => ({
            sessions: [],
            addSession: (session) =>
                set((state) => ({ sessions: [session, ...state.sessions] })),
            updateSession: (id, messages) =>
                set((state) => {
                    const sessionIndex = state.sessions.findIndex(s => s.id === id);
                    if (sessionIndex === -1) return state;

                    const updatedSessions = [...state.sessions];
                    
                    // Auto-update title if it's currently 'New Consultation'
                    let newTitle = updatedSessions[sessionIndex].title;
                    if (newTitle === 'New Consultation') {
                        const firstUserMsg = messages.find(m => m.role === 'user');
                        if (firstUserMsg && firstUserMsg.content) {
                            newTitle = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
                        }
                    }

                    updatedSessions[sessionIndex] = {
                        ...updatedSessions[sessionIndex],
                        title: newTitle,
                        messages,
                    };

                    return { sessions: updatedSessions };
                }),
            deleteSession: (id) =>
                set((state) => ({
                    sessions: state.sessions.filter((s) => s.id !== id),
                })),
        }),
        {
            name: 'health-chat-storage', // name of item in the storage (must be unique)
        }
    )
);

import { create } from "zustand";
import { Thread, Message, Document, RAGConfig, AppSettings } from "../types";

interface AppState {
	// Settings
	settings: AppSettings;
	setSettings: (settings: Partial<AppSettings>) => void;

	// Database connection
	isDbConnected: boolean;
	setDbConnected: (connected: boolean) => void;

	// Threads
	threads: Thread[];
	currentThreadId: string | null;
	setThreads: (threads: Thread[]) => void;
	setCurrentThread: (threadId: string | null) => void;
	addThread: (thread: Thread) => void;
	removeThread: (threadId: string) => void;
	updateThread: (threadId: string, updates: Partial<Thread>) => void;

	// Messages for current thread
	messages: Message[];
	setMessages: (messages: Message[]) => void;
	addMessage: (message: Message) => void;

	// Documents for current thread (RAG mode)
	documents: Document[];
	setDocuments: (documents: Document[]) => void;
	addDocument: (document: Document) => void;
	removeDocument: (documentId: string) => void;

	// UI State
	isSettingsOpen: boolean;
	setSettingsOpen: (open: boolean) => void;
	isSidebarCollapsed: boolean;
	setSidebarCollapsed: (collapsed: boolean) => void;

	// Loading states
	isLoadingMessages: boolean;
	setLoadingMessages: (loading: boolean) => void;
	isLoadingDocuments: boolean;
	setLoadingDocuments: (loading: boolean) => void;
	isSendingMessage: boolean;
	setSendingMessage: (sending: boolean) => void;
}

const DEFAULT_RAG_CONFIG: RAGConfig = {
	chunkSize: 500,
	chunkOverlap: 50,
	retrievalCount: 5,
	similarityThreshold: 0.7,
};

export const useAppStore = create<AppState>((set) => ({
	// Settings
	settings: {
		geminiApiKey: "",
		databaseConfig: null,
		ragConfig: DEFAULT_RAG_CONFIG,
	},
	setSettings: (newSettings) =>
		set((state) => ({
			settings: { ...state.settings, ...newSettings },
		})),

	// Database connection
	isDbConnected: false,
	setDbConnected: (connected) => set({ isDbConnected: connected }),

	// Threads
	threads: [],
	currentThreadId: null,
	setThreads: (threads) => set({ threads }),
	setCurrentThread: (threadId) => set({ currentThreadId: threadId }),
	addThread: (thread) =>
		set((state) => ({
			threads: [thread, ...state.threads],
		})),
	removeThread: (threadId) =>
		set((state) => ({
			threads: state.threads.filter((t) => t.id !== threadId),
			currentThreadId:
				state.currentThreadId === threadId
					? null
					: state.currentThreadId,
		})),
	updateThread: (threadId, updates) =>
		set((state) => ({
			threads: state.threads.map((t) =>
				t.id === threadId ? { ...t, ...updates } : t,
			),
		})),

	// Messages
	messages: [],
	setMessages: (messages) => set({ messages }),
	addMessage: (message) =>
		set((state) => ({
			messages: [...state.messages, message],
		})),

	// Documents
	documents: [],
	setDocuments: (documents) => set({ documents }),
	addDocument: (document) =>
		set((state) => ({
			documents: [...state.documents, document],
		})),
	removeDocument: (documentId) =>
		set((state) => ({
			documents: state.documents.filter((d) => d.id !== documentId),
		})),

	// UI State
	isSettingsOpen: false,
	setSettingsOpen: (open) => set({ isSettingsOpen: open }),
	isSidebarCollapsed: false,
	setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),

	// Loading states
	isLoadingMessages: false,
	setLoadingMessages: (loading) => set({ isLoadingMessages: loading }),
	isLoadingDocuments: false,
	setLoadingDocuments: (loading) => set({ isLoadingDocuments: loading }),
	isSendingMessage: false,
	setSendingMessage: (sending) => set({ isSendingMessage: sending }),
}));

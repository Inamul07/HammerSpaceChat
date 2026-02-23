// Electron API types
export interface ElectronAPI {
	db: {
		connect: (
			config: DatabaseConfig,
		) => Promise<{ success: boolean; error?: string }>;
		disconnect: () => Promise<{ success: boolean; error?: string }>;
		status: () => Promise<boolean>;
		test: () => Promise<{ success: boolean; error?: string }>;
		checkPgVector: () => Promise<{
			success: boolean;
			hasVector?: boolean;
			error?: string;
		}>;
	};
	ai: {
		sendMessage: (
			message: string,
			apiKey: string,
			threadId: string,
		) => Promise<string>;
		streamMessage: (
			message: string,
			apiKey: string,
			threadId: string,
		) => Promise<void>;
	};
	file: {
		pickFiles: () => Promise<{
			success: boolean;
			filePaths?: string[];
			error?: string;
		}>;
		readFile: (filePath: string) => Promise<{
			success: boolean;
			data?: Buffer;
			error?: string;
		}>;
		parseDocument: (
			filePath: string,
			fileType: "pdf" | "txt" | "md" | "docx",
		) => Promise<{
			success: boolean;
			text?: string;
			fileName?: string;
			fileSize?: number;
			error?: string;
		}>;
	};
	thread: {
		create: (
			name: string,
			type: ThreadType,
		) => Promise<{ success: boolean; thread?: Thread; error?: string }>;
		list: () => Promise<{
			success: boolean;
			threads?: Thread[];
			error?: string;
		}>;
		get: (
			threadId: string,
		) => Promise<{ success: boolean; thread?: Thread; error?: string }>;
		updateName: (
			threadId: string,
			name: string,
		) => Promise<{ success: boolean; thread?: Thread; error?: string }>;
		delete: (
			threadId: string,
		) => Promise<{ success: boolean; error?: string }>;
	};
	message: {
		create: (
			threadId: string,
			role: "user" | "assistant",
			content: string,
		) => Promise<{ success: boolean; message?: Message; error?: string }>;
		list: (threadId: string) => Promise<{
			success: boolean;
			messages?: Message[];
			error?: string;
		}>;
		delete: (
			messageId: string,
		) => Promise<{ success: boolean; error?: string }>;
		addSources: (
			messageId: string,
			sources: any[],
		) => Promise<{ success: boolean; error?: string }>;
	};
	document: {
		create: (
			threadId: string,
			name: string,
			fileType: "pdf" | "txt" | "md" | "docx",
			fileSize: number,
		) => Promise<{ success: boolean; document?: Document; error?: string }>;
		list: (threadId: string) => Promise<{
			success: boolean;
			documents?: Document[];
			error?: string;
		}>;
		get: (
			documentId: string,
		) => Promise<{ success: boolean; document?: Document; error?: string }>;
		updateChunkCount: (
			documentId: string,
			chunkCount: number,
		) => Promise<{ success: boolean; error?: string }>;
		delete: (
			documentId: string,
		) => Promise<{ success: boolean; error?: string }>;
	};
	embedding: {
		batchInsert: (
			documentId: string,
			threadId: string,
			chunks: any[],
		) => Promise<{ success: boolean; error?: string }>;
		search: (
			threadId: string,
			queryEmbedding: number[],
			limit: number,
			threshold: number,
		) => Promise<{
			success: boolean;
			results?: EmbeddingSearchResult[];
			error?: string;
		}>;
		count: (
			threadId: string,
		) => Promise<{ success: boolean; count?: number; error?: string }>;
	};
	messageSource: {
		batchInsert: (
			messageId: string,
			sources: Array<{
				documentId: string;
				embeddingId: string;
				similarityScore: number;
			}>,
		) => Promise<{ success: boolean; error?: string }>;
		getByMessage: (messageId: string) => Promise<{
			success: boolean;
			sources?: DocumentSource[];
			error?: string;
		}>;
	};
	on: (channel: string, callback: (...args: any[]) => void) => void;
	off: (channel: string, callback: (...args: any[]) => void) => void;
}

declare global {
	interface Window {
		electronAPI: ElectronAPI;
	}
}

// Application types
export type ThreadType = "chat" | "rag";

export interface Thread {
	id: string;
	name: string;
	type: ThreadType;
	created_at: Date;
	updated_at: Date;
}

export interface Message {
	id: string;
	thread_id: string;
	role: "user" | "assistant";
	content: string;
	created_at: Date;
	sources?: DocumentSource[];
}

export interface DocumentSource {
	document_id: string;
	document_name: string;
	chunk_text: string;
	similarity: number;
}

export interface Document {
	id: string;
	thread_id: string;
	name: string;
	file_type: "pdf" | "txt" | "md" | "docx";
	file_size: number;
	uploaded_at: Date;
	chunk_count: number;
}

export interface EmbeddingSearchResult {
	id: string;
	documentId: string;
	documentName: string;
	chunkText: string;
	similarity: number;
}

export interface DatabaseConfig {
	host: string;
	port: number;
	database: string;
	user: string;
	password: string;
}

export interface RAGConfig {
	chunkSize: number;
	chunkOverlap: number;
	retrievalCount: number;
	similarityThreshold: number;
}

export type GeminiModel =
	| "gemini-2.5-pro"
	| "gemini-2.5-flash"
	| "gemini-2.5-flash-lite"
	| "gemini-1.5-pro"
	| "gemini-1.5-flash"
	| "gemini-pro";

export const GEMINI_MODELS: { value: GeminiModel; label: string }[] = [
	{
		value: "gemini-2.5-flash",
		label: "Gemini 2.5 Flash (Recommended)",
	},
	{
		value: "gemini-2.5-pro",
		label: "Gemini 2.5 Pro (Most Capable)",
	},
	{
		value: "gemini-2.5-flash-lite",
		label: "Gemini 2.5 Flash Lite (Fast & Cost-Efficient)",
	},
	{ value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
	{ value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
	{ value: "gemini-pro", label: "Gemini Pro (Legacy)" },
];

export interface AppSettings {
	geminiApiKey: string;
	geminiModel: GeminiModel;
	databaseConfig: DatabaseConfig | null;
	ragConfig: RAGConfig;
}

export {};

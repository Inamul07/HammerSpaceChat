import { contextBridge, ipcRenderer } from "electron";

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
	// Database operations
	db: {
		connect: (config: any) => ipcRenderer.invoke("db:connect", config),
		disconnect: () => ipcRenderer.invoke("db:disconnect"),
		status: () => ipcRenderer.invoke("db:status"),
		test: () => ipcRenderer.invoke("db:test"),
		checkPgVector: () => ipcRenderer.invoke("db:check-pgvector"),
	},

	// Gemini API operations
	ai: {
		sendMessage: (message: string, apiKey: string, threadId: string) =>
			ipcRenderer.invoke("ai:sendMessage", message, apiKey, threadId),
		streamMessage: (message: string, apiKey: string, threadId: string) =>
			ipcRenderer.invoke("ai:streamMessage", message, apiKey, threadId),
	},

	// File operations
	file: {
		pickFiles: () => ipcRenderer.invoke("file:pickFiles"),
		readFile: (filePath: string) =>
			ipcRenderer.invoke("file:readFile", filePath),
		parseDocument: (
			filePath: string,
			fileType: "pdf" | "txt" | "md" | "docx",
		) => ipcRenderer.invoke("file:parseDocument", filePath, fileType),
	},

	// Thread operations
	thread: {
		create: (name: string, type: "chat" | "rag") =>
			ipcRenderer.invoke("thread:create", name, type),
		list: () => ipcRenderer.invoke("thread:list"),
		get: (threadId: string) => ipcRenderer.invoke("thread:get", threadId),
		updateName: (threadId: string, name: string) =>
			ipcRenderer.invoke("thread:update-name", threadId, name),
		delete: (threadId: string) =>
			ipcRenderer.invoke("thread:delete", threadId),
	},

	// Message operations
	message: {
		create: (
			threadId: string,
			role: "user" | "assistant",
			content: string,
		) => ipcRenderer.invoke("message:create", threadId, role, content),
		list: (threadId: string) =>
			ipcRenderer.invoke("message:list", threadId),
		delete: (messageId: string) =>
			ipcRenderer.invoke("message:delete", messageId),
		addSources: (messageId: string, sources: any[]) =>
			ipcRenderer.invoke("message:add-sources", messageId, sources),
	},

	// Document operations
	document: {
		create: (
			threadId: string,
			name: string,
			fileType: "pdf" | "txt" | "md" | "docx",
			fileSize: number,
		) =>
			ipcRenderer.invoke(
				"document:create",
				threadId,
				name,
				fileType,
				fileSize,
			),
		list: (threadId: string) =>
			ipcRenderer.invoke("document:list", threadId),
		get: (documentId: string) =>
			ipcRenderer.invoke("document:get", documentId),
		updateChunkCount: (documentId: string, chunkCount: number) =>
			ipcRenderer.invoke(
				"document:updateChunkCount",
				documentId,
				chunkCount,
			),
		delete: (documentId: string) =>
			ipcRenderer.invoke("document:delete", documentId),
	},

	// Embedding operations
	embedding: {
		batchInsert: (documentId: string, threadId: string, chunks: any[]) =>
			ipcRenderer.invoke(
				"embedding:batch-insert",
				documentId,
				threadId,
				chunks,
			),
		search: (
			threadId: string,
			queryEmbedding: number[],
			limit: number,
			threshold: number,
		) =>
			ipcRenderer.invoke(
				"embedding:search",
				threadId,
				queryEmbedding,
				limit,
				threshold,
			),
		count: (threadId: string) =>
			ipcRenderer.invoke("embedding:count", threadId),
	},

	// Message source operations (RAG mode)
	messageSource: {
		batchInsert: (messageId: string, sources: any[]) =>
			ipcRenderer.invoke("messageSource:batchInsert", messageId, sources),
		getByMessage: (messageId: string) =>
			ipcRenderer.invoke("messageSource:getByMessage", messageId),
	},

	// Settings operations
	settings: {
		save: (settings: any) => ipcRenderer.invoke("settings:save", settings),
		load: () => ipcRenderer.invoke("settings:load"),
	},

	// Shell operations
	shell: {
		openExternal: (url: string) =>
			ipcRenderer.invoke("shell:openExternal", url),
	},

	// Event listeners
	on: (channel: string, callback: (...args: any[]) => void) => {
		ipcRenderer.on(channel, (_, ...args) => callback(...args));
	},
	off: (channel: string, callback: (...args: any[]) => void) => {
		ipcRenderer.removeListener(channel, callback);
	},
});

export {};

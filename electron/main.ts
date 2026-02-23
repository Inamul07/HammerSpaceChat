import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import * as fs from "fs";
import {
	dbManager,
	threadOperations,
	messageOperations,
	documentOperations,
	embeddingOperations,
	messageSourceOperations,
} from "./database/index";
import * as documentUtils from "./utils/documents";

// __dirname is automatically available in CommonJS
let mainWindow: BrowserWindow | null = null;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1400,
		height: 900,
		minWidth: 1000,
		minHeight: 600,
		backgroundColor: "#000000",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
		},
		titleBarStyle: "hiddenInset",
		show: false,
	});

	// Show window when ready to avoid visual flash
	mainWindow.once("ready-to-show", () => {
		mainWindow?.show();
	});

	// Load the app
	if (process.env.NODE_ENV === "development") {
		mainWindow.loadURL("http://localhost:5173");
		mainWindow.webContents.openDevTools();
	} else {
		mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
	}

	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}

// App lifecycle
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

// ====================
// Database IPC Handlers
// ====================

/**
 * Connect to PostgreSQL database
 */
ipcMain.handle("db:connect", async (_, config) => {
	try {
		const success = await dbManager.connect(config);
		return { success, error: null };
	} catch (error: any) {
		console.error("Database connection error:", error);
		return { success: false, error: error.message };
	}
});

/**
 * Disconnect from database
 */
ipcMain.handle("db:disconnect", async () => {
	try {
		await dbManager.disconnect();
		return { success: true };
	} catch (error: any) {
		console.error("Database disconnect error:", error);
		return { success: false, error: error.message };
	}
});

/**
 * Get database connection status
 */
ipcMain.handle("db:status", async () => {
	return dbManager.getConnectionStatus();
});

/**
 * Test database connection
 */
ipcMain.handle("db:test", async () => {
	try {
		const isConnected = await dbManager.testConnection();
		return { success: isConnected };
	} catch (error: any) {
		return { success: false, error: error.message };
	}
});

/**
 * Check if pgvector extension is available
 */
ipcMain.handle("db:check-pgvector", async () => {
	try {
		const hasVector = await dbManager.checkPgVector();
		return { success: true, hasVector };
	} catch (error: any) {
		return { success: false, error: error.message };
	}
});

// ====================
// Thread IPC Handlers
// ====================

/**
 * Create a new thread
 */
ipcMain.handle(
	"thread:create",
	async (_, name: string, type: "chat" | "rag") => {
		try {
			const thread = await threadOperations.create(name, type);
			return { success: true, thread };
		} catch (error: any) {
			console.error("Thread creation error:", error);
			return { success: false, error: error.message };
		}
	},
);

/**
 * List all threads
 */
ipcMain.handle("thread:list", async () => {
	try {
		const threads = await threadOperations.list();
		return { success: true, threads };
	} catch (error: any) {
		console.error("Thread list error:", error);
		return { success: false, error: error.message };
	}
});

/**
 * Get a specific thread
 */
ipcMain.handle("thread:get", async (_, threadId: string) => {
	try {
		const thread = await threadOperations.getById(threadId);
		return { success: true, thread };
	} catch (error: any) {
		console.error("Thread get error:", error);
		return { success: false, error: error.message };
	}
});

/**
 * Update thread name
 */
ipcMain.handle(
	"thread:update-name",
	async (_, threadId: string, name: string) => {
		try {
			const thread = await threadOperations.updateName(threadId, name);
			return { success: true, thread };
		} catch (error: any) {
			console.error("Thread update error:", error);
			return { success: false, error: error.message };
		}
	},
);

/**
 * Delete a thread
 */
ipcMain.handle("thread:delete", async (_, threadId: string) => {
	try {
		await threadOperations.delete(threadId);
		return { success: true };
	} catch (error: any) {
		console.error("Thread delete error:", error);
		return { success: false, error: error.message };
	}
});

// ====================
// Message IPC Handlers
// ====================

/**
 * Create a new message
 */
ipcMain.handle(
	"message:create",
	async (
		_,
		threadId: string,
		role: "user" | "assistant",
		content: string,
	) => {
		try {
			const message = await messageOperations.create(
				threadId,
				role,
				content,
			);
			return { success: true, message };
		} catch (error: any) {
			console.error("Message creation error:", error);
			return { success: false, error: error.message };
		}
	},
);

/**
 * List messages for a thread
 */
ipcMain.handle("message:list", async (_, threadId: string) => {
	try {
		const messages = await messageOperations.listByThread(threadId);
		return { success: true, messages };
	} catch (error: any) {
		console.error("Message list error:", error);
		return { success: false, error: error.message };
	}
});

/**
 * Delete a message
 */
ipcMain.handle("message:delete", async (_, messageId: string) => {
	try {
		await messageOperations.delete(messageId);
		return { success: true };
	} catch (error: any) {
		console.error("Message delete error:", error);
		return { success: false, error: error.message };
	}
});

/**
 * Add sources to a message (RAG mode)
 */
ipcMain.handle(
	"message:add-sources",
	async (_, messageId: string, sources: any[]) => {
		try {
			await messageOperations.addSources(messageId, sources);
			return { success: true };
		} catch (error: any) {
			console.error("Message add sources error:", error);
			return { success: false, error: error.message };
		}
	},
);

// ====================
// Document IPC Handlers
// ====================

/**
 * Create a new document
 */
ipcMain.handle(
	"document:create",
	async (
		_,
		threadId: string,
		name: string,
		fileType: "pdf" | "txt" | "md" | "docx",
		fileSize: number,
	) => {
		try {
			const document = await documentOperations.create(
				threadId,
				name,
				fileType,
				fileSize,
			);
			return { success: true, document };
		} catch (error: any) {
			console.error("Document creation error:", error);
			return { success: false, error: error.message };
		}
	},
);

/**
 * List documents for a thread
 */
ipcMain.handle("document:list", async (_, threadId: string) => {
	try {
		const documents = await documentOperations.listByThread(threadId);
		return { success: true, documents };
	} catch (error: any) {
		console.error("Document list error:", error);
		return { success: false, error: error.message };
	}
});

/**
 * Get a specific document
 */
ipcMain.handle("document:get", async (_, documentId: string) => {
	try {
		const document = await documentOperations.getById(documentId);
		return { success: true, document };
	} catch (error: any) {
		console.error("Document get error:", error);
		return { success: false, error: error.message };
	}
});

/**
 * Update document chunk count
 */
ipcMain.handle(
	"document:updateChunkCount",
	async (_, documentId: string, chunkCount: number) => {
		try {
			await documentOperations.updateChunkCount(documentId, chunkCount);
			return { success: true };
		} catch (error: any) {
			console.error("Document update chunk count error:", error);
			return { success: false, error: error.message };
		}
	},
);

/**
 * Delete a document
 */
ipcMain.handle("document:delete", async (_, documentId: string) => {
	try {
		await documentOperations.delete(documentId);
		return { success: true };
	} catch (error: any) {
		console.error("Document delete error:", error);
		return { success: false, error: error.message };
	}
});

// ====================
// Embedding IPC Handlers
// ====================

/**
 * Store embeddings for a document
 */
ipcMain.handle(
	"embedding:batch-insert",
	async (_, documentId: string, threadId: string, chunks: any[]) => {
		try {
			await embeddingOperations.batchInsert(documentId, threadId, chunks);
			return { success: true };
		} catch (error: any) {
			console.error("Embedding batch insert error:", error);
			return { success: false, error: error.message };
		}
	},
);

/**
 * Search for similar embeddings
 */
ipcMain.handle(
	"embedding:search",
	async (
		_,
		threadId: string,
		queryEmbedding: number[],
		limit: number,
		threshold: number,
	) => {
		try {
			const results = await embeddingOperations.search(
				threadId,
				queryEmbedding,
				limit,
				threshold,
			);
			return { success: true, results };
		} catch (error: any) {
			console.error("Embedding search error:", error);
			return { success: false, error: error.message };
		}
	},
);

/**
 * Get embeddings count for a thread
 */
ipcMain.handle("embedding:count", async (_, threadId: string) => {
	try {
		const count = await embeddingOperations.getCountByThread(threadId);
		return { success: true, count };
	} catch (error: any) {
		console.error("Embedding count error:", error);
		return { success: false, error: error.message };
	}
});

/**
 * Message source operations (RAG mode)
 */
ipcMain.handle(
	"messageSource:batchInsert",
	async (
		_,
		messageId: string,
		sources: Array<{
			documentId: string;
			embeddingId: string;
			similarityScore: number;
		}>,
	) => {
		try {
			await messageSourceOperations.batchInsert(messageId, sources);
			return { success: true };
		} catch (error: any) {
			console.error("Message source batch insert error:", error);
			return { success: false, error: error.message };
		}
	},
);

ipcMain.handle("messageSource:getByMessage", async (_, messageId: string) => {
	try {
		const sources = await messageSourceOperations.getByMessage(messageId);
		return { success: true, sources };
	} catch (error: any) {
		console.error("Get message sources error:", error);
		return { success: false, error: error.message };
	}
});

/**
 * File handling
 */
ipcMain.handle("file:pickFiles", async () => {
	try {
		const result = await dialog.showOpenDialog({
			properties: ["openFile", "multiSelections"],
			filters: [
				{
					name: "Documents",
					extensions: ["pdf", "txt", "md", "docx"],
				},
			],
		});

		if (result.canceled) {
			return { success: true, filePaths: [] };
		}

		return { success: true, filePaths: result.filePaths };
	} catch (error: any) {
		console.error("File picker error:", error);
		return { success: false, error: error.message };
	}
});

ipcMain.handle("file:readFile", async (_, filePath: string) => {
	try {
		const buffer = fs.readFileSync(filePath);
		return { success: true, data: buffer };
	} catch (error: any) {
		console.error("File read error:", error);
		return { success: false, error: error.message };
	}
});

ipcMain.handle(
	"file:parseDocument",
	async (_, filePath: string, fileType: "pdf" | "txt" | "md" | "docx") => {
		try {
			const text = await documentUtils.parseDocument(filePath, fileType);
			const fileName = documentUtils.getFileName(filePath);
			const fileSize = documentUtils.getFileSize(filePath);

			return {
				success: true,
				text,
				fileName,
				fileSize,
			};
		} catch (error: any) {
			console.error("Document parse error:", error);
			return { success: false, error: error.message };
		}
	},
);

export {};

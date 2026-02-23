import { dbManager } from "./manager";
import { Thread, Message, Document, DocumentSource } from "../../src/types";

/**
 * Thread operations
 */
export const threadOperations = {
	/**
	 * Create a new thread
	 */
	async create(name: string, type: "chat" | "rag"): Promise<Thread> {
		const result = await dbManager.query<Thread>(
			`INSERT INTO threads (name, type) 
       VALUES ($1, $2) 
       RETURNING *`,
			[name, type],
		);
		return result.rows[0];
	},

	/**
	 * Get all threads
	 */
	async list(): Promise<Thread[]> {
		const result = await dbManager.query<Thread>(
			`SELECT * FROM threads 
       ORDER BY updated_at DESC`,
		);
		return result.rows;
	},

	/**
	 * Get a specific thread by ID
	 */
	async getById(threadId: string): Promise<Thread | null> {
		const result = await dbManager.query<Thread>(
			`SELECT * FROM threads WHERE id = $1`,
			[threadId],
		);
		return result.rows[0] || null;
	},

	/**
	 * Update thread name
	 */
	async updateName(threadId: string, name: string): Promise<Thread> {
		const result = await dbManager.query<Thread>(
			`UPDATE threads 
       SET name = $1 
       WHERE id = $2 
       RETURNING *`,
			[name, threadId],
		);
		return result.rows[0];
	},

	/**
	 * Delete a thread (cascades to messages, documents, embeddings)
	 */
	async delete(threadId: string): Promise<void> {
		await dbManager.query(`DELETE FROM threads WHERE id = $1`, [threadId]);
	},

	/**
	 * Touch thread (update updated_at timestamp)
	 */
	async touch(threadId: string): Promise<void> {
		await dbManager.query(
			`UPDATE threads SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
			[threadId],
		);
	},
};

/**
 * Message operations
 */
export const messageOperations = {
	/**
	 * Create a new message
	 */
	async create(
		threadId: string,
		role: "user" | "assistant",
		content: string,
	): Promise<Message> {
		const result = await dbManager.transaction(async (client) => {
			// Insert message
			const messageResult = await client.query<Message>(
				`INSERT INTO messages (thread_id, role, content) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
				[threadId, role, content],
			);

			// Update thread's updated_at
			await client.query(
				`UPDATE threads SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
				[threadId],
			);

			return messageResult;
		});

		return result.rows[0];
	},

	/**
	 * Get all messages for a thread
	 */
	async listByThread(threadId: string): Promise<Message[]> {
		const result = await dbManager.query<Message>(
			`SELECT m.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'document_id', ms.document_id,
              'document_name', d.name,
              'chunk_text', e.chunk_text,
              'similarity', ms.similarity_score
            )
          ) FILTER (WHERE ms.id IS NOT NULL), 
          '[]'
        ) as sources
       FROM messages m
       LEFT JOIN message_sources ms ON m.id = ms.message_id
       LEFT JOIN documents d ON ms.document_id = d.id
       LEFT JOIN embeddings e ON ms.embedding_id = e.id
       WHERE m.thread_id = $1
       GROUP BY m.id
       ORDER BY m.created_at ASC`,
			[threadId],
		);
		return result.rows;
	},

	/**
	 * Get a specific message by ID
	 */
	async getById(messageId: string): Promise<Message | null> {
		const result = await dbManager.query<Message>(
			`SELECT * FROM messages WHERE id = $1`,
			[messageId],
		);
		return result.rows[0] || null;
	},

	/**
	 * Delete a message
	 */
	async delete(messageId: string): Promise<void> {
		await dbManager.query(`DELETE FROM messages WHERE id = $1`, [
			messageId,
		]);
	},

	/**
	 * Add sources to a message (for RAG mode)
	 */
	async addSources(
		messageId: string,
		sources: Array<{
			documentId: string;
			embeddingId: string;
			similarity: number;
		}>,
	): Promise<void> {
		if (sources.length === 0) return;

		const values = sources
			.map((_, index) => {
				const offset = index * 4;
				return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
			})
			.join(", ");

		const params = sources.flatMap((source) => [
			messageId,
			source.documentId,
			source.embeddingId,
			source.similarity,
		]);

		await dbManager.query(
			`INSERT INTO message_sources (message_id, document_id, embedding_id, similarity_score)
       VALUES ${values}`,
			params,
		);
	},
};

/**
 * Document operations
 */
export const documentOperations = {
	/**
	 * Create a new document
	 */
	async create(
		threadId: string,
		name: string,
		fileType: "pdf" | "txt" | "md" | "docx",
		fileSize: number,
	): Promise<Document> {
		const result = await dbManager.query<Document>(
			`INSERT INTO documents (thread_id, name, file_type, file_size) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
			[threadId, name, fileType, fileSize],
		);
		return result.rows[0];
	},

	/**
	 * Get all documents for a thread
	 */
	async listByThread(threadId: string): Promise<Document[]> {
		const result = await dbManager.query<Document>(
			`SELECT * FROM documents 
       WHERE thread_id = $1 
       ORDER BY uploaded_at DESC`,
			[threadId],
		);
		return result.rows;
	},

	/**
	 * Get a specific document by ID
	 */
	async getById(documentId: string): Promise<Document | null> {
		const result = await dbManager.query<Document>(
			`SELECT * FROM documents WHERE id = $1`,
			[documentId],
		);
		return result.rows[0] || null;
	},

	/**
	 * Update document chunk count
	 */
	async updateChunkCount(
		documentId: string,
		chunkCount: number,
	): Promise<void> {
		await dbManager.query(
			`UPDATE documents SET chunk_count = $1 WHERE id = $2`,
			[chunkCount, documentId],
		);
	},

	/**
	 * Delete a document (cascades to embeddings)
	 */
	async delete(documentId: string): Promise<void> {
		await dbManager.query(`DELETE FROM documents WHERE id = $1`, [
			documentId,
		]);
	},

	/**
	 * Get document count for thread
	 */
	async getCountByThread(threadId: string): Promise<number> {
		const result = await dbManager.query<{ count: string }>(
			`SELECT COUNT(*) as count FROM documents WHERE thread_id = $1`,
			[threadId],
		);
		return parseInt(result.rows[0]?.count || "0");
	},
};

/**
 * Embedding operations
 */
export const embeddingOperations = {
	/**
	 * Store embeddings for a document
	 */
	async batchInsert(
		documentId: string,
		threadId: string,
		chunks: Array<{ text: string; index: number; embedding: number[] }>,
	): Promise<void> {
		if (chunks.length === 0) return;

		await dbManager.transaction(async (client) => {
			for (const chunk of chunks) {
				await client.query(
					`INSERT INTO embeddings (document_id, thread_id, chunk_text, chunk_index, embedding)
           VALUES ($1, $2, $3, $4, $5)`,
					[
						documentId,
						threadId,
						chunk.text,
						chunk.index,
						JSON.stringify(chunk.embedding),
					],
				);
			}

			// Update document chunk count
			await client.query(
				`UPDATE documents SET chunk_count = $1 WHERE id = $2`,
				[chunks.length, documentId],
			);
		});
	},

	/**
	 * Search for similar embeddings (vector similarity search)
	 */
	async search(
		threadId: string,
		queryEmbedding: number[],
		limit: number = 5,
		similarityThreshold: number = 0.7,
	): Promise<
		Array<{
			id: string;
			documentId: string;
			documentName: string;
			chunkText: string;
			similarity: number;
		}>
	> {
		// Using cosine similarity with pgvector
		// 1 - (embedding <=> query) gives us cosine similarity
		const result = await dbManager.query(
			`SELECT 
        e.id,
        e.document_id,
        d.name as document_name,
        e.chunk_text,
        1 - (e.embedding <=> $1::vector) as similarity
       FROM embeddings e
       JOIN documents d ON e.document_id = d.id
       WHERE e.thread_id = $2
         AND 1 - (e.embedding <=> $1::vector) >= $3
       ORDER BY e.embedding <=> $1::vector
       LIMIT $4`,
			[
				JSON.stringify(queryEmbedding),
				threadId,
				similarityThreshold,
				limit,
			],
		);

		return result.rows.map((row) => ({
			id: row.id,
			documentId: row.document_id,
			documentName: row.document_name,
			chunkText: row.chunk_text,
			similarity: parseFloat(row.similarity),
		}));
	},

	/**
	 * Get all embeddings for a document
	 */
	async listByDocument(documentId: string): Promise<any[]> {
		const result = await dbManager.query(
			`SELECT * FROM embeddings 
       WHERE document_id = $1 
       ORDER BY chunk_index ASC`,
			[documentId],
		);
		return result.rows;
	},

	/**
	 * Delete all embeddings for a document
	 */
	async deleteByDocument(documentId: string): Promise<void> {
		await dbManager.query(`DELETE FROM embeddings WHERE document_id = $1`, [
			documentId,
		]);
	},

	/**
	 * Get embedding count for thread
	 */
	async getCountByThread(threadId: string): Promise<number> {
		const result = await dbManager.query<{ count: string }>(
			`SELECT COUNT(*) as count FROM embeddings WHERE thread_id = $1`,
			[threadId],
		);
		return parseInt(result.rows[0]?.count || "0");
	},
};

/**
 * Message source operations (for RAG mode)
 */
export const messageSourceOperations = {
	/**
	 * Link a message to its source chunks
	 */
	async batchInsert(
		messageId: string,
		sources: Array<{
			documentId: string;
			embeddingId: string;
			similarityScore: number;
		}>,
	): Promise<void> {
		if (sources.length === 0) return;

		await dbManager.transaction(async (client) => {
			for (const source of sources) {
				await client.query(
					`INSERT INTO message_sources (message_id, document_id, embedding_id, similarity_score)
					 VALUES ($1, $2, $3, $4)`,
					[
						messageId,
						source.documentId,
						source.embeddingId,
						source.similarityScore,
					],
				);
			}
		});
	},

	/**
	 * Get sources for a specific message
	 */
	async getByMessage(messageId: string): Promise<DocumentSource[]> {
		const result = await dbManager.query(
			`SELECT 
				ms.id,
				ms.document_id,
				ms.embedding_id,
				ms.similarity_score,
				d.name as document_name,
				e.chunk_text,
				e.chunk_index
			 FROM message_sources ms
			 JOIN documents d ON ms.document_id = d.id
			 JOIN embeddings e ON ms.embedding_id = e.id
			 WHERE ms.message_id = $1
			 ORDER BY ms.similarity_score DESC`,
			[messageId],
		);

		return result.rows.map((row) => ({
			document_id: row.document_id,
			document_name: row.document_name,
			chunk_text: row.chunk_text,
			similarity: parseFloat(row.similarity_score),
		}));
	},

	/**
	 * Delete sources for a message
	 */
	async deleteByMessage(messageId: string): Promise<void> {
		await dbManager.query(
			`DELETE FROM message_sources WHERE message_id = $1`,
			[messageId],
		);
	},
};

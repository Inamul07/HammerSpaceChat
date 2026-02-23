import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiModel } from "../types";

/**
 * Send a message to Gemini and get a streaming response
 * @param message - The user's message
 * @param apiKey - Gemini API key
 * @param model - The Gemini model to use
 * @param onChunk - Callback for each chunk of the response
 * @returns The complete response text
 */
export async function sendMessageStreaming(
	message: string,
	apiKey: string,
	model: GeminiModel,
	onChunk: (text: string) => void,
): Promise<string> {
	if (!apiKey) {
		throw new Error("Gemini API key is required");
	}

	const genAI = new GoogleGenerativeAI(apiKey);
	const geminiModel = genAI.getGenerativeModel({ model });

	try {
		const result = await geminiModel.generateContentStream(message);
		let fullResponse = "";

		for await (const chunk of result.stream) {
			const chunkText = chunk.text();
			fullResponse += chunkText;
			onChunk(chunkText);
		}

		return fullResponse;
	} catch (error: any) {
		console.error("Gemini API error:", error);
		throw new Error(error.message || "Failed to get response from Gemini");
	}
}

/**
 * Send a message to Gemini and get the complete response at once
 * @param message - The user's message
 * @param apiKey - Gemini API key
 * @param model - The Gemini model to use
 * @returns The complete response text
 */
export async function sendMessage(
	message: string,
	apiKey: string,
	model: GeminiModel,
): Promise<string> {
	if (!apiKey) {
		throw new Error("Gemini API key is required");
	}

	const genAI = new GoogleGenerativeAI(apiKey);
	const geminiModel = genAI.getGenerativeModel({ model });

	try {
		const result = await geminiModel.generateContent(message);
		const response = result.response;
		return response.text();
	} catch (error: any) {
		console.error("Gemini API error:", error);
		throw new Error(error.message || "Failed to get response from Gemini");
	}
}

/**
 * Generate embeddings for a single text using Gemini
 * @param text - Text to generate embedding for
 * @param apiKey - Gemini API key
 * @returns 768-dimensional embedding vector (using Matryoshka learning)
 */
export async function generateEmbedding(
	text: string,
	apiKey: string,
): Promise<number[]> {
	if (!apiKey) {
		throw new Error("Gemini API key is required");
	}

	const genAI = new GoogleGenerativeAI(apiKey);
	const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

	try {
		// Request 768 dimensions using Matryoshka Representation Learning
		const result = await model.embedContent({
			content: { parts: [{ text }] },
			taskType: "RETRIEVAL_DOCUMENT",
			outputDimensionality: 768,
		});
		return result.embedding.values;
	} catch (error: any) {
		console.error("Gemini embedding error:", error);
		throw new Error(
			error.message || "Failed to generate embedding from Gemini",
		);
	}
}

/**
 * Generate query embedding for vector search (optimized for RAG retrieval)
 * @param query - User query text
 * @param apiKey - Gemini API key
 * @returns 768-dimensional embedding vector optimized for search
 */
export async function generateQueryEmbedding(
	query: string,
	apiKey: string,
): Promise<number[]> {
	if (!apiKey) {
		throw new Error("Gemini API key is required");
	}

	const genAI = new GoogleGenerativeAI(apiKey);
	const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

	try {
		// Use RETRIEVAL_QUERY task type for user queries
		const result = await model.embedContent({
			content: { parts: [{ text: query }] },
			taskType: "RETRIEVAL_QUERY",
			outputDimensionality: 768,
		});
		return result.embedding.values;
	} catch (error: any) {
		console.error("Gemini query embedding error:", error);
		throw new Error(
			error.message || "Failed to generate query embedding from Gemini",
		);
	}
}

/**
 * Generate embeddings for multiple texts in batch
 * @param texts - Array of texts to generate embeddings for
 * @param apiKey - Gemini API key
 * @param onProgress - Optional callback for progress updates
 * @returns Array of 768-dimensional embedding vectors (using Matryoshka learning)
 */
export async function generateEmbeddings(
	texts: string[],
	apiKey: string,
	onProgress?: (processed: number, total: number) => void,
): Promise<number[][]> {
	if (!apiKey) {
		throw new Error("Gemini API key is required");
	}

	const genAI = new GoogleGenerativeAI(apiKey);
	const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

	const embeddings: number[][] = [];

	for (let i = 0; i < texts.length; i++) {
		try {
			// Request 768 dimensions using Matryoshka Representation Learning
			const result = await model.embedContent({
				content: { parts: [{ text: texts[i] }] },
				taskType: "RETRIEVAL_DOCUMENT",
				outputDimensionality: 768,
			});
			embeddings.push(result.embedding.values);

			if (onProgress) {
				onProgress(i + 1, texts.length);
			}

			// Rate limiting: small delay between requests to prevent API throttling
			// and allow garbage collection
			if (i < texts.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, 150));
			}
		} catch (error: any) {
			console.error(`Embedding error for chunk ${i}:`, error);
			// Push a zero vector if embedding fails (768 dimensions)
			embeddings.push(new Array(768).fill(0));
		}
	}

	return embeddings;
}

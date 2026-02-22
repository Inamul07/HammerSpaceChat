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

import { RAGConfig } from "../types";

export interface TextChunk {
	text: string;
	index: number;
}

/**
 * Split text into chunks with overlap for RAG processing
 * @param text - The text to chunk
 * @param chunkSize - Maximum characters per chunk
 * @param chunkOverlap - Number of overlapping characters between chunks
 * @returns Array of text chunks with metadata
 */
export function chunkText(
	text: string,
	chunkSize: number,
	chunkOverlap: number,
): TextChunk[] {
	const chunks: TextChunk[] = [];

	// Safety check: reject extremely large texts
	if (text.length > 500000) {
		throw new Error(
			`Text too large for chunking: ${text.length} characters. Maximum is 500,000.`,
		);
	}

	// Remove excessive whitespace and normalize
	// Do this in smaller operations to avoid memory spikes
	let normalizedText = text.replace(/\r\n/g, "\n");
	normalizedText = normalizedText.replace(/\n{3,}/g, "\n\n");
	normalizedText = normalizedText.trim();

	if (normalizedText.length === 0) {
		return chunks;
	}

	let startIndex = 0;
	let chunkIndex = 0;
	let iterationCount = 0;
	const MAX_ITERATIONS = 10000; // Safety limit to prevent infinite loops

	while (startIndex < normalizedText.length) {
		// Safety check to prevent infinite loops
		iterationCount++;
		if (iterationCount > MAX_ITERATIONS) {
			console.error(
				"Chunking exceeded maximum iterations, stopping to prevent crash",
			);
			break;
		}

		// Calculate end point for this chunk
		let endIndex = Math.min(startIndex + chunkSize, normalizedText.length);

		// If this is not the last chunk, try to break at a natural boundary
		if (endIndex < normalizedText.length) {
			const searchStart = Math.max(startIndex, endIndex - 200); // Look back max 200 chars

			// Look for paragraph break
			let breakPoint = normalizedText.lastIndexOf("\n\n", endIndex);
			if (breakPoint < searchStart) breakPoint = -1;

			// If no paragraph break, look for sentence break
			if (breakPoint === -1) {
				const sentenceBreaks = [
					normalizedText.lastIndexOf(". ", endIndex),
					normalizedText.lastIndexOf("! ", endIndex),
					normalizedText.lastIndexOf("? ", endIndex),
				];
				breakPoint = Math.max(...sentenceBreaks);
				if (breakPoint < searchStart) breakPoint = -1;
			}

			// If no sentence break, look for any whitespace
			if (breakPoint === -1) {
				breakPoint = normalizedText.lastIndexOf(" ", endIndex);
				if (breakPoint < searchStart) breakPoint = -1;
			}

			// Use break point if found and valid
			if (breakPoint > startIndex) {
				endIndex = breakPoint + 1;
			}
		}

		// Extract the chunk
		const chunkText = normalizedText.slice(startIndex, endIndex).trim();

		if (chunkText.length > 0) {
			chunks.push({
				text: chunkText,
				index: chunkIndex++,
			});
		}

		// CRITICAL: Always move forward, never backward
		// Calculate next start with overlap, but ensure we advance
		const nextStart = Math.max(
			endIndex - chunkOverlap,
			startIndex + 1, // ALWAYS advance at least 1 character
		);

		// If nextStart would go backward or stay in place, jump to endIndex
		if (nextStart <= startIndex) {
			startIndex = endIndex;
		} else {
			startIndex = nextStart;
		}

		// Safety: if we're not making progress, force advancement
		if (
			startIndex >= normalizedText.length - 1 &&
			endIndex >= normalizedText.length
		) {
			break;
		}
	}

	return chunks;
}

/**
 * Process a document file and extract text content
 * This is a renderer-process utility that delegates to Electron main process
 * @param filePath - Path to the document file
 * @param fileType - Type of document (pdf, txt, md, docx)
 * @returns Extracted text content
 */
export async function parseDocument(
	filePath: string,
	fileType: "pdf" | "txt" | "md" | "docx",
): Promise<string> {
	// This will be called from renderer process
	// Electron main process handles actual file reading
	const content = await window.electronAPI.file.readFile(filePath);

	if (fileType === "txt" || fileType === "md") {
		// For text files, convert buffer to string
		return new TextDecoder("utf-8").decode(content);
	}

	// For PDF and DOCX, we need main process to handle parsing
	// This is a placeholder - actual implementation needs IPC handlers
	throw new Error(`Parsing ${fileType} files requires main process handler`);
}

/**
 * Estimate token count for text (rough approximation)
 * @param text - Text to count tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
	// Rough estimate: 1 token ≈ 4 characters for English text
	return Math.ceil(text.length / 4);
}

/**
 * Get file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 Bytes";

	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Validate if a file type is supported
 * @param fileName - Name of the file
 * @returns File type if supported, null otherwise
 */
export function getSupportedFileType(
	fileName: string,
): "pdf" | "txt" | "md" | "docx" | null {
	const extension = fileName.toLowerCase().split(".").pop();

	switch (extension) {
		case "pdf":
			return "pdf";
		case "txt":
			return "txt";
		case "md":
		case "markdown":
			return "md";
		case "docx":
			return "docx";
		default:
			return null;
	}
}

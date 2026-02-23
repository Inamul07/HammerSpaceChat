import * as fs from "fs";
import * as path from "path";
import pdf from "pdf-parse";
import mammoth from "mammoth";

/**
 * Parse a PDF file and extract text content
 * @param filePath - Path to the PDF file
 * @returns Extracted text content
 */
export async function parsePDF(filePath: string): Promise<string> {
	const dataBuffer = fs.readFileSync(filePath);
	const data = await pdf(dataBuffer);
	return data.text;
}

/**
 * Parse a DOCX file and extract text content
 * @param filePath - Path to the DOCX file
 * @returns Extracted text content
 */
export async function parseDOCX(filePath: string): Promise<string> {
	const result = await mammoth.extractRawText({ path: filePath });
	return result.value;
}

/**
 * Parse a text file (TXT/MD) and extract content
 * @param filePath - Path to the text file
 * @returns File content as string
 */
export async function parseTextFile(filePath: string): Promise<string> {
	return fs.readFileSync(filePath, "utf-8");
}

/**
 * Parse any supported document type
 * @param filePath - Path to the document
 * @param fileType - Type of document
 * @returns Extracted text content
 */
export async function parseDocument(
	filePath: string,
	fileType: "pdf" | "txt" | "md" | "docx",
): Promise<string> {
	switch (fileType) {
		case "pdf":
			return parsePDF(filePath);
		case "docx":
			return parseDOCX(filePath);
		case "txt":
		case "md":
			return parseTextFile(filePath);
		default:
			throw new Error(`Unsupported file type: ${fileType}`);
	}
}

/**
 * Get file size in bytes
 * @param filePath - Path to the file
 * @returns File size in bytes
 */
export function getFileSize(filePath: string): number {
	const stats = fs.statSync(filePath);
	return stats.size;
}

/**
 * Get file name from path
 * @param filePath - Full file path
 * @returns File name
 */
export function getFileName(filePath: string): string {
	return path.basename(filePath);
}

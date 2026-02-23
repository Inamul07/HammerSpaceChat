import { useEffect, useRef, useState } from "react";
import {
	Input,
	Button,
	Empty,
	Typography,
	Space,
	Avatar,
	Tag,
	Spin,
	message as antMessage,
} from "antd";
import {
	SendOutlined,
	UserOutlined,
	RobotOutlined,
	FileTextOutlined,
	UploadOutlined,
} from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useAppStore } from "../../store";
import { Message } from "../../types";
import {
	sendMessageStreaming,
	generateEmbeddings,
	generateQueryEmbedding,
} from "../../utils/ai";
import {
	chunkText,
	getSupportedFileType,
	TextChunk,
} from "../../utils/documents";
import "./ChatView.css";

const { TextArea } = Input;
const { Text, Title } = Typography;

// Custom code block component with syntax highlighting
const CodeBlock = ({
	language,
	children,
}: {
	language?: string;
	children: string;
}) => {
	return (
		<SyntaxHighlighter
			style={vscDarkPlus}
			language={language || "text"}
			PreTag="div"
			customStyle={{
				margin: "12px 0",
				borderRadius: "6px",
				background: "#1e1e1e",
			}}
		>
			{children}
		</SyntaxHighlighter>
	);
};

export const ChatView = () => {
	const {
		settings,
		threads,
		currentThreadId,
		messages,
		documents,
		isLoadingMessages,
		isSendingMessage,
		setMessages,
		setDocuments,
		setLoadingMessages,
		setSendingMessage,
		addMessage,
	} = useAppStore();

	const [inputMessage, setInputMessage] = useState("");
	const [streamingMessage, setStreamingMessage] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const currentThread = threads.find((t) => t.id === currentThreadId);

	// Load messages when thread changes
	useEffect(() => {
		if (!currentThreadId) {
			setMessages([]);
			setDocuments([]);
			return;
		}

		const loadMessages = async () => {
			setLoadingMessages(true);
			try {
				const result =
					await window.electronAPI.message.list(currentThreadId);
				if (result.success && result.messages) {
					setMessages(result.messages);
				}
			} catch (error) {
				console.error("Failed to load messages:", error);
			} finally {
				setLoadingMessages(false);
			}
		};

		const loadDocuments = async () => {
			if (currentThread?.type !== "rag") return;
			try {
				const result =
					await window.electronAPI.document.list(currentThreadId);
				if (result.success && result.documents) {
					setDocuments(result.documents);
				}
			} catch (error) {
				console.error("Failed to load documents:", error);
			}
		};

		loadMessages();
		loadDocuments();
	}, [currentThreadId]);

	// Auto-scroll to bottom when new messages arrive or streaming updates
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, streamingMessage]);

	const handleSendMessage = async () => {
		if (!inputMessage.trim() || !currentThreadId || isSendingMessage)
			return;

		// Check if API key is set
		if (!settings.geminiApiKey) {
			antMessage.error(
				"Please set your Gemini API key in Settings first",
			);
			return;
		}

		const userMessage = inputMessage.trim();
		setInputMessage("");
		setSendingMessage(true);
		setStreamingMessage("");

		try {
			// Save user message to database
			const userMsgResult = await window.electronAPI.message.create(
				currentThreadId,
				"user",
				userMessage,
			);

			if (!userMsgResult.success || !userMsgResult.message) {
				throw new Error(
					userMsgResult.error || "Failed to save user message",
				);
			}

			// Add user message to UI
			addMessage(userMsgResult.message);

			let finalPrompt = userMessage;
			let retrievedSources: any[] = [];

			// For RAG mode, retrieve context from documents
			if (currentThread?.type === "rag") {
				try {
					// Generate query embedding
					const queryEmbedding = await generateQueryEmbedding(
						userMessage,
						settings.geminiApiKey,
					);

					// Search for similar chunks
					const searchResult =
						await window.electronAPI.embedding.search(
							currentThreadId,
							queryEmbedding,
							settings.ragConfig.retrievalCount,
							settings.ragConfig.similarityThreshold,
						);

					if (
						searchResult.success &&
						searchResult.results &&
						searchResult.results.length > 0
					) {
						retrievedSources = searchResult.results;

						// Build context from retrieved chunks
						const context = searchResult.results
							.map(
								(result, idx) =>
									`[${idx + 1}] From "${result.documentName}":\n${result.chunkText}`,
							)
							.join("\n\n");

						// Inject context into prompt
						finalPrompt = `You are a helpful assistant. Use the following context to answer the user's question. If the context doesn't contain relevant information, say so and provide a general answer.

Context:
${context}

User Question: ${userMessage}

Answer:`;
					}
				} catch (error) {
					console.error("RAG retrieval error:", error);
					// Continue with normal chat if RAG fails
					antMessage.warning(
						"Failed to retrieve document context. Responding without context.",
					);
				}
			}

			// Get AI response with streaming
			let fullResponse = "";
			await sendMessageStreaming(
				finalPrompt,
				settings.geminiApiKey,
				settings.geminiModel,
				(chunk) => {
					fullResponse += chunk;
					setStreamingMessage(fullResponse);
				},
			);

			// Clear streaming message
			setStreamingMessage("");

			// Save assistant message to database
			const assistantMsgResult = await window.electronAPI.message.create(
				currentThreadId,
				"assistant",
				fullResponse,
			);

			if (!assistantMsgResult.success || !assistantMsgResult.message) {
				throw new Error(
					assistantMsgResult.error ||
						"Failed to save assistant message",
				);
			}

			// Link message to sources if using RAG
			if (
				currentThread?.type === "rag" &&
				retrievedSources.length > 0 &&
				assistantMsgResult.message
			) {
				const sources = retrievedSources.map((source) => ({
					documentId: source.documentId,
					embeddingId: source.id,
					similarityScore: source.similarity,
				}));

				await window.electronAPI.messageSource.batchInsert(
					assistantMsgResult.message.id,
					sources,
				);
			}

			// Add assistant message to UI
			addMessage(assistantMsgResult.message);
		} catch (error: any) {
			console.error("Error sending message:", error);
			antMessage.error(
				error.message || "Failed to send message. Please try again.",
			);
			setStreamingMessage("");
		} finally {
			setSendingMessage(false);
		}
	};

	const handleUploadDocuments = async () => {
		if (!currentThreadId || !settings.geminiApiKey) {
			antMessage.error(
				"Please set your Gemini API key in Settings first",
			);
			return;
		}

		try {
			// Open file picker
			const result = await window.electronAPI.file.pickFiles();

			if (
				!result.success ||
				!result.filePaths ||
				result.filePaths.length === 0
			) {
				return; // User cancelled
			}

			const { ragConfig } = settings;

			for (const filePath of result.filePaths) {
				const fileName = filePath.split("/").pop() || "unknown";
				const fileType = getSupportedFileType(fileName);

				if (!fileType) {
					antMessage.error(`Unsupported file type: ${fileName}`);
					continue;
				}

				antMessage.loading({
					content: `Processing ${fileName}...`,
					key: fileName,
					duration: 0,
				});

				// Parse document
				const parseResult = await window.electronAPI.file.parseDocument(
					filePath,
					fileType,
				);

				if (!parseResult.success || !parseResult.text) {
					antMessage.error({
						content: `Failed to parse ${fileName}`,
						key: fileName,
					});
					continue;
				}

				// STRICT memory limits to prevent OOM crashes
				// File size limit: 2MB
				const MAX_FILE_SIZE = 2 * 1024 * 1024;
				if (
					parseResult.fileSize &&
					parseResult.fileSize > MAX_FILE_SIZE
				) {
					antMessage.error({
						content: `File too large: ${fileName}. Maximum size is 2MB to prevent memory issues.`,
						key: fileName,
					});
					continue;
				}

				// Text length limit: 500KB (500,000 characters)
				// This is essential to prevent OOM during string operations
				const MAX_TEXT_LENGTH = 500000;
				if (parseResult.text.length > MAX_TEXT_LENGTH) {
					antMessage.error({
						content: `Document text too large: ${fileName} (${Math.round(parseResult.text.length / 1000)}KB). Maximum is 500KB.`,
						key: fileName,
					});
					continue;
				}

				// Chunk the text with try-catch for safety
				let chunks: TextChunk[];
				try {
					chunks = chunkText(
						parseResult.text,
						ragConfig.chunkSize,
						ragConfig.chunkOverlap,
					);
				} catch (error: any) {
					console.error("Chunking error:", error);
					antMessage.error({
						content: `Failed to process ${fileName}: Memory error. File may be too large.`,
						key: fileName,
					});
					continue;
				}

				if (chunks.length === 0) {
					antMessage.error({
						content: `No text content found in ${fileName}`,
						key: fileName,
					});
					continue;
				}

				// Limit number of chunks to prevent excessive memory usage
				const MAX_CHUNKS = 500;
				if (chunks.length > MAX_CHUNKS) {
					antMessage.warning({
						content: `Document has ${chunks.length} chunks. Limiting to ${MAX_CHUNKS} for memory safety.`,
						key: fileName,
					});
					chunks = chunks.slice(0, MAX_CHUNKS);
				}

				// Create document record
				const docResult = await window.electronAPI.document.create(
					currentThreadId,
					fileName,
					fileType,
					parseResult.fileSize || 0,
				);

				if (!docResult.success || !docResult.document) {
					antMessage.error({
						content: `Failed to save ${fileName}`,
						key: fileName,
					});
					continue;
				}

				// Generate embeddings in ultra-small batches to avoid memory issues
				// Using batch size of 3 for maximum memory safety
				const BATCH_SIZE = 3;
				const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);
				let processedChunks = 0;

				for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
					const startIdx = batchIdx * BATCH_SIZE;
					const endIdx = Math.min(
						startIdx + BATCH_SIZE,
						chunks.length,
					);
					const batchChunks = chunks.slice(startIdx, endIdx);

					antMessage.loading({
						content: `Generating embeddings for ${fileName} (${processedChunks}/${chunks.length} chunks)...`,
						key: fileName,
						duration: 0,
					});

					// Generate embeddings for this batch
					const batchTexts = batchChunks.map((c) => c.text);
					const batchEmbeddings = await generateEmbeddings(
						batchTexts,
						settings.geminiApiKey,
					);

					// Prepare batch for insertion
					const embeddingChunks = batchChunks.map((chunk, idx) => ({
						text: chunk.text,
						embedding: batchEmbeddings[idx],
						index: chunk.index,
					}));

					// Store this batch immediately
					const embedResult =
						await window.electronAPI.embedding.batchInsert(
							docResult.document.id,
							currentThreadId,
							embeddingChunks,
						);

					if (!embedResult.success) {
						antMessage.error({
							content: `Failed to store embeddings for ${fileName}`,
							key: fileName,
						});
						// Clean up document record
						await window.electronAPI.document.delete(
							docResult.document.id,
						);
						// Release memory
						chunks = [];
						continue;
					}

					processedChunks += batchChunks.length;

					// Increase delay to allow garbage collection between batches
					await new Promise((resolve) => setTimeout(resolve, 100));
				}

				// Save chunk count before releasing memory
				const totalChunks = chunks.length;

				// Release large objects from memory after processing
				chunks = [];

				// Update document chunk count in database
				await window.electronAPI.document.updateChunkCount(
					docResult.document.id,
					totalChunks,
				);

				// Update document chunk count in UI
				const updatedDoc = {
					...docResult.document,
					chunk_count: totalChunks,
				};

				// Add to UI
				setDocuments([...documents, updatedDoc]);

				antMessage.success({
					content: `Successfully uploaded ${fileName} (${totalChunks} chunks)`,
					key: fileName,
				});
			}
		} catch (error: any) {
			console.error("Document upload error:", error);
			antMessage.error(error.message || "Failed to upload documents");
		}
	};

	if (!currentThread) {
		return (
			<div className="chat-empty">
				<Empty
					description={
						<Space direction="vertical" align="center">
							<Text style={{ fontSize: 16, color: "#888" }}>
								No thread selected
							</Text>
							<Text type="secondary">
								Select a thread or create a new one to start
								chatting
							</Text>
						</Space>
					}
				/>
			</div>
		);
	}

	return (
		<div className="chat-view">
			{/* Header */}
			<div className="chat-header">
				<Space>
					<Title level={4} style={{ margin: 0 }}>
						{currentThread.name}
					</Title>
					<Tag
						color={currentThread.type === "chat" ? "blue" : "green"}
					>
						{currentThread.type === "chat"
							? "Normal Chat"
							: "RAG Mode"}
					</Tag>
				</Space>
				{currentThread.type === "rag" && (
					<Button
						icon={<UploadOutlined />}
						onClick={handleUploadDocuments}
						disabled={!settings.geminiApiKey}
					>
						Upload Documents
					</Button>
				)}
			</div>

			{/* Document List for RAG mode */}
			{currentThread.type === "rag" && documents.length > 0 && (
				<div className="chat-documents">
					<Space wrap>
						{documents.map((doc) => (
							<Tag
								key={doc.id}
								icon={<FileTextOutlined />}
								color="green"
							>
								{doc.name} ({doc.chunk_count} chunks)
							</Tag>
						))}
					</Space>
				</div>
			)}

			{/* Messages */}
			<div className="chat-messages">
				{isLoadingMessages ? (
					<div className="chat-loading">
						<Spin size="large" tip="Loading messages..." />
					</div>
				) : messages.length === 0 ? (
					<div className="chat-empty">
						<Empty
							description={
								<Space direction="vertical" align="center">
									<Text
										style={{ fontSize: 16, color: "#888" }}
									>
										No messages yet
									</Text>
									<Text type="secondary">
										Start a conversation below
									</Text>
								</Space>
							}
						/>
					</div>
				) : (
					<>
						{messages.map((message: Message) => (
							<div
								key={message.id}
								className={`message ${message.role === "user" ? "message-user" : "message-assistant"}`}
							>
								<Avatar
									icon={
										message.role === "user" ? (
											<UserOutlined />
										) : (
											<RobotOutlined />
										)
									}
									style={{
										backgroundColor:
											message.role === "user"
												? "#1677ff"
												: "#52c41a",
									}}
								/>
								<div className="message-content">
									<div className="message-header">
										<Text strong>
											{message.role === "user"
												? "You"
												: "Assistant"}
										</Text>
										<Text
											type="secondary"
											style={{ fontSize: 12 }}
										>
											{new Date(
												message.created_at,
											).toLocaleTimeString()}
										</Text>
									</div>
									<div className="message-text markdown-content">
										<ReactMarkdown
											remarkPlugins={[remarkGfm]}
											components={{
												code(props) {
													const {
														children,
														className,
														...rest
													} = props;
													const match =
														/language-(\w+)/.exec(
															className || "",
														);
													return match ? (
														<CodeBlock
															language={match[1]}
														>
															{String(
																children,
															).replace(
																/\n$/,
																"",
															)}
														</CodeBlock>
													) : (
														<code
															{...rest}
															className={
																className
															}
														>
															{children}
														</code>
													);
												},
											}}
										>
											{message.content}
										</ReactMarkdown>
									</div>
									{message.sources &&
										message.sources.length > 0 && (
											<div className="message-sources">
												<Text
													type="secondary"
													style={{ fontSize: 12 }}
												>
													Sources:
												</Text>
												{message.sources.map(
													(source, idx) => (
														<Tag
															key={idx}
															icon={
																<FileTextOutlined />
															}
															style={{
																fontSize: 11,
															}}
														>
															{
																source.document_name
															}{" "}
															(
															{(
																source.similarity *
																100
															).toFixed(0)}
															%)
														</Tag>
													),
												)}
											</div>
										)}
								</div>
							</div>
						))}

						{/* Streaming message being typed */}
						{streamingMessage && (
							<div className="message message-assistant">
								<Avatar
									icon={<RobotOutlined />}
									style={{
										backgroundColor: "#52c41a",
									}}
								/>
								<div className="message-content">
									<div className="message-header">
										<Text strong>Assistant</Text>
										<Text
											type="secondary"
											style={{ fontSize: 12 }}
										>
											typing...
										</Text>
									</div>
									<div className="message-text markdown-content">
										<ReactMarkdown
											remarkPlugins={[remarkGfm]}
											components={{
												code(props) {
													const {
														children,
														className,
														...rest
													} = props;
													const match =
														/language-(\w+)/.exec(
															className || "",
														);
													return match ? (
														<CodeBlock
															language={match[1]}
														>
															{String(
																children,
															).replace(
																/\n$/,
																"",
															)}
														</CodeBlock>
													) : (
														<code
															{...rest}
															className={
																className
															}
														>
															{children}
														</code>
													);
												},
											}}
										>
											{streamingMessage}
										</ReactMarkdown>
									</div>
								</div>
							</div>
						)}

						<div ref={messagesEndRef} />
					</>
				)}
			</div>

			{/* Input Area */}
			<div className="chat-input-area">
				<TextArea
					value={inputMessage}
					onChange={(e) => setInputMessage(e.target.value)}
					onPressEnter={(e) => {
						if (!e.shiftKey) {
							e.preventDefault();
							handleSendMessage();
						}
					}}
					placeholder={
						currentThread.type === "rag"
							? "Ask a question about your documents..."
							: "Type your message..."
					}
					autoSize={{ minRows: 1, maxRows: 4 }}
					disabled={isSendingMessage}
					className="chat-input"
				/>
				<Button
					type="primary"
					icon={<SendOutlined />}
					onClick={handleSendMessage}
					loading={isSendingMessage}
					disabled={!inputMessage.trim()}
					size="large"
				>
					Send
				</Button>
			</div>
		</div>
	);
};

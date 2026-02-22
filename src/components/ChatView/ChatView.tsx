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
import { useAppStore } from "../../store";
import { Message } from "../../types";
import { sendMessageStreaming } from "../../utils/ai";
import "./ChatView.css";

const { TextArea } = Input;
const { Text, Title } = Typography;

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

			// Get AI response with streaming
			let fullResponse = "";
			await sendMessageStreaming(
				userMessage,
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
						onClick={() => {
							/* Document upload will be implemented in Phase 5 */
						}}
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
									<div className="message-text">
										{message.content}
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
									<div className="message-text">
										{streamingMessage}
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

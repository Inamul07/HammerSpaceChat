import { useState } from "react";
import {
	Button,
	Input,
	List,
	Typography,
	Space,
	Popconfirm,
	Tag,
	Modal,
	Select,
	Divider,
	Badge,
} from "antd";
import {
	PlusOutlined,
	MessageOutlined,
	DeleteOutlined,
	SettingOutlined,
	FileTextOutlined,
} from "@ant-design/icons";
import { useAppStore } from "../../store";
import { Thread } from "../../types";
import "./Sidebar.css";

const { Text } = Typography;

export const Sidebar = () => {
	const {
		threads,
		currentThreadId,
		isDbConnected,
		setCurrentThread,
		addThread,
		removeThread,
		setSettingsOpen,
	} = useAppStore();

	const [isNewThreadModalOpen, setNewThreadModalOpen] = useState(false);
	const [newThreadName, setNewThreadName] = useState("");
	const [newThreadType, setNewThreadType] = useState<"chat" | "rag">("chat");
	const [isCreating, setCreating] = useState(false);

	const handleCreateThread = async () => {
		if (!newThreadName.trim()) return;
		if (!isDbConnected) {
			Modal.error({
				title: "Database Not Connected",
				content: "Please connect to the database first in Settings.",
			});
			return;
		}

		setCreating(true);
		try {
			const result = await window.electronAPI.thread.create(
				newThreadName.trim(),
				newThreadType,
			);
			if (result.success && result.thread) {
				addThread(result.thread);
				setCurrentThread(result.thread.id);
				setNewThreadModalOpen(false);
				setNewThreadName("");
				setNewThreadType("chat");
			} else {
				Modal.error({
					title: "Thread Creation Failed",
					content: result.error || "Unknown error",
				});
			}
		} catch (error: any) {
			Modal.error({
				title: "Thread Creation Failed",
				content: error.message,
			});
		} finally {
			setCreating(false);
		}
	};

	const handleDeleteThread = async (threadId: string) => {
		try {
			const result = await window.electronAPI.thread.delete(threadId);
			if (result.success) {
				removeThread(threadId);
			} else {
				Modal.error({
					title: "Delete Failed",
					content: result.error || "Unknown error",
				});
			}
		} catch (error: any) {
			Modal.error({
				title: "Delete Failed",
				content: error.message,
			});
		}
	};

	const handleSelectThread = (threadId: string) => {
		setCurrentThread(threadId);
	};

	return (
		<div className="sidebar">
			{/* Header with DB status and Settings */}
			<div className="sidebar-header">
				<Space
					direction="vertical"
					style={{ width: "100%" }}
					size="small"
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginTop: 8,
						}}
					>
						<Text strong style={{ color: "#fff", fontSize: 16 }}>
							HammerSpace Chat
						</Text>
						<Button
							type="text"
							icon={<SettingOutlined />}
							onClick={() => setSettingsOpen(true)}
							style={{ color: "#888" }}
						/>
					</div>
					<Badge
						status={isDbConnected ? "success" : "error"}
						text={
							<Text style={{ fontSize: 12, color: "#888" }}>
								{isDbConnected
									? "Database Connected"
									: "Database Disconnected"}
							</Text>
						}
					/>
				</Space>
			</div>

			<Divider style={{ margin: "12px 0", background: "#1f1f1f" }} />

			{/* New Thread Button */}
			<div className="sidebar-new-thread">
				<Button
					type="primary"
					icon={<PlusOutlined />}
					onClick={() => setNewThreadModalOpen(true)}
					block
					size="large"
					disabled={!isDbConnected}
				>
					New Thread
				</Button>
			</div>

			{/* Thread List */}
			<div className="sidebar-thread-list">
				<List
					dataSource={threads}
					locale={{
						emptyText: isDbConnected
							? "No threads yet"
							: "Connect to database first",
					}}
					renderItem={(thread: Thread) => (
						<List.Item
							className={`thread-item ${currentThreadId === thread.id ? "thread-item-active" : ""}`}
							onClick={() => handleSelectThread(thread.id)}
							style={{ cursor: "pointer" }}
						>
							<div className="thread-item-content">
								<div className="thread-item-header">
									<Space>
										{thread.type === "chat" ? (
											<MessageOutlined
												style={{ color: "#1677ff" }}
											/>
										) : (
											<FileTextOutlined
												style={{ color: "#52c41a" }}
											/>
										)}
										<Text
											strong
											className="thread-item-name"
										>
											{thread.name}
										</Text>
									</Space>
									<Popconfirm
										title="Delete this thread?"
										description="This will delete all messages and documents. This action cannot be undone."
										onConfirm={(e) => {
											e?.stopPropagation();
											handleDeleteThread(thread.id);
										}}
										okText="Delete"
										cancelText="Cancel"
										okButtonProps={{ danger: true }}
										onCancel={(e) => e?.stopPropagation()}
									>
										<Button
											type="text"
											danger
											size="small"
											icon={<DeleteOutlined />}
											onClick={(e) => e.stopPropagation()}
											className="thread-item-delete"
										/>
									</Popconfirm>
								</div>
								<div className="thread-item-meta">
									<Tag
										color={
											thread.type === "chat"
												? "blue"
												: "green"
										}
										style={{ fontSize: 11 }}
									>
										{thread.type.toUpperCase()}
									</Tag>
									<Text
										type="secondary"
										style={{ fontSize: 11 }}
									>
										{new Date(
											thread.updated_at,
										).toLocaleDateString()}
									</Text>
								</div>
							</div>
						</List.Item>
					)}
				/>
			</div>

			{/* New Thread Modal */}
			<Modal
				title="Create New Thread"
				open={isNewThreadModalOpen}
				onOk={handleCreateThread}
				onCancel={() => {
					setNewThreadModalOpen(false);
					setNewThreadName("");
					setNewThreadType("chat");
				}}
				okText="Create"
				confirmLoading={isCreating}
				okButtonProps={{ disabled: !newThreadName.trim() }}
			>
				<Space
					direction="vertical"
					style={{ width: "100%" }}
					size="middle"
				>
					<div>
						<Text>Thread Name</Text>
						<Input
							placeholder="Enter thread name"
							value={newThreadName}
							onChange={(e) => setNewThreadName(e.target.value)}
							onPressEnter={handleCreateThread}
							maxLength={100}
							style={{ marginTop: 8 }}
						/>
					</div>
					<div>
						<Text>Thread Type</Text>
						<Select
							value={newThreadType}
							onChange={setNewThreadType}
							style={{ width: "100%", marginTop: 8 }}
							options={[
								{
									value: "chat",
									label: (
										<Space>
											<MessageOutlined />
											Normal Chat
										</Space>
									),
								},
								{
									value: "rag",
									label: (
										<Space>
											<FileTextOutlined />
											RAG Mode (Document-based)
										</Space>
									),
								},
							]}
						/>
					</div>
					{newThreadType === "rag" && (
						<Text type="secondary" style={{ fontSize: 12 }}>
							RAG mode allows you to upload documents and chat
							with context from them.
						</Text>
					)}
				</Space>
			</Modal>
		</div>
	);
};

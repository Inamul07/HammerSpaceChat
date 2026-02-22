import { useState, useEffect } from "react";
import {
	Modal,
	Tabs,
	Form,
	Input,
	InputNumber,
	Slider,
	Button,
	Space,
	Typography,
	Alert,
} from "antd";
import {
	DatabaseOutlined,
	KeyOutlined,
	SettingOutlined,
	CheckCircleOutlined,
	CloseCircleOutlined,
	QuestionCircleOutlined,
} from "@ant-design/icons";
import { useAppStore } from "../../store";
import "./SettingsModal.css";

const { Text, Paragraph } = Typography;

export const SettingsModal = () => {
	const {
		isSettingsOpen,
		setSettingsOpen,
		settings,
		setSettings,
		isDbConnected,
		setDbConnected,
		setThreads,
	} = useAppStore();

	const [dbForm] = Form.useForm();
	const [activeTab, setActiveTab] = useState("database");
	const [isTesting, setTesting] = useState(false);
	const [isConnecting, setConnecting] = useState(false);
	const [testResult, setTestResult] = useState<{
		success: boolean;
		message: string;
	} | null>(null);

	// Initialize form with existing config
	useEffect(() => {
		if (settings.databaseConfig) {
			dbForm.setFieldsValue(settings.databaseConfig);
		}
	}, [settings.databaseConfig]);

	const handleTestConnection = async () => {
		try {
			const values = await dbForm.validateFields();
			setTesting(true);
			setTestResult(null);

			const result = await window.electronAPI.db.connect(values);

			if (result.success) {
				setTestResult({
					success: true,
					message: "Connection successful! Database is ready.",
				});

				// Check pgvector
				const pgvectorResult =
					await window.electronAPI.db.checkPgVector();
				if (!pgvectorResult.hasVector) {
					setTestResult({
						success: false,
						message:
							"Connection successful but pgvector extension is not enabled. Please enable it.",
					});
				}
			} else {
				setTestResult({
					success: false,
					message: result.error || "Connection failed",
				});
			}
		} catch (error: any) {
			setTestResult({
				success: false,
				message: error.message || "Invalid configuration",
			});
		} finally {
			setTesting(false);
		}
	};

	const handleConnect = async () => {
		try {
			const values = await dbForm.validateFields();
			setConnecting(true);

			const result = await window.electronAPI.db.connect(values);

			if (result.success) {
				setSettings({ databaseConfig: values });
				setDbConnected(true);

				// Load threads after connecting
				const threadsResult = await window.electronAPI.thread.list();
				if (threadsResult.success && threadsResult.threads) {
					setThreads(threadsResult.threads);
				}

				Modal.success({
					title: "Connected Successfully",
					content:
						"Database connection established. You can now create threads.",
				});
			} else {
				Modal.error({
					title: "Connection Failed",
					content: result.error || "Unknown error occurred",
				});
			}
		} catch (error: any) {
			Modal.error({
				title: "Connection Failed",
				content: error.message,
			});
		} finally {
			setConnecting(false);
		}
	};

	const handleDisconnect = async () => {
		try {
			await window.electronAPI.db.disconnect();
			setDbConnected(false);
			setThreads([]);
			Modal.info({
				title: "Disconnected",
				content: "Database connection closed.",
			});
		} catch (error: any) {
			Modal.error({
				title: "Disconnect Failed",
				content: error.message,
			});
		}
	};

	const handleSaveApiKey = () => {
		Modal.success({
			title: "API Key Saved",
			content: "Your Gemini API key has been saved locally.",
		});
	};

	const handleSaveRagConfig = () => {
		Modal.success({
			title: "RAG Settings Saved",
			content: "Your RAG configuration has been updated.",
		});
	};

	return (
		<Modal
			title={
				<Space>
					<SettingOutlined />
					Settings
				</Space>
			}
			open={isSettingsOpen}
			onCancel={() => setSettingsOpen(false)}
			footer={null}
			width={700}
			className="settings-modal"
		>
			<Tabs
				activeKey={activeTab}
				onChange={setActiveTab}
				items={[
					{
						key: "database",
						label: (
							<Space>
								<DatabaseOutlined />
								Database
								{isDbConnected ? (
									<CheckCircleOutlined
										style={{ color: "#52c41a" }}
									/>
								) : (
									<CloseCircleOutlined
										style={{ color: "#ff4d4f" }}
									/>
								)}
							</Space>
						),
						children: (
							<div className="settings-section">
								<Alert
									message="PostgreSQL Setup Required"
									description={
										<div>
											<Paragraph
												style={{ marginBottom: 8 }}
											>
												You need PostgreSQL with
												pgvector extension. To enable
												it, run:
											</Paragraph>
											<pre
												style={{
													background: "#1a1a1a",
													padding: 8,
													borderRadius: 4,
												}}
											>
												CREATE EXTENSION IF NOT EXISTS
												vector;
											</pre>
										</div>
									}
									type="info"
									showIcon
									icon={<QuestionCircleOutlined />}
									style={{ marginBottom: 16 }}
								/>

								<Form form={dbForm} layout="vertical">
									<Form.Item
										label="Host"
										name="host"
										initialValue="localhost"
										rules={[
											{
												required: true,
												message: "Host is required",
											},
										]}
									>
										<Input placeholder="localhost" />
									</Form.Item>

									<Form.Item
										label="Port"
										name="port"
										initialValue={5432}
										rules={[
											{
												required: true,
												message: "Port is required",
											},
										]}
									>
										<InputNumber
											placeholder="5432"
											style={{ width: "100%" }}
											min={1}
											max={65535}
										/>
									</Form.Item>

									<Form.Item
										label="Database"
										name="database"
										rules={[
											{
												required: true,
												message:
													"Database name is required",
											},
										]}
									>
										<Input placeholder="hammerspace_chat" />
									</Form.Item>

									<Form.Item
										label="User"
										name="user"
										rules={[
											{
												required: true,
												message: "User is required",
											},
										]}
									>
										<Input placeholder="postgres" />
									</Form.Item>

									<Form.Item label="Password" name="password">
										<Input.Password placeholder="Database password" />
									</Form.Item>
								</Form>

								{testResult && (
									<Alert
										message={
											testResult.success
												? "Success"
												: "Error"
										}
										description={testResult.message}
										type={
											testResult.success
												? "success"
												: "error"
										}
										showIcon
										closable
										onClose={() => setTestResult(null)}
										style={{ marginBottom: 16 }}
									/>
								)}

								<Space
									style={{
										width: "100%",
										justifyContent: "flex-end",
									}}
								>
									<Button
										onClick={handleTestConnection}
										loading={isTesting}
									>
										Test Connection
									</Button>
									{isDbConnected ? (
										<Button
											danger
											onClick={handleDisconnect}
										>
											Disconnect
										</Button>
									) : (
										<Button
											type="primary"
											onClick={handleConnect}
											loading={isConnecting}
										>
											Connect
										</Button>
									)}
								</Space>
							</div>
						),
					},
					{
						key: "api",
						label: (
							<Space>
								<KeyOutlined />
								API Keys
							</Space>
						),
						children: (
							<div className="settings-section">
								<Alert
									message="Your API keys are stored locally and never sent anywhere except to the respective AI providers."
									type="info"
									showIcon
									style={{ marginBottom: 16 }}
								/>

								<Form layout="vertical">
									<Form.Item
										label="Google Gemini API Key"
										extra={
											<Text
												type="secondary"
												style={{ fontSize: 12 }}
											>
												Get your API key from{" "}
												<a
													href="https://makersuite.google.com/app/apikey"
													target="_blank"
													rel="noopener noreferrer"
												>
													Google AI Studio
												</a>
											</Text>
										}
									>
										<Input.Password
											placeholder="Enter your Gemini API key"
											value={settings.geminiApiKey}
											onChange={(e) =>
												setSettings({
													geminiApiKey:
														e.target.value,
												})
											}
										/>
									</Form.Item>
								</Form>

								<Space
									style={{
										width: "100%",
										justifyContent: "flex-end",
									}}
								>
									<Button
										type="primary"
										onClick={handleSaveApiKey}
										disabled={!settings.geminiApiKey}
									>
										Save API Key
									</Button>
								</Space>
							</div>
						),
					},
					{
						key: "rag",
						label: (
							<Space>
								<SettingOutlined />
								RAG Configuration
							</Space>
						),
						children: (
							<div className="settings-section">
								<Alert
									message="Configure RAG Mode Settings"
									description="These settings control how documents are processed and retrieved for RAG mode."
									type="info"
									showIcon
									style={{ marginBottom: 16 }}
								/>

								<Form layout="vertical">
									<Form.Item
										label={`Chunk Size: ${settings.ragConfig.chunkSize} words`}
										extra="Size of each document chunk for embedding"
									>
										<Slider
											min={100}
											max={1000}
											step={50}
											value={settings.ragConfig.chunkSize}
											onChange={(value) =>
												setSettings({
													ragConfig: {
														...settings.ragConfig,
														chunkSize: value,
													},
												})
											}
											marks={{
												100: "100",
												500: "500",
												1000: "1000",
											}}
										/>
									</Form.Item>

									<Form.Item
										label={`Chunk Overlap: ${settings.ragConfig.chunkOverlap} words`}
										extra="Overlap between consecutive chunks to maintain context"
									>
										<Slider
											min={0}
											max={200}
											step={10}
											value={
												settings.ragConfig.chunkOverlap
											}
											onChange={(value) =>
												setSettings({
													ragConfig: {
														...settings.ragConfig,
														chunkOverlap: value,
													},
												})
											}
											marks={{
												0: "0",
												100: "100",
												200: "200",
											}}
										/>
									</Form.Item>

									<Form.Item
										label={`Retrieval Count: ${settings.ragConfig.retrievalCount} chunks`}
										extra="Number of most relevant chunks to retrieve"
									>
										<Slider
											min={1}
											max={10}
											value={
												settings.ragConfig
													.retrievalCount
											}
											onChange={(value) =>
												setSettings({
													ragConfig: {
														...settings.ragConfig,
														retrievalCount: value,
													},
												})
											}
											marks={{ 1: "1", 5: "5", 10: "10" }}
										/>
									</Form.Item>

									<Form.Item
										label={`Similarity Threshold: ${(settings.ragConfig.similarityThreshold * 100).toFixed(0)}%`}
										extra="Minimum similarity score to include a chunk"
									>
										<Slider
											min={0.5}
											max={1}
											step={0.05}
											value={
												settings.ragConfig
													.similarityThreshold
											}
											onChange={(value) =>
												setSettings({
													ragConfig: {
														...settings.ragConfig,
														similarityThreshold:
															value,
													},
												})
											}
											marks={{
												0.5: "50%",
												0.7: "70%",
												1: "100%",
											}}
										/>
									</Form.Item>
								</Form>

								<Space
									style={{
										width: "100%",
										justifyContent: "flex-end",
									}}
								>
									<Button
										type="primary"
										onClick={handleSaveRagConfig}
									>
										Save RAG Settings
									</Button>
								</Space>
							</div>
						),
					},
				]}
			/>
		</Modal>
	);
};

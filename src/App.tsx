import { useEffect } from "react";
import { ConfigProvider, theme } from "antd";
import { Layout, Sidebar, ChatView, SettingsModal } from "./components";
import { useAppStore } from "./store";
import "./App.css";

function App() {
	const { isSidebarCollapsed, loadSettings } = useAppStore();

	// Load saved settings on app startup
	useEffect(() => {
		loadSettings();
	}, [loadSettings]);

	return (
		<ConfigProvider
			theme={{
				algorithm: theme.darkAlgorithm,
				token: {
					colorBgBase: "#000000",
					colorBgContainer: "#0a0a0a",
					colorBorder: "#1f1f1f",
					colorPrimary: "#1677ff",
					borderRadius: 8,
				},
			}}
		>
			<Layout sidebar={<Sidebar />} collapsed={isSidebarCollapsed}>
				<ChatView />
			</Layout>
			<SettingsModal />
		</ConfigProvider>
	);
}

export default App;

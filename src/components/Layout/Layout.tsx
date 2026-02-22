import { Layout as AntLayout } from "antd";
import { ReactNode } from "react";
import "./Layout.css";

const { Header, Sider, Content } = AntLayout;

interface LayoutProps {
	sidebar: ReactNode;
	children: ReactNode;
	collapsed: boolean;
}

export const Layout = ({ sidebar, children, collapsed }: LayoutProps) => {
	return (
		<AntLayout className="app-layout">
			<Sider
				theme="dark"
				width={280}
				collapsedWidth={0}
				collapsed={collapsed}
				className="app-sidebar"
			>
				{sidebar}
			</Sider>
			<AntLayout>
				<Content className="app-content">{children}</Content>
			</AntLayout>
		</AntLayout>
	);
};

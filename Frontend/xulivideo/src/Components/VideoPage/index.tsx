import React, { useState, useEffect } from 'react'; // Import useEffect
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Input, Row, Col, Card, Space, Grid, Button } from 'antd'; // Import Button
import {
    HomeOutlined,
    BookOutlined,
    BulbOutlined,
    PlayCircleOutlined,
    SmileOutlined,
    SettingOutlined,
    LoginOutlined,
    LogoutOutlined,
    UserAddOutlined,
    FontSizeOutlined,
    MoonOutlined, // Import Moon icon
    SunOutlined   // Import Sun icon
} from '@ant-design/icons';
// Import DarkReader
import * as DarkReader from 'darkreader';

// Removed useState from here as it's now imported at the top
import TextEditor from './texteditor'; // Ensure this path is correct

const { Header, Sider, Content } = Layout;
const { Search } = Input;
const { Meta } = Card;
const { useBreakpoint } = Grid;


// --- Video Data (Keep as before) ---
type Video = {
    title: string;
    description: string;
    thumbnail: string;
    videoUrl: string;
    duration: string;
}

const videos: Video[] = [
    // ... (your video data remains here)
    {
        title: 'Testing',
        description: 'Test Video for Demo',
        thumbnail: 'https://loremflickr.com/320/240?random=1',
        videoUrl: 'https://example.com/video1.mp4',
        duration: '0:10',
    },
    {
        title: 'Cartoon',
        description: 'Cartoon video for child',
        thumbnail: 'https://loremflickr.com/320/240?random=2',
        videoUrl: 'https://example.com/video2.mp4',
        duration: '2:51',
    },
    {
        title: 'Natural Testing Video',
        description: 'Sea View',
        thumbnail: 'https://loremflickr.com/320/240?random=3',
        videoUrl: 'https://example.com/video3.mp4',
        duration: '0:32',
    },
    {
        title: 'Gaming Test Video',
        description: 'Gaming Test video',
        thumbnail: 'https://loremflickr.com/320/240?random=4',
        videoUrl: 'https://example.com/video4.mp4',
        duration: '0:30',
    },
];
// --- End Video Data ---


// --- Dark Mode Toggle Component ---
const DarkModeToggle = () => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const persisted = localStorage.getItem('darkModeEnabled');
        // FIX: Use DarkReader.isEnabled() function call
        return persisted ? JSON.parse(persisted) : DarkReader.isEnabled();
    });

    const toggleDarkMode = () => {
        const newState = !isDarkMode;
        if (newState) {
            DarkReader.enable({
                brightness: 100,
                contrast: 90,
                sepia: 10,
            });
        } else {
            DarkReader.disable();
        }
        setIsDarkMode(newState);
        localStorage.setItem('darkModeEnabled', JSON.stringify(newState));
    };

    useEffect(() => {
        // Apply the state when the component mounts or state changes
        // Check if the *actual* DarkReader state matches our component state
        const currentlyEnabled = DarkReader.isEnabled();

        if (isDarkMode && !currentlyEnabled) {
            DarkReader.enable({
                brightness: 100,
                contrast: 90,
                sepia: 10,
            });
        } else if (!isDarkMode && currentlyEnabled) {
            DarkReader.disable();
        }
        // Only depends on the local isDarkMode state to trigger changes
    }, [isDarkMode]);


    return (
        <Button
            type="text"
            shape="circle"
            icon={
                isDarkMode ? (
                    <SunOutlined />
                ) : (
                    <MoonOutlined />
                )
            }
            onClick={toggleDarkMode}
            style={{
                fontSize: "20px",
            }}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        />
    );
};
// --- End Dark Mode Toggle Component ---


// Component for the Home Page Content
const HomePage: React.FC = () => {
    // No changes needed here for dark mode toggle
    return (
        <Content style={{ margin: '24px 16px', padding: 24, minHeight: 280 /* background: '#fff' - DarkReader will handle this */ }}>
            <Row gutter={[16, 24]}>
                {videos.map((video, index) => (
                    <Col className="gutter-row" xs={24} sm={12} md={8} lg={6} xl={6} key={index}>
                        <Card
                            hoverable
                            style={{ width: '100%' }}
                            cover={<img alt={video.title} src={video.thumbnail} />}
                        >
                            <Meta title={video.title} description={video.description} />
                        </Card>
                    </Col>
                ))}
            </Row>
        </Content>
    );
};

// Main App Component using Router
const App: React.FC = () => {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();
    const screens = useBreakpoint();

    const getSelectedKeys = () => {
        // Simplified logic for example paths
        const pathMap: { [key: string]: string } = {
            '/': 'home',
            '/texteditor': 'text', // Match the actual path used in Link
            // Add other paths as needed
        };
        return [pathMap[location.pathname] || 'home'];
    }

    const isEditorPage = location.pathname === '/texteditor'; // Match the actual path

    if (isEditorPage) {
        // Render only the TextEditor component
        // Consider passing dark mode state or adding a toggle within TextEditor if needed there too
        return <TextEditor />;
    }

    // Render the original layout for other pages (like Home)
    return (
        <Layout style={{ minHeight: '100vh' }}>
            {/* Sider styling will be adapted by DarkReader */}
            <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} /* style={{ backgroundColor: '#001529' }} */ >
                <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 4, textAlign: 'center', lineHeight: '32px', color: 'white', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {collapsed ? 'VSA' : 'Video Streaming App'}
                </div>
                <Menu theme="dark" selectedKeys={getSelectedKeys()} mode="inline">
                    <Menu.Item key="home" icon={<HomeOutlined />}>
                        <Link to="/">Home</Link>
                    </Menu.Item>
                    <Menu.Item key="text" icon={<FontSizeOutlined />}>
                        {/* FIX: Ensure path matches router and isEditorPage check */}
                        <Link to="/texteditor">Text</Link>
                    </Menu.Item>
                    {/* Other menu items */}
                    <Menu.Item key="motivation" icon={<BulbOutlined />}>Motivation</Menu.Item>
                    <Menu.Item key="technology" icon={<PlayCircleOutlined />}>Technology</Menu.Item>
                    <Menu.Item key="gaming" icon={<SmileOutlined />}>Gaming</Menu.Item>
                    <Menu.Item key="children" icon={<SmileOutlined />}>Children</Menu.Item>
                    <Menu.Item key="other" icon={<SettingOutlined />}>Other</Menu.Item>
                    <Menu.Divider />
                    <Menu.Item key="signin" icon={<LoginOutlined />}>Sign In</Menu.Item>
                    <Menu.Item key="signup" icon={<UserAddOutlined />}>Sign Up</Menu.Item>
                    <Menu.Item key="logout" icon={<LogoutOutlined />}>Logout</Menu.Item>
                </Menu>
            </Sider>
            <Layout className="site-layout">
                {/* Header styling will be adapted by DarkReader */}
                <Header style={{ padding: '0 16px', /* background: '#fff', */ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Search placeholder="Search Videos..." onSearch={(value) => console.log(value)} style={{ width: 200 }} />
                    <div style={{ marginRight: screens.md ? 24 : 16 }}>
                        <Space>
                            <DarkModeToggle /> {/* <-- Add the toggle button here */}
                            <span>Profile</span>
                            <SettingOutlined />
                        </Space>
                    </div>
                </Header>
                {/* Render the HomePage component */}
                <HomePage/>
            </Layout>
        </Layout>
    );
};

export default App;
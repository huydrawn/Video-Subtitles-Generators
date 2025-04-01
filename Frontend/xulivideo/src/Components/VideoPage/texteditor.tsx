import React, { useState } from 'react';
import { Layout, Menu, Button, Row, Col, Card, Input, Select, Space, Switch, Slider, Typography, Grid, theme, Drawer } from 'antd';
import {
    FontSizeOutlined,
    VideoCameraOutlined,
    MessageOutlined, // Used for Transcript, Subtitles, Translate
    AudioOutlined,
    FormatPainterOutlined, // Visuals
    AppstoreOutlined, // AI Voice
    CodeSandboxOutlined, // Brand Kit
    PlayCircleOutlined,
    SplitCellsOutlined,
    UndoOutlined,
    RedoOutlined,
    ShareAltOutlined,
    DownloadOutlined,
    UserOutlined,
    SettingOutlined,
    BgColorsOutlined,
    ScissorOutlined,
    ExpandOutlined,
    EyeOutlined,
    BorderOutlined, // Safe Zones
    ZoomInOutlined,
    ZoomOutOutlined,
    FullscreenOutlined,
    PlusOutlined,
    MenuOutlined, // For mobile drawer trigger
    // Import other icons if needed for new sections like Layers, Transitions etc.
    BarsOutlined, // Placeholder for Layers
    SwapOutlined, // Placeholder for Transitions
    AppstoreAddOutlined, // Placeholder for Templates
    CustomerServiceOutlined, // Placeholder for Plugins
    FacebookOutlined, // Placeholder for social icons
    InstagramOutlined, // Placeholder for social icons
    YoutubeOutlined // Placeholder for social icons (or use UserOutlined again)

} from '@ant-design/icons';

const { Header, Sider, Content, Footer } = Layout;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

// Interface for Text Style item (optional but good practice)
interface TextStyle {
    name: string;
    fontFamily?: string; // Example property
}

const TextEditor: React.FC = () => {
    const [selectedMenuKey, setSelectedMenuKey] = useState('text'); // Track selected tool
    const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);
    const screens = useBreakpoint();
    const { token } = theme.useToken();

    // --- Configuration ---
    const iconSiderWidth = 65; // Width for the collapsed icon sidebar
    const textPanelWidth = 260; // Width for the contextual text panel sidebar
    const propertiesPanelWidth = 300; // Width for the right properties panel

    // --- Handlers ---
    const handleMenuClick = (e: { key: string }) => {
        setSelectedMenuKey(e.key);
        if (screens.xs) {
            setMobileDrawerVisible(false); // Close drawer on selection in mobile
        }
    };

    const showMobileDrawer = () => {
        setMobileDrawerVisible(true);
    };

    const closeMobileDrawer = () => {
        setMobileDrawerVisible(false);
    };


    // --- Render Functions ---

    const renderMainMenu = (mode: 'inline' | 'vertical' = 'inline') => (
        <Menu
            onClick={handleMenuClick}
            selectedKeys={[selectedMenuKey]}
            mode={mode} // Use vertical for drawer, inline for sider
            theme="light" // Match image style
            style={{ borderRight: 0, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '16px' }}
        >
            {/* Add padding or logo space if needed at the top */}
            <div style={{ marginBottom: 20 }}>{/* Placeholder for potential logo/icon */}</div>

            {/* Use Tooltip for icon-only sider */}
            <Menu.Item key="media" icon={<VideoCameraOutlined style={{ fontSize: '20px' }} />} title="Media" style={{ marginBottom: '16px' }} />
            <Menu.Item key="transcript" icon={<MessageOutlined style={{ fontSize: '20px' }} />} title="Transcript" style={{ marginBottom: '16px' }} />
            <Menu.Item key="subtitles" icon={<MessageOutlined style={{ fontSize: '20px' }} />} title="Subtitles" style={{ marginBottom: '16px' }} />
            <Menu.Item key="translate" icon={<MessageOutlined style={{ fontSize: '20px' }} />} title="Translate" style={{ marginBottom: '16px' }} />
            <Menu.Item key="text" icon={<FontSizeOutlined style={{ fontSize: '20px' }} />} title="Text" style={{ marginBottom: '16px' }} />
            <Menu.Item key="ai_voice" icon={<AppstoreOutlined style={{ fontSize: '20px' }} />} title="AI Voice" style={{ marginBottom: '16px' }} />
            <Menu.Item key="audio" icon={<AudioOutlined style={{ fontSize: '20px' }} />} title="Audio" style={{ marginBottom: '16px' }} />
            <Menu.Item key="visuals" icon={<FormatPainterOutlined style={{ fontSize: '20px' }} />} title="Visuals" style={{ marginBottom: '16px' }} />
            {/* Add new items from second image */}
            <Menu.Item key="layers" icon={<BarsOutlined style={{ fontSize: '20px' }} />} title="Layers" style={{ marginBottom: '16px' }} />
            <Menu.Item key="transitions" icon={<SwapOutlined style={{ fontSize: '20px' }} />} title="Transitions" style={{ marginBottom: '16px' }} />
            <Menu.Item key="templates" icon={<AppstoreAddOutlined style={{ fontSize: '20px' }} />} title="Templates" style={{ marginBottom: '16px' }} />
            <Menu.Item key="plugins" icon={<CustomerServiceOutlined style={{ fontSize: '20px' }} />} title="Plugins" style={{ marginBottom: '16px' }} />

            {/* Example using Tooltip if needed, Antd Menu handles title attribute automatically */}
            {/* <Tooltip placement="right" title="Text">
                <Menu.Item key="text" icon={<FontSizeOutlined />} />
            </Tooltip> */}
        </Menu>
    );

    const renderTextStyles = () => {
        const styles: TextStyle[] = [
            { name: 'Default' }, { name: 'Handwriting', fontFamily: 'cursive' }, { name: 'Serif', fontFamily: 'serif' },
            { name: 'Typewriter', fontFamily: 'monospace' }, { name: 'Glow' /* Special style */ }, { name: 'Dark Outline' /* Special style */ },
            // Add more styles
        ];
        return (
            // Use flexGrow to make this section take more space
            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '0 8px' }}>
                <Row gutter={[8, 12]}>
                    {styles.map(style => (
                        <Col span={12} key={style.name}>
                            <Card hoverable size="small" bodyStyle={{ textAlign: 'center', padding: '16px 4px' }}> {/* Increased padding */}
                                <Paragraph style={{ fontFamily: style.fontFamily || 'inherit', fontSize: '1.2em', marginBottom: '4px', minHeight: '2.4em', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    Sample Text
                                </Paragraph>
                                <Text strong style={{ fontSize: '0.8em' }}>{style.name}</Text>
                            </Card>
                        </Col>
                    ))}
                    <Col span={24} style={{ textAlign: 'center', marginTop: 8 }}>
                        <Button type="link" size="small">View All {" > "}</Button>
                    </Col>
                </Row>
                {/* Placeholder for Templates section */}
                <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>Templates</Title>
                <Row gutter={[8, 12]}>
                    {['@username', '@facebook', '@instagram'].map((template, index) => (
                        <Col span={8} key={template}>
                            <Card hoverable size="small" bodyStyle={{ padding: '12px 4px', textAlign: 'center' }}>
                                <Button type="text" size="small" icon={
                                    index === 0 ? <UserOutlined /> : index === 1 ? <FacebookOutlined /> : <InstagramOutlined />
                                }>{template}</Button>
                            </Card>
                        </Col>
                    ))}
                    <Col span={24} style={{ textAlign: 'center', marginTop: 8 }}>
                        <Button type="link" size="small">View All {" > "}</Button>
                    </Col>
                </Row>
            </div>
        );
    };

    const renderTextPanelContent = () => (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px' }}>
            <Title level={5} style={{ marginBottom: 16, textAlign: 'center', flexShrink: 0 }}>TEXT</Title>
            <Button type="primary" icon={<PlusOutlined />} block style={{ marginBottom: 24, flexShrink: 0 }}>
                Add Text
            </Button>
            {/* Brand Kit - Adjusted Padding */}
            <Card size="small" style={{ marginBottom: 24, textAlign: 'center', borderStyle: 'dashed', flexShrink: 0 }} bodyStyle={{ padding: 16 }}>
                <CodeSandboxOutlined style={{fontSize: 24, color: token.colorTextTertiary, marginBottom: 8}}/>
                <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: '0.9em' }}>Drag and drop to add styles to Brand Kit</Paragraph>
            </Card>

            <Title level={5} style={{ marginBottom: 16, flexShrink: 0 }}>Styles</Title>
            {renderTextStyles()} {/* This function now returns a div with flexGrow */}
        </div>
    );

    const renderPropertiesPanel = () => (
        <div style={{ padding: 16, height: '100%', overflowY: 'auto'}}>
            <Title level={5} style={{ marginBottom: 16 }}>Edit</Title>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Button block icon={<ScissorOutlined />}>Crop</Button>
                <Row gutter={8}>
                    <Col span={12}>
                        <Button block icon={<ExpandOutlined />} style={{ height: 60, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '4px' }}>
                            Resize Project
                            <Text type="secondary" style={{ fontSize: '0.8em', whiteSpace: 'normal', lineHeight: '1.1' }}>Change aspect ratio</Text>
                        </Button>
                    </Col>
                    <Col span={12}>
                        <Button block icon={<EyeOutlined />} style={{ height: 60, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '4px' }}>
                            Speaker Focus
                            <Text type="secondary" style={{ fontSize: '0.8em', whiteSpace: 'normal', lineHeight: '1.1' }}>Apply speaker focus</Text>
                        </Button>
                    </Col>
                </Row>

                <Row justify="space-between" align="middle">
                    <Text>Snap to Grid</Text>
                    <Switch defaultChecked size="small" />
                </Row>

                <Title level={5} style={{ marginTop: 8, marginBottom: 8 }}>Background</Title>
                <Input addonBefore="#" defaultValue="FFFFFF" />
                <Space wrap style={{ marginTop: 8 }}>
                    {['#000000', '#FFFFFF', '#FF4D4F', '#FAAD14', '#52C41A', '#1890FF', '#722ED1'].map(color => (
                        <Button key={color} style={{ backgroundColor: color, width: 24, height: 24, padding: 0, border: '1px solid #d9d9d9' }} />
                    ))}
                    <Button icon={<BgColorsOutlined />} />
                </Space>

                <Row justify="space-between" align="middle" style={{ marginTop: 8 }}>
                    <Text>Canvas Blur</Text>
                    <Switch size="small" />
                </Row>

                <Title level={5} style={{ marginTop: 8, marginBottom: 8 }}>Safe Zones</Title>
                <Select defaultValue="none" style={{ width: '100%' }}>
                    <Option value="none">None</Option>
                    <Option value="all">All</Option>
                    <Option value="title">Title Safe</Option>
                    <Option value="action">Action Safe</Option>
                </Select>
                {/* Add Expand Padding / Timing etc. from second image if needed */}
            </Space>
        </div>
    );

    // --- Main Return ---
    return (
        <Layout style={{ minHeight: '100vh' }}>
            {/* === Icon Sidebar (Desktop) === */}
            {!screens.xs && (
                <Sider
                    collapsed={true}
                    width={iconSiderWidth}
                    collapsedWidth={iconSiderWidth} // Keep it fixed width when collapsed
                    theme="light" // Match image
                    style={{ borderRight: `1px solid ${token.colorBorderSecondary}` }}
                >
                    {renderMainMenu('inline')}
                </Sider>
            )}

            {/* === Main Layout Area (Contextual Sider + Content Area) === */}
            <Layout>
                {/* === Contextual Sider (e.g., Text Panel) === */}
                {selectedMenuKey === 'text' && !screens.xs && ( // Show only if Text selected and not mobile
                    <Sider
                        width={textPanelWidth}
                        theme="light"
                        style={{ background: token.colorBgContainer, borderRight: `1px solid ${token.colorBorderSecondary}`, height: '100vh', /* overflow: 'hidden' - Let content scroll */ }}
                    >
                        {renderTextPanelContent()}
                    </Sider>
                )}

                {/* === Content Area (Header, Canvas+Properties, Footer) === */}
                <Layout style={{ overflow: 'hidden' /* Prevent outer scroll */ }}>
                    {/* --- Top Header --- */}
                    <Header style={{ padding: '0 16px', background: token.colorBgContainer, borderBottom: `1px solid ${token.colorBorderSecondary}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Space size="middle">
                            {/* Mobile Drawer Trigger */}
                            {screens.xs && (
                                <Button type="text" icon={<MenuOutlined />} onClick={showMobileDrawer} />
                            )}
                            {!screens.xs && <Text strong>New Folder {" > "} 6390...</Text>}
                            <Text type="secondary" style={{fontSize: '0.8em'}}>Last edited a few seconds ago</Text>
                        </Space>
                        <Space size="middle">
                            {/* Hide some buttons on smaller screens if needed */}
                            {!screens.sm && <Button icon={<SettingOutlined />} />}
                            <Button icon={<ShareAltOutlined />}>Share</Button>
                            <Button type="primary" icon={<DownloadOutlined />}>Export Project</Button>
                            <Button shape="circle" icon={<UserOutlined />} />
                        </Space>
                    </Header>

                    {/* --- Middle Area (Canvas + Properties) --- */}
                    {/* Use row direction to place Content and Properties Sider side-by-side */}
                    <Layout style={{ flexDirection: 'row', flexGrow: 1, overflow: 'hidden' }}>
                        {/* --- Main Canvas Area --- */}
                        <Content style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden', background: '#f0f2f5' }}>
                            {/* Canvas Controls */}
                            <div style={{ padding: '8px 16px', background: token.colorBgLayout, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                                <Select defaultValue="fit" size="small" style={{ width: 100 }}>
                                    <Option value="fit">Fit</Option>
                                    {/* Add other zoom options */}
                                </Select>
                                {/* Add more controls if needed */}
                            </div>
                            {/* Canvas Preview (takes remaining space) */}
                            <div style={{ flexGrow: 1, background: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: screens.xs ? 8 : 16, overflow: 'hidden', position: 'relative' }}>
                                <Text style={{ color: '#555' }}>Video Preview Area</Text>
                                {/* Absolute positioning for zoom controls if needed inside canvas */}
                            </div>
                        </Content>

                        {/* --- Right Properties Sider (Desktop) --- */}
                        {!screens.xs && (
                            <Sider
                                width={propertiesPanelWidth}
                                theme="light"
                                style={{ background: token.colorBgContainer, borderLeft: `1px solid ${token.colorBorderSecondary}`, height: 'calc(100vh - 64px - 190px)', /* Adjust based on header/footer */ overflowY: 'auto' }} // Allow properties to scroll
                            >
                                {renderPropertiesPanel()}
                            </Sider>
                        )}
                    </Layout>

                    {/* --- Bottom Timeline Area --- */}
                    <Footer style={{ padding: '0', background: token.colorBgContainer, borderTop: `1px solid ${token.colorBorderSecondary}`, flexShrink: 0 /* Prevent footer from shrinking */, minHeight: 190 /* Example fixed height */ }}>
                        {/* Playback Controls */}
                        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: `1px solid ${token.colorBorderSecondary}`}}>
                            {/* Add controls */}
                            <Button shape="circle" icon={<PlayCircleOutlined />} size="large" />
                            <Select defaultValue="1.0x" size="small" style={{ width: 70 }}>
                                <Option value="1.0x">1.0x</Option>
                                {/* Other speeds */}
                            </Select>
                            <Button icon={<SplitCellsOutlined />}>Split</Button>
                            <Button icon={<UndoOutlined />}>Undo</Button>
                            <Button icon={<RedoOutlined />}>Redo</Button>
                            <Text style={{ marginLeft: 'auto', fontFamily: 'monospace' }}>0:00.000 / 0:24.433</Text>
                        </div>
                        {/* Timeline Tracks & Zoom */}
                        <div style={{ padding: '16px', minHeight: 120 /* Adjusted height */, background: token.colorBgLayout, position: 'relative', overflowX: 'auto' /* Allow horizontal scroll */ }}>
                            {/* Simplified Timeline Representation */}
                            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', color: token.colorTextTertiary, fontSize: '0.8em', minWidth: '1000px' /* Example width for scroll */ }}>
                                {/* Time markers */}
                                {Array.from({ length: 26 }, (_, i) => <span key={i}>:{i}</span>)}
                            </div>
                            <div style={{ background: '#555', height: 60, borderRadius: 4, marginBottom: 8, minWidth: '1000px', display: 'flex', alignItems: 'center' }}>{/* Track 1 */}</div>
                            <div style={{ background: '#444', height: 30, borderRadius: 4, minWidth: '1000px', display: 'flex', alignItems: 'center' }}>{/* Track 2 */}</div>

                            {/* Timeline Zoom Controls (Bottom Right) - Consider simplifying for mobile */}
                            {!screens.xs && (
                                <div style={{ position: 'absolute', bottom: 16, right: 16, background: token.colorBgElevated, padding: '4px 8px', borderRadius: 4, boxShadow: token.boxShadowSecondary }}>
                                    <Space>
                                        <Button size="small" icon={<ZoomOutOutlined />} />
                                        <Slider defaultValue={50} style={{ width: 100, margin: '0 8px' }} tooltip={{ open: false }}/>
                                        <Button size="small" icon={<ZoomInOutlined />} />
                                        <Button size="small" icon={<FullscreenOutlined />}>Fit</Button>
                                    </Space>
                                </div>
                            )}
                        </div>
                    </Footer>
                </Layout>
            </Layout>

            {/* === Mobile Drawer for Main Icons === */}
            <Drawer
                placement="left"
                closable={true}
                onClose={closeMobileDrawer}
                visible={mobileDrawerVisible && screens.xs} // Show only if flag is true and screen is xs
                width={200} // Adjust width as needed
                bodyStyle={{ padding: 0 }}
                title="Tools"
                headerStyle={{borderBottom: `1px solid ${token.colorBorderSecondary}`}}
            >
                {renderMainMenu('vertical')} {/* Use vertical mode for drawer */}
            </Drawer>
        </Layout>
    );
};

export default TextEditor;
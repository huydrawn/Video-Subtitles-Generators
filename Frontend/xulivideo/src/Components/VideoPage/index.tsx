// File: src/Components/VideoPage/index.tsx
import React, { useState, useEffect, useMemo } from 'react'; // Added useMemo
import Swal from 'sweetalert2';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Layout, Menu, Input, Row, Col, Card, Space, Grid, Button, Typography, Dropdown, Spin, Modal, Form,
    Drawer // Added Drawer
} from 'antd';
import {
    SearchOutlined, FolderOutlined, SettingOutlined, ShareAltOutlined, QuestionCircleOutlined, UserOutlined,
    PlusOutlined, DownOutlined, EllipsisOutlined, TranslationOutlined, BarsOutlined, BulbOutlined,
    BellOutlined, UsergroupAddOutlined, SunOutlined, MoonOutlined, PictureOutlined,
    DatabaseOutlined, UserSwitchOutlined // Added icons for settings panel
} from '@ant-design/icons';
import * as DarkReader from 'darkreader';

// --- Redux Imports ---
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '../../Store/index'; // Adjusted path from user
import { fetchUserData, createProject, clearError, logoutUser } from '../../Store/useSlice'; // Adjusted path from user

const { Header, Sider, Content } = Layout;
const { Search } = Input;
const { Meta } = Card;
const { Title, Text, Paragraph } = Typography; // Added Paragraph
const { useBreakpoint } = Grid;

// Interfaces (keep as is)
export interface Project {
    projectId: number;
    publicId: string;
    projectName: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    video: {
        videoId: number;
        title: string;
        cloudinaryPublicId: string;
        url: string;
        thumbnailUrl: string;
        secureUrl: string;
        resourceType: string;
        format: string;
        duration: number;
        bytes: number;
        width: number;
        height: number;
    } | null;
}

export interface Workspace {
    workspaceId: number;
    publicId: string;
    workspaceName: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    projects: Project[];
}

export interface UserDTO {
    userId: number;
    username: string;
    email: string;
    createdAt: string;
    updatedAt: string;
    status: string;
    workspace: Workspace | null;
}

// --- Helper function to format bytes ---
const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};


// --- Dark Mode Toggle Component (Keep as is) ---
const DarkModeToggle = () => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof DarkReader.enable !== 'function' || typeof DarkReader.disable !== 'function') {
            console.warn("DarkReader functions not available.");
            return false;
        }
        const persisted = localStorage.getItem('darkModeEnabled');
        try {
            return persisted ? JSON.parse(persisted) : DarkReader.isEnabled();
        } catch (error) {
            console.error("Error parsing darkModeEnabled from localStorage", error);
            return DarkReader.isEnabled();
        }
    });

    useEffect(() => {
        if (typeof DarkReader.enable !== 'function' || typeof DarkReader.disable !== 'function') {
            // console.warn("DarkReader functions not available, cannot apply theme.");
            return;
        }
        const currentlyEnabled = DarkReader.isEnabled();

        if (isDarkMode && !currentlyEnabled) {
            try {
                DarkReader.enable({
                    brightness: 100,
                    contrast: 90,
                    sepia: 10,
                });
            } catch (error) {
                console.error("Error enabling DarkReader:", error);
                setIsDarkMode(false);
            }
        } else if (!isDarkMode && currentlyEnabled) {
            try {
                DarkReader.disable();
            } catch (error) {
                console.error("Error disabling DarkReader:", error);
                setIsDarkMode(true);
            }
        }
    }, [isDarkMode]);

    const toggleDarkMode = () => {
        if (typeof DarkReader.enable !== 'function' || typeof DarkReader.disable !== 'function') {
            // console.warn("DarkReader functions not available, cannot toggle.");
            return;
        }
        const newState = !isDarkMode;
        try {
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
        } catch (error) {
            console.error("Error toggling DarkReader:", error);
            setIsDarkMode(isDarkMode);
        }
    };

    if (typeof DarkReader.enable !== 'function') {
        return null;
    }

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
                color: 'unset'
            }}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        />
    );
};


// --- Project Card Component (Keep as is) ---
const ProjectCard: React.FC<{
    project: Project;
    ownerName: string;
    onClick: (project: Project) => void;
}> = ({ project, ownerName, onClick }) => {
    const { projectName, updatedAt, video } = project;
    const thumbnailUrl = video?.thumbnailUrl;

    const formatDate = (isoString: string) => {
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
            });
        } catch (e) {
            console.error("Failed to parse date:", isoString, e);
            return 'Invalid Date';
        }
    };
    // Calculate duration string
    let durationString = '';
    if (video?.duration) {
        const totalSeconds = Math.round(video.duration);
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        durationString = `${minutes}:${seconds}`;
    }

    return (
        <Card
            hoverable
            style={{
                width: '100%',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 8,
            }}
            onClick={() => onClick(project)}
        >
            <div style={{
                width: '100%',
                paddingTop: '56.25%',
                backgroundColor: '#e9e9e9',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                marginBottom: 8,
                borderBottom: '1px solid #f0f0f0',
                overflow: 'hidden'
            }}>
                {thumbnailUrl ? (
                    <img
                        src={thumbnailUrl}
                        alt={`${projectName || 'Project'} thumbnail`}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }}
                    />
                ) : (
                    <PictureOutlined style={{ fontSize: 48, color: '#ccc', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                )}
            </div>
            <div style={{ padding: '0 8px 8px 8px' }}>
                <Text strong ellipsis={{ tooltip: projectName }} style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>
                    {projectName || 'Untitled Project'}
                </Text>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                    {ownerName}, {formatDate(updatedAt)}
                </Text>
                {durationString && (
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                        Duration: {durationString}
                    </Text>
                )}
            </div>
            <div style={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                borderRadius: '50%',
                padding: 4,
            }}>
                <Dropdown overlay={
                    <Menu onClick={e => e.domEvent.stopPropagation()}>
                        <Menu.Item key="edit">Edit Details</Menu.Item>
                        <Menu.Item key="delete" danger>Delete Project</Menu.Item>
                    </Menu>
                } trigger={['click']}>
                    <EllipsisOutlined
                        style={{ fontSize: 18, cursor: 'pointer', color: '#333' }}
                        onClick={e => { if (e && e.stopPropagation) e.stopPropagation(); }}
                    />
                </Dropdown>
            </div>
        </Card>
    );
};


// Component for the New Homepage
const NewHomePage: React.FC = () => {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const screens = useBreakpoint();
    const dispatch = useDispatch<AppDispatch>();

    // --- Redux Selectors ---
    const {
        userData,
        projects,
        isLoading: isLoadingUserData, // Renamed for clarity
        isSubmitting: isSubmittingProject, // Renamed for clarity
        error: userError // Renamed for clarity
    } = useSelector((state: RootState) => state.user);

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    // --- State for Settings Panel ---
    const [isSettingsPanelVisible, setIsSettingsPanelVisible] = useState(false);

    // --- Fetch User Data ---
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            Swal.fire({
                icon: 'warning',
                title: 'Not Logged In',
                text: 'Please log in to access this page.',
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false
            }).then(() => {
                navigate('/login');
            });
            return;
        }
        if (!userData && !isLoadingUserData && !userError) { // Fetch only if no data, not loading, and no prior error
            dispatch(fetchUserData())
                .unwrap()
                .catch((fetchError: any) => {
                    const errorMessage = typeof fetchError === 'string' ? fetchError : fetchError?.message || "An error occurred";
                    const shouldRedirect = errorMessage.includes("session has expired") || errorMessage.includes("Unauthorized");
                    Swal.fire({
                        icon: shouldRedirect ? 'warning' : 'error',
                        title: shouldRedirect ? 'Session Expired' : 'Fetch Failed',
                        text: errorMessage,
                        confirmButtonText: 'OK'
                    }).then(() => {
                        if (shouldRedirect) {
                            dispatch(logoutUser());
                            navigate('/login');
                        }
                    });
                });
        }
    }, [dispatch, navigate, userData, isLoadingUserData, userError]);

    // --- Calculate Total Storage Used ---
    const totalStorageUsedBytes = useMemo(() => {
        return projects.reduce((acc, project) => {
            return acc + (project.video?.bytes || 0);
        }, 0);
    }, [projects]);


    // --- Modal Handlers (Create Project) ---
    const showCreateModal = () => {
        if (!userData?.workspace?.publicId) {
            Swal.fire({
                icon: 'error',
                title: 'Cannot Create Project',
                text: 'User workspace information is missing. Please reload or contact support.',
            });
            return;
        }
        setIsModalVisible(true);
        form.resetFields();
        if (userError) dispatch(clearError()); // Clear general user errors if any
    };

    const handleModalCancel = () => {
        setIsModalVisible(false);
        form.resetFields();
    };

    const handleCreateProjectSubmit = async (values: { projectName: string; description: string }) => {
        const workspacePublicId = userData?.workspace?.publicId;
        if (!workspacePublicId) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Workspace information missing.' });
            handleModalCancel();
            return;
        }
        dispatch(createProject({
            workspacePublicId,
            projectName: values.projectName,
            description: values.description,
        }))
            .unwrap()
            .then((newProject) => {
                Swal.fire({ icon: 'success', title: 'Success!', text: `Project "${newProject.projectName}" created.` });
                handleModalCancel();
            })
            .catch((rejectionReason: any) => {
                const errorMessage = typeof rejectionReason === 'string' ? rejectionReason : "Failed to create project.";
                Swal.fire({ icon: 'error', title: 'Creation Failed', text: errorMessage })
                    .then(() => {
                        if (errorMessage.includes("You are not authorized") || errorMessage.includes("Unauthorized")) {
                            dispatch(logoutUser());
                            navigate('/login');
                        }
                    });
            });
    };

    // --- Settings Panel Handlers ---
    const showSettingsPanel = () => setIsSettingsPanelVisible(true);
    const closeSettingsPanel = () => setIsSettingsPanelVisible(false);


    const handleChangetoSummary = () => navigate('/summary');

    const handleProjectCardClick = (project: Project) => {
        console.log("Project card clicked:", project.projectName, "ID:", project.projectId, "Public ID:", project.publicId);
        if (project.video && project.video.secureUrl) {
            navigate('/videoeditor', {
                state: { initialVideoUrl: project.video.secureUrl, projectId: project.projectId, publicId: project.publicId }
            });
        } else {
            navigate('/videoeditor', { state: { projectId: project.projectId, publicId: project.publicId } });
        }
    };

    const getSelectedKeys = () => ['new-folder-item'];

    // --- Render Logic ---
    if (isLoadingUserData && !userData && !userError) {
        return (
            <Layout style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Spin size="large" tip="Loading your workspace..." />
            </Layout>
        );
    }

    if (userError && !isLoadingUserData && !userData) {
        return (
            <Layout style={{ minHeight: '100vh', padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <Title level={3} type="danger">Oops! Something went wrong.</Title>
                <Text type="secondary" style={{marginBottom: 16}}>{userError}</Text>
                <Space>
                    <Button type="primary" onClick={() => dispatch(fetchUserData())} loading={isLoadingUserData}>Retry</Button>
                    <Button onClick={() => { dispatch(logoutUser()); navigate('/login'); }}>Go to Login</Button>
                </Space>
            </Layout>
        );
    }

    // Fallback if user data is crucial and not loaded after attempts
    if (!userData && !isLoadingUserData) {
        return (
            <Layout style={{ minHeight: '100vh', padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <Title level={3}>Unable to load workspace</Title>
                <Text type="secondary" style={{marginBottom: 16}}>Please try logging in again or contact support.</Text>
                <Button type="primary" onClick={() => { dispatch(logoutUser()); navigate('/login'); }}>Go to Login</Button>
            </Layout>
        );
    }

    const displayedUsername = userData?.username || 'User';
    const displayedEmail = userData?.email || 'email@example.com';
    const displayedTeamName = userData?.workspace?.workspaceName || `${displayedUsername}'s Workspace`;

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} width={240}>
                {/* Sider content (remains the same) */}
                <div style={{ height: 40, margin: 12, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 4, textAlign: 'center', lineHeight: '40px', color: 'white', fontWeight: 'bold', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>
                    {collapsed ? 'VSA' : displayedTeamName}
                    {!collapsed && <DownOutlined style={{ marginLeft: 8, fontSize: 12 }} />}
                </div>
                <div style={{ margin: '16px 12px', padding: '16px', background: 'linear-gradient(to right top, #ff0f7b, #f89b29)', borderRadius: 8, color: 'white', textAlign: 'center', fontSize: 14 }}>
                    <div style={{fontWeight: 'bold', marginBottom: 8}}>Unlock the full Kapwing experience</div>
                    <div style={{fontSize: 12, marginBottom: 16}}>Upgrade to unlock more premium features on Kapwing</div>
                    <Button type="primary" style={{backgroundColor: 'white', color: '#ff0f7b', fontWeight: 'bold'}}>Upgrade ✨</Button>
                </div>
                <Menu theme="dark" selectedKeys={getSelectedKeys()} mode="inline" style={{ borderRight: 0 }}>
                    <Menu.Item key="search" icon={<SearchOutlined />}>Search</Menu.Item>
                    <Menu.Item key="settings-main-menu" icon={<SettingOutlined />} onClick={showSettingsPanel}> {/* Added onClick here too if desired */}
                        Settings
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.SubMenu key="team-folders" title="Team Folders" icon={<FolderOutlined />} >
                        <Menu.Item key="new-folder-item" icon={<FolderOutlined />}>New Folder</Menu.Item>
                    </Menu.SubMenu>
                    <Menu.Item key="private-folders" icon={<FolderOutlined />} disabled>Private Folders</Menu.Item>
                    {!collapsed && (<div style={{color: '#aaa', fontSize: 11, padding: '0 24px 16px 24px'}}>Projects in these folders are only accessible by you.</div>)}
                    <Menu.Divider />
                    <Menu.Item key="shared-with-me" icon={<ShareAltOutlined />}>Shared with Me</Menu.Item>
                    <Menu.Item key="help-resources" icon={<QuestionCircleOutlined />}>Help and Resources</Menu.Item>
                </Menu>
                {!collapsed && userData && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', gap: 12, backgroundColor: '#001529', color: 'white' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#6a1b9a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 'bold', color: 'white' }}>
                            {displayedUsername ? displayedUsername.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                            <div style={{fontWeight: 'bold', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150}}>{displayedUsername}</div>
                            <div style={{fontSize: 12, color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150}}>{displayedEmail}</div>
                        </div>
                    </div>
                )}
            </Sider>

            <Layout className="site-layout">
                <Header style={{ padding: '0 16px', background: 'var(--ant-layout-header-background, #fff)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--ant-border-color-split, #f0f0f0)' }}>
                    <div style={{display: 'flex', alignItems: 'center', fontWeight: 'bold', fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                        {displayedTeamName} <DownOutlined style={{marginLeft: 8, fontSize: 12, cursor: 'pointer'}} />
                    </div>
                    <Space size="middle" style={{ marginRight: screens.md ? 24 : 16 }}>
                        <Button type="primary" style={{backgroundColor: '#f89b29', borderColor: '#f89b29', fontWeight: 'bold'}}>UPGRADE ✨</Button>
                        <SearchOutlined style={{fontSize: 20, cursor: 'pointer'}} />
                        <BellOutlined style={{fontSize: 20, cursor: 'pointer'}} />
                        <SettingOutlined style={{fontSize: 20, cursor: 'pointer'}} onClick={showSettingsPanel} /> {/* <-- TRIGGER FOR SETTINGS PANEL */}
                        <UserOutlined style={{fontSize: 20, cursor: 'pointer'}} />
                        <UsergroupAddOutlined style={{fontSize: 20, cursor: 'pointer'}} />
                        <DarkModeToggle />
                    </Space>
                </Header>

                <Content style={{ margin: '0 16px', padding: 24, minHeight: 280, background: 'var(--ant-layout-content-background, transparent)' }}>
                    {/* Content (remains the same) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                            {userData?.workspace?.workspaceName || 'My Workspace'} <DownOutlined style={{ marginLeft: 8, fontSize: 16, cursor: 'pointer' }} />
                        </Title>
                        <Text type="secondary" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            Date updated <DownOutlined style={{ marginLeft: 4, fontSize: 12 }} />
                        </Text>
                    </div>
                    <Space size="middle" style={{ marginBottom: 24 }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={showCreateModal} style={{fontWeight: 'bold'}} disabled={isLoadingUserData || !userData?.workspace}>
                            Create new
                        </Button>
                        <Button icon={<TranslationOutlined />} onClick={handleChangetoSummary}>Summary</Button>
                        <Button icon={<BarsOutlined />}>Repurpose</Button>
                        <Button icon={<BulbOutlined />}>Generate</Button>
                    </Space>

                    {isLoadingUserData && projects.length === 0 ? (
                        <Row gutter={[16, 24]} justify="center" style={{marginTop: 40}}>
                            <Col> <Spin tip="Loading projects..." /> </Col>
                        </Row>
                    ) : !isLoadingUserData && projects.length === 0 && !userError ? (
                        <Row gutter={[16, 24]} justify="center" style={{marginTop: 40}}>
                            <Col style={{textAlign: 'center'}}>
                                <PictureOutlined style={{fontSize: 48, color: '#ccc', marginBottom: 16}}/>
                                <Text>No projects found in your workspace.</Text><br/>
                                <Text type="secondary">Click "Create new" to get started.</Text>
                            </Col>
                        </Row>
                    ) : (
                        <Row gutter={[16, 24]}>
                            {projects.map((project) => (
                                <Col key={project.projectId} className="gutter-row" xs={24} sm={12} md={8} lg={6} xl={4}>
                                    <ProjectCard project={project} ownerName={displayedUsername} onClick={handleProjectCardClick} />
                                </Col>
                            ))}
                        </Row>
                    )}
                </Content>
            </Layout>

            {/* Create New Project Modal (remains the same) */}
            <Modal
                title="Create New Project"
                open={isModalVisible}
                onCancel={handleModalCancel}
                footer={[
                    <Button key="back" onClick={handleModalCancel} disabled={isSubmittingProject}>Cancel</Button>,
                    <Button key="submit" type="primary" loading={isSubmittingProject} onClick={() => {
                        form.validateFields().then((values) => {
                            handleCreateProjectSubmit(values as { projectName: string; description: string });
                        }).catch((info) => { console.log('Validate Failed:', info); });
                    }}>Create</Button>,
                ]}
            >
                <Form form={form} layout="vertical" name="create_project_form" initialValues={{ description: '' }}>
                    <Form.Item name="projectName" label="Project Name" rules={[{ required: true, message: 'Please enter a project name!' }]}>
                        <Input placeholder="e.g., My Awesome Video"/>
                    </Form.Item>
                    <Form.Item name="description" label="Description (Optional)">
                        <Input.TextArea rows={4} placeholder="A short description of your project" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* --- Settings Panel Drawer --- */}
            <Drawer
                title="Account Settings"
                placement="right"
                onClose={closeSettingsPanel}
                open={isSettingsPanelVisible}
                width={screens.xs ? '90%' : 360} // Adjust width for smaller screens
            >
                {userData ? (
                    <>
                        <Space direction="vertical" size="large" style={{ width: '100%' }}>
                            <Card>
                                <Meta
                                    avatar={
                                        <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#1890ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'white', marginRight: 16 }}>
                                            {displayedUsername.charAt(0).toUpperCase()}
                                        </div>
                                    }
                                    title={<Title level={5} style={{ margin: 0 }}>{displayedUsername}</Title>}
                                    description={<Text type="secondary">{displayedEmail}</Text>}
                                />
                            </Card>

                            <Card title={<Space><DatabaseOutlined /> Storage Usage</Space>}>
                                <Paragraph>
                                    Total storage used by video projects: <Text strong>{formatBytes(totalStorageUsedBytes)}</Text>
                                </Paragraph>
                                {/* You can add a progress bar here if you have a total quota */}
                                {/* <Progress percent={50} /> */}
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    This reflects the size of video files associated with your projects.
                                </Text>
                            </Card>

                            <Card title={<Space><UserSwitchOutlined /> Account Actions</Space>}>
                                <Button type="dashed" block danger onClick={() => {
                                    closeSettingsPanel(); // Close panel first
                                    Swal.fire({
                                        title: 'Are you sure?',
                                        text: "You will be logged out!",
                                        icon: 'warning',
                                        showCancelButton: true,
                                        confirmButtonColor: '#d33',
                                        cancelButtonColor: '#3085d6',
                                        confirmButtonText: 'Yes, log me out!'
                                    }).then((result) => {
                                        if (result.isConfirmed) {
                                            dispatch(logoutUser());
                                            navigate('/login');
                                            Swal.fire('Logged Out!', 'You have been successfully logged out.', 'success');
                                        }
                                    })
                                }}>
                                    Log Out
                                </Button>
                            </Card>
                        </Space>
                    </>
                ) : (
                    <Spin tip="Loading account details..." />
                )}
            </Drawer>
        </Layout>
    );
};

export default NewHomePage;
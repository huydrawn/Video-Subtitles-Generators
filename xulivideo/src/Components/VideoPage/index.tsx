// File: src/Components/VideoPage/index.tsx (NewHomePage.txt)
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

import { useLocation, useNavigate } from 'react-router-dom';
import {
    Layout, Menu, Input, Row, Col, Card, Space, Grid, Button, Typography, Dropdown, Spin, Modal, Form
} from 'antd';
import {
    SearchOutlined,
    FolderOutlined,
    SettingOutlined,
    ShareAltOutlined,
    QuestionCircleOutlined,
    UserOutlined,
    PlusOutlined,
    DownOutlined,
    EllipsisOutlined,
    TranslationOutlined,
    BarsOutlined,
    BulbOutlined,
    BellOutlined,
    UsergroupAddOutlined, SunOutlined, MoonOutlined, ClockCircleOutlined, BookOutlined, PictureOutlined
} from '@ant-design/icons';
import * as DarkReader from 'darkreader';


const { Header, Sider, Content } = Layout;
const { Search } = Input;
const { Meta } = Card;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

// Define interfaces for the data structure
interface Project {
    projectId: number;
    publicId: string;
    projectName: string;
    description: string;
    createdAt: string; // ISO 8601 string
    updatedAt: string; // ISO 8601 string
    video: { // <-- Define the expected video structure
        videoId: number;
        title: string;
        cloudinaryPublicId: string;
        url: string;
        thumbnailUrl: string;
        secureUrl: string; // <-- This is what we need
        resourceType: string;
        format: string;
        duration: number;
        bytes: number;
        width: number;
        height: number;
    } | null; // video can be null
}

interface Workspace {
    workspaceId: number;
    publicId: string;
    workspaceName: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    projects: Project[]; // Array of Project objects
}

interface UserDTO {
    userId: number;
    username: string;
    email: string;
    createdAt: string;
    updatedAt: string;
    status: string;
    workspace: Workspace | null; // User might not have a workspace
}


// --- Dark Mode Toggle Component ---
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
            console.warn("DarkReader functions not available, cannot apply theme.");
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
            console.warn("DarkReader functions not available, cannot toggle.");
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


// --- Project Card Component ---
const ProjectCard: React.FC<{
    project: Project; // Receive the full project object
    ownerName: string;
    onClick: (project: Project) => void; // Pass the project object on click
}> = ({ project, ownerName, onClick }) => {
    const { projectName, updatedAt, video } = project; // Destructure project
    const thumbnailUrl = video?.thumbnailUrl; // Get thumbnail URL from video object

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

    return (
        <Card
            hoverable
            style={{
                width: '100%',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 8,
            }}
            onClick={() => onClick(project)} // Pass the project object here
        >
            {/* Cover Area content */}
            <div style={{
                width: '100%',
                paddingTop: '56.25%', // Standard 16:9 aspect ratio (or adjust as needed)
                backgroundColor: '#fff',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                marginBottom: 8,
                borderBottom: '1px solid #f0f0f0',
                overflow: 'hidden' // Hide overflow if thumbnail is too large
            }}>
                {thumbnailUrl ? (
                    // Display thumbnail if available
                    <img
                        src={thumbnailUrl}
                        alt={`${projectName} thumbnail`}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover', // Cover the area without distortion
                        }}
                    />
                ) : (
                    // Display placeholder icon if no thumbnail
                    <PictureOutlined style={{ fontSize: 48, color: '#ccc', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                )}
            </div>

            {/* Meta Area */}
            <div style={{ padding: '0 8px 8px 8px' }}>
                <Text strong ellipsis={{ tooltip: projectName }} style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>
                    {projectName || 'Untitled Project'}
                </Text>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                    {ownerName}, {formatDate(updatedAt)}
                </Text>
                {/* Optional: Display video duration if available */}
                {video?.duration && (
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                        Duration: {Math.floor(video.duration / 60).toString().padStart(2, '0')}:{(video.duration % 60).toFixed(2).padStart(5, '0')}
                    </Text>
                )}
            </div>

            {/* Ellipsis Icon (Dropdown) */}
            <div style={{
                position: 'absolute',
                top: 8, // Position top-right
                right: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.7)', // Semi-transparent background for visibility
                borderRadius: '50%',
                padding: 4,
            }}>
                <Dropdown overlay={
                    <Menu onClick={e => e.domEvent.stopPropagation()}>
                        <Menu.Item key="edit">Edit Details</Menu.Item>
                        {/* Add logic for deleting the project */}
                        <Menu.Item key="delete" danger>Delete Project</Menu.Item>
                    </Menu>
                } trigger={['click']}>
                    <EllipsisOutlined
                        style={{ fontSize: 18, cursor: 'pointer', color: '#333' }} // Adjust color for visibility on light background
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
    const location = useLocation();
    const navigate = useNavigate();
    const screens = useBreakpoint();

    const [userData, setUserData] = useState<UserDTO | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form] = Form.useForm();

    // --- Fetch User Data and Projects on Component Mount ---
    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem('accessToken');

            if (!token) {
                console.log("No access token found. Redirecting to login.");
                Swal.fire({
                    icon: 'warning',
                    title: 'Not Logged In',
                    text: 'Please log in to access this page.',
                    timer: 3000,
                    timerProgressBar: true,
                    showConfirmButton: false
                }).then(() => {
                    navigate('/login');
                });
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);

                const response = await axios.get<UserDTO>(
                    "http://localhost:8080/api/users",
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                );

                const fetchedUserData = response.data;
                setUserData(fetchedUserData);

                if (fetchedUserData?.workspace?.projects) {
                    const sortedProjects = fetchedUserData.workspace.projects.sort((a, b) =>
                        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                    );
                    setProjects(sortedProjects);
                } else {
                    setProjects([]);
                    console.warn("No workspace or projects found for this user.");
                }

                setIsLoading(false);

            } catch (err: any) {
                setIsLoading(false);
                console.error("Error fetching user data:", err);

                let errorMessage = "Failed to fetch user data.";
                let shouldRedirect = false;

                if (err.response) {
                    console.error("API response error:", err.response.status, err.response.data);
                    if (err.response.status === 401 || err.response.status === 403) {
                        errorMessage = "Your session has expired. Please log in again.";
                        localStorage.removeItem('accessToken');
                        shouldRedirect = true;
                    } else if (err.response.data && err.response.data.message) {
                        errorMessage = err.response.data.message;
                    } else {
                        errorMessage = `Server error: ${err.response.status}`;
                    }
                } else if (err.request) {
                    errorMessage = "Network error: No response from server.";
                } else {
                    errorMessage = `An unexpected error occurred: ${err.message}`;
                }

                setError(errorMessage);

                Swal.fire({
                    icon: shouldRedirect ? 'warning' : 'error',
                    title: shouldRedirect ? 'Session Expired' : 'Fetch Failed',
                    text: errorMessage,
                    confirmButtonText: 'OK'
                }).then(() => {
                    if (shouldRedirect) {
                        navigate('/login');
                    }
                });
            }
        };

        fetchUserData();

    }, [navigate]);


    // --- Modal Handlers ---
    const showCreateModal = () => {
        if (!userData?.workspace?.publicId) {
            Swal.fire({
                icon: 'error',
                title: 'Cannot Create Project',
                text: 'User workspace information is missing. Please reload the page or contact support.',
            });
            return;
        }
        setIsModalVisible(true);
        form.resetFields();
    };

    const handleModalCancel = () => {
        setIsModalVisible(false);
        form.resetFields();
    };

    const handleCreateProjectSubmit = async (values: { projectName: string; description: string }) => {
        const token = localStorage.getItem('accessToken');
        const workspacePublicId = userData?.workspace?.publicId;

        if (!token || !workspacePublicId) {
            console.error("Missing token or workspacePublicId for project creation.");
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Authentication or workspace information missing. Please try logging in again.',
            });
            handleModalCancel();
            return;
        }

        setIsSubmitting(true);

        try {
            const apiUrl = `http://localhost:8080/api/workspace/${workspacePublicId}/projects`;

            const response = await axios.post<Project>(
                apiUrl,
                {
                    projectName: values.projectName,
                    description: values.description,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const newProject = response.data;

            setProjects([newProject, ...projects]);

            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Project created successfully!',
            });

            handleModalCancel();

        } catch (err: any) {
            console.error("Error creating project:", err);

            let errorMessage = "Failed to create project.";
            if (err.response) {
                console.error("API response error:", err.response.status, err.response.data);
                if (err.response.status === 401 || err.response.status === 403) {
                    errorMessage = "You are not authorized to perform this action. Please log in again.";
                    localStorage.removeItem('accessToken');
                    Swal.fire({
                        icon: 'warning',
                        title: 'Unauthorized',
                        text: errorMessage,
                    }).then(() => navigate('/login'));
                } else if (err.response.data?.message) {
                    errorMessage = err.response.data.message;
                } else {
                    errorMessage = `Server responded with status: ${err.response.status}`;
                }
            } else if (err.request) {
                errorMessage = "Network error: Could not reach server. Is the backend running?";
            } else {
                errorMessage = `An unexpected error occurred: ${err.message}`;
            }

            Swal.fire({
                icon: 'error',
                title: 'Creation Failed',
                text: errorMessage,
            });

        } finally {
            setIsSubmitting(false);
        }
    };

    // Function to handle navigating to Summary page (if applicable)
    const handleChangetoSummary = () => {
        navigate('/summary');
    };


    // --- Handle clicking a project card ---
    // This function now receives the full project object
    const handleProjectCardClick = (project: Project) => {
        console.log("Project card clicked:", project.projectName, "ID:", project.projectId);

        // Check if the project has an associated video with a secure URL
        if (project.video && project.video.secureUrl) {
            console.log("Project has video with secureUrl. Navigating to editor with state.");
            // Log the secureUrl here as requested
            console.log("Secure URL of the clicked video:", project.video.secureUrl);
            // Navigate to the video editor, passing the secureUrl in the state
            navigate('/videoeditor', {
                state: {
                    initialVideoUrl: project.video.secureUrl,
                    projectId: project.projectId,
                    publicId: project.publicId // Added publicId here
                }

            });

        } else {
            // If no video or secureUrl, maybe navigate to a new editor session
            // Or navigate to the editor for this project ID, expecting user to upload
            console.log("Project has no video. Navigating to editor without initial video.");
            // Navigate to the video editor without initial video state, maybe just pass project ID
            navigate('/videoeditor', {
                state: {
                    projectId: project.projectId,
                    publicId: project.publicId} });
            console.log(project.publicId);

            // The editor hook will then start in the 'initial' state, ready for upload
        }
    };

    const getSelectedKeys = () => {
        return ['new-folder-item'];
    };


    if (isLoading) {
        return (
            <Layout style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Spin size="large" tip="Loading user data and projects..." />
            </Layout>
        );
    }

    if (error && !isLoading) {
        return (
            <Layout style={{ minHeight: '100vh', padding: 24, textAlign: 'center' }}>
                <Title level={4} type="danger">Error Loading Data</Title>
                <Button type="primary" onClick={() => window.location.reload()}>Retry</Button>
                <Button type="link" onClick={() => navigate('/login')}>Go to Login</Button>
            </Layout>
        );
    }

    const displayedUsername = userData?.username || 'User';
    const displayedEmail = userData?.email || 'email@example.com';
    const displayedTeamName = userData?.workspace?.workspaceName || `${displayedUsername}'s Workspace`; // Use workspace name if available

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {/* Sider (Left Sidebar) */}
            <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} width={240}>
                <div style={{ height: 40, margin: 12, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 4, textAlign: 'center', lineHeight: '40px', color: 'white', fontWeight: 'bold', overflow: 'hidden', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>
                    {collapsed ? 'VSA' : displayedTeamName}
                    {!collapsed && <DownOutlined style={{ marginLeft: 8, fontSize: 12 }} />}
                </div>

                <div style={{
                    margin: '16px 12px',
                    padding: '16px',
                    background: 'linear-gradient(to right top, #ff0f7b, #f89b29)',
                    borderRadius: 8,
                    color: 'white',
                    textAlign: 'center',
                    fontSize: 14
                }}>
                    <div style={{fontWeight: 'bold', marginBottom: 8}}>Unlock the full Kapwing experience</div>
                    <div style={{fontSize: 12, marginBottom: 16}}>Upgrade to unlock more premium features on Kapwing</div>
                    <Button type="primary" style={{backgroundColor: 'white', color: '#ff0f7b', fontWeight: 'bold'}}>Upgrade ✨</Button>
                </div>

                <Menu theme="dark" selectedKeys={getSelectedKeys()} mode="inline" style={{ borderRight: 0 }}>
                    <Menu.Item key="search" icon={<SearchOutlined />}>
                        Search
                    </Menu.Item>
                    <Menu.Item key="brand-kit" icon={<BookOutlined />}>
                        Brand Kit ✨
                    </Menu.Item>
                    <Menu.Item key="settings" icon={<SettingOutlined />}>
                        Settings
                    </Menu.Item>
                    <Menu.Divider />

                    <Menu.SubMenu key="team-folders" title="Team Folders" icon={<FolderOutlined />} >
                        <Menu.Item key="new-folder-item" icon={<FolderOutlined />}>
                            New Folder
                        </Menu.Item>
                    </Menu.SubMenu>

                    <Menu.Item key="private-folders" icon={<FolderOutlined />} disabled>
                        Private Folders
                    </Menu.Item>
                    {!collapsed && (
                        <div style={{color: '#aaa', fontSize: 11, padding: '0 24px 16px 24px'}}>
                            Projects in these folders are only accessible by you.
                        </div>
                    )}

                    <Menu.Divider />

                    <Menu.Item key="shared-with-me" icon={<ShareAltOutlined />}>
                        Shared with Me
                    </Menu.Item>
                    <Menu.Item key="help-resources" icon={<QuestionCircleOutlined />}>
                        Help and Resources
                    </Menu.Item>
                </Menu>

                {!collapsed && (
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '16px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        backgroundColor: '#001529',
                        color: 'white'
                    }}>
                        <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: '#6a1b9a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 16,
                            fontWeight: 'bold',
                            color: 'white'
                        }}>
                            {displayedUsername ? displayedUsername.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                            <div style={{fontWeight: 'bold', fontSize: 14}}>{displayedUsername}</div>
                            <div style={{fontSize: 12, color: '#aaa'}}>{displayedEmail}</div>
                        </div>
                    </div>
                )}
            </Sider>

            {/* Content Layout */}
            <Layout className="site-layout">
                {/* Header */}
                <Header style={{ padding: '0 16px', background: 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{display: 'flex', alignItems: 'center', fontWeight: 'bold', fontSize: 18}}>
                        {displayedTeamName} <DownOutlined style={{marginLeft: 8, fontSize: 12}} />
                    </div>

                    <Space size="middle" style={{ marginRight: screens.md ? 24 : 16 }}>
                        <Button type="primary" style={{backgroundColor: '#f89b29', borderColor: '#f89b29', fontWeight: 'bold'}}>UPGRADE ✨</Button>
                        <SearchOutlined style={{fontSize: 20, cursor: 'pointer'}} />
                        <BellOutlined style={{fontSize: 20, cursor: 'pointer'}} />
                        <SettingOutlined style={{fontSize: 20, cursor: 'pointer'}} />
                        <UserOutlined style={{fontSize: 20, cursor: 'pointer'}} />
                        <UsergroupAddOutlined style={{fontSize: 20, cursor: 'pointer'}} />
                        <DarkModeToggle />
                    </Space>
                </Header>

                {/* Main Content Area */}
                <Content style={{ margin: '0 16px', padding: 24, minHeight: 280, background: 'transparent' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                            {userData?.workspace?.workspaceName || 'My Workspace'} <DownOutlined style={{ marginLeft: 8, fontSize: 16 }} />
                        </Title>
                        <Text type="secondary" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            Date updated <DownOutlined style={{ marginLeft: 4, fontSize: 12 }} />
                        </Text>
                    </div>

                    {/* Second Row: Action Buttons */}
                    <Space size="middle" style={{ marginBottom: 24 }}>
                        {/* Updated onClick handler for the "Create new" button */}
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={showCreateModal}
                            style={{fontWeight: 'bold'}}
                            disabled={isLoading || !userData?.workspace}
                        >
                            Create new
                        </Button>
                        <Button icon={<TranslationOutlined />} onClick={handleChangetoSummary}>Summary</Button>
                        <Button icon={<BarsOutlined />}>Repurpose</Button>
                        <Button icon={<BulbOutlined />}>Generate</Button>
                    </Space>

                    {/* Project/File Cards Grid */}
                    <Row gutter={[16, 24]}>
                        {projects.length === 0 && !isLoading && !error ? (
                            <Col span={24} style={{textAlign: 'center'}}>
                                <Text>No projects found in your workspace.</Text>
                            </Col>
                        ) : (
                            projects.map((project) => (
                                <Col key={project.projectId} className="gutter-row" xs={24} sm={12} md={8} lg={6} xl={4}>
                                    <ProjectCard
                                        project={project} // Pass the full project object
                                        ownerName={displayedUsername}
                                        onClick={handleProjectCardClick} // Pass the click handler
                                    />
                                </Col>
                            ))
                        )}
                    </Row>
                </Content>
            </Layout>

            {/* --- Create New Project Modal --- */}
            <Modal
                title="Create New Project"
                open={isModalVisible}
                onCancel={handleModalCancel}
                footer={[
                    <Button key="back" onClick={handleModalCancel}>
                        Cancel
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        loading={isSubmitting}
                        onClick={() => {
                            form
                                .validateFields()
                                .then((values) => {
                                    handleCreateProjectSubmit(values);
                                })
                                .catch((info) => {
                                    console.log('Validate Failed:', info);
                                });
                        }}
                    >
                        Create
                    </Button>,
                ]}
            >
                <Form
                    form={form}
                    layout="vertical"
                    name="create_project_form"
                >
                    <Form.Item
                        name="projectName"
                        label="Project Name"
                        rules={[{ required: true, message: 'Please enter a project name!' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="description"
                        label="Description (Optional)"
                    >
                        <Input.TextArea rows={4} />
                    </Form.Item>
                </Form>
            </Modal>
        </Layout>
    );
};

export default NewHomePage;
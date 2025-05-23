import React, { useRef, useCallback, useMemo } from 'react';
import {
    Layout, Tabs, Button, Row, Col, Card, Typography, Upload, Avatar, Space, Tooltip, Progress,
} from 'antd';
import { theme } from 'antd';
import {
    VideoCameraOutlined, FileImageOutlined, PlusOutlined, InboxOutlined,
    GoogleOutlined, MoreOutlined
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import type { MediaAsset, EditorProjectState } from './types'; // Adjusted path
import axios from 'axios'; // Import axios
import {Client, IMessage, StompSubscription} from '@stomp/stompjs'; // Import STOMP types
import SockJS from 'sockjs-client'; // Import SockJS
import { useNavigate } from 'react-router-dom'; // Import useNavigate


const { TabPane } = Tabs;
const { Text, Paragraph } = Typography;
const { Dragger } = Upload;

interface MediaPanelProps {
    projectId: string; // Still keeping this prop
    // Get required state and setters from the hook via parent component (VideoEditor)
    // FIX: editorState is NOT a property of EditorProjectState. Use its actual type.
    editorState: 'initial' | 'uploading' | 'editor';
    mediaAssets: EditorProjectState['mediaAssets'];
    uploadProgress: EditorProjectState['uploadProgress'];
    uploadingFile: EditorProjectState['uploadingFile'];
    currentUploadTaskId: EditorProjectState['currentUploadTaskId'];
    setUploadState: (updates: Partial<{ progress: number; file: File | null; taskId: string | null }>) => void;
    handleUploadFinish: (file: File) => void; // Handler from the hook
    draggerProps: UploadProps; // Modified draggerProps from the hook
}

export const MediaPanel: React.FC<MediaPanelProps> = React.memo(({
                                                                     projectId, // This prop is present but not used in the upload URL below
                                                                     editorState, // Now correctly typed
                                                                     mediaAssets,
                                                                     uploadProgress,
                                                                     uploadingFile,
                                                                     currentUploadTaskId,
                                                                     setUploadState,
                                                                     handleUploadFinish,
                                                                     draggerProps, // Use the draggerProps from the hook
                                                                 }) => {
    const { token } = theme.useToken();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const navigate = useNavigate();
    // API URL and WebSocket Endpoint - use these from config or environment variables in a real app
    // const uploadUrl = `http://192.168.137.1:8080/api/projects/7c231bcc-1489-4512-8607-da2318e6e560/videos`;
    // const websocketEndpoint = 'http://192.168.137.1:8080/ws';
    const uploadUrl = `http://localhost:8080/api/projects/7c231bcc-1489-4512-8607-da2318e6e560/videos`;
    const websocketEndpoint = 'http://localhost:8080/ws';
    // WebSocket client ref
    const stompClientRef = useRef<Client | null>(null);
    const stompSubscriptionRef = useRef<StompSubscription | null>(null);


    // Kích hoạt input file ẩn khi bấm nút hoặc link
    const triggerFileInput = useCallback(() => {
        inputRef.current?.click();
    }, []);

    // Hàm xử lý upload khi file được chọn qua input ẩn (hoặc drop captured by input)Đây là Progress hiển thị phần trăm
    const handleManualUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) {
            // Clear the file input value so the same file can be selected again
            if (inputRef.current) inputRef.current.value = '';
            return;
        }

        const file = files[0];

        // Clear previous upload state and set new file for uploading
        setUploadState({ progress: 0, file: file, taskId: null });

        // Điều hướng ngay lập tức đến trang editor (nếu chưa ở đó)
        // Note: navigate will trigger a re-render, the UI will show "Uploading X%"
        // as editorState will be 'uploading' and uploadingFile will be set.
        navigate('/videoeditor');


        const formData = new FormData();
        formData.append('file', file);

        const accessToken = localStorage.getItem('accessToken'); // Assuming token is stored here
        if (!accessToken) {
            setUploadState({ progress: 0, file: null, taskId: null }); // Reset state on auth error
            if (inputRef.current) inputRef.current.value = '';
            return;
        }

        try {
            // Start the HTTP POST upload
            const response = await axios.post(uploadUrl, formData, {
                headers: { Authorization: `Bearer ${accessToken}` },
                // Axios progress is for upload *transfer*, not backend processing
                // We rely on WS for backend processing progress
                onUploadProgress: (progressEvent) => {
                    // Optional: Update a separate "upload transfer progress" if needed
                    // const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    // console.log(`Upload transfer progress: ${percentCompleted}%`);
                }
            });

            const taskId = response.data;
            console.log('✅ Upload initiated. Task ID:', taskId);

            // Update state with the task ID
            setUploadState({ taskId: taskId });


            // === Kết nối WebSocket để theo dõi tiến trình xử lý ===
            const client = new Client({
                webSocketFactory: () => new SockJS(websocketEndpoint),
                reconnectDelay: 5000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
            });

            stompClientRef.current = client; // Store client in ref

            client.onConnect = (frame) => {
                console.log('🚀 Connected to WebSocket', frame);
                const topic = `/topic/progress/${taskId}`;
                const subscription = client.subscribe(topic, (message: IMessage) => {
                    const data = JSON.parse(message.body);
                    console.log('📨 WS Message for task', taskId, ':', data);

                    // Update frontend state with progress
                    if (data && typeof data.progress === 'number') {
                        setUploadState({ progress: data.progress });
                    }

                    if (data.status === 'complete') {
                        console.log('✅ Backend processing complete for task', taskId);

                        // Call the hook's handler to add the asset to project state
                        handleUploadFinish(file); // Pass the original file object

                        // Clean up WebSocket
                        if (stompSubscriptionRef.current) {
                            stompSubscriptionRef.current.unsubscribe();
                            stompSubscriptionRef.current = null;
                        }
                        client.deactivate();
                        stompClientRef.current = null; // Clear client ref

                    } else if (data.status === 'error') {
                        console.error('❌ Backend processing error for task', taskId, ':', data.message);

                        // Clean up WebSocket and reset state
                        if (stompSubscriptionRef.current) {
                            stompSubscriptionRef.current.unsubscribe();
                            stompSubscriptionRef.current = null;
                        }
                        client.deactivate();
                        stompClientRef.current = null; // Clear client ref
                        setUploadState({ progress: 0, file: null, taskId: null }); // Reset upload state

                        // Decide if we should go back to initial or stay in editor based on existing assets
                        // This is handled by handleUploadFinish success path. For error, maybe reset editorState?
                        // If there were no assets before, maybe go back to initial? Let hook decide.
                        // Leaving editorState as 'uploading' might be ok until user interaction.
                        // Or explicitly setting it to 'editor' if there are other assets, 'initial' otherwise.
                        // Let's trust the hook's logic after handleUploadFinish for success.
                        // For error, we might need a separate state change or logic in VideoEditor.
                    }
                });
                stompSubscriptionRef.current = subscription; // Store subscription in ref
            };

            client.onStompError = (frame) => {
                console.error('❌ STOMP error:', frame);
                setUploadState({ progress: 0, file: null, taskId: null }); // Reset upload state
            };

            client.onWebSocketError = (event) => {
                console.error('❌ WebSocket failed:', event);
                // SockJS might provide more details in event
                setUploadState({ progress: 0, file: null, taskId: null }); // Reset upload state
            };

            client.activate(); // Connect

        } catch (error: any) {
            // Handle HTTP upload errors
            const errorMessage = error.response?.data?.message || error.message || 'Unknown upload error';
            console.error('❌ HTTP Upload failed:', errorMessage);
            setUploadState({ progress: 0, file: null, taskId: null }); // Reset upload state

            // Decide if we should go back to initial or stay in editor
            // Similar logic as WS error handling might be needed
        } finally {
            // Clear the file input value so the same file can be selected again
            if (inputRef.current) inputRef.current.value = '';
        }
    }, [uploadUrl, websocketEndpoint, navigate, setUploadState, handleUploadFinish]); // Added dependencies

    // Cleanup WebSocket connection on unmount
    React.useEffect(() => {
        return () => {
            if (stompSubscriptionRef.current) {
                stompSubscriptionRef.current.unsubscribe();
                stompSubscriptionRef.current = null;
            }
            if (stompClientRef.current && stompClientRef.current.connected) {
                stompClientRef.current.deactivate();
                stompClientRef.current = null;
            }
        };
    }, []); // Empty dependency array means this runs only on mount and unmount


    // Determine if we are currently in the backend processing phase for a media file
    const isBackendProcessing = editorState === 'uploading' && uploadingFile !== null;

    // Content to show inside the Dragger area
    const draggerContent = useMemo(() => {
        if (isBackendProcessing) {
            // Show upload progress UI
            return (
                <Col span={24}>
                    <Card size="small" style={{ marginBottom: 0, background: token.colorFillContent, border: `1px solid ${token.colorBorder}` }}>
                        <Space direction="vertical" align="center" style={{ width: '100%' }}>
                            <Avatar shape="square" size={48}
                                    src={
                                        uploadingFile instanceof File ? URL.createObjectURL(uploadingFile) : undefined
                                    }
                                    icon={
                                        uploadingFile instanceof File
                                            ? (uploadingFile.type.startsWith('video')
                                                ? <VideoCameraOutlined />
                                                : <FileImageOutlined />)
                                            : <InboxOutlined />
                                    }

                                    style={{ objectFit: 'cover', background: token.colorFillAlter }}
                            />
                            <Text strong ellipsis style={{ color: token.colorText, maxWidth: '100%' }}>
                                {uploadingFile instanceof File ? uploadingFile.name : 'File'}

                            </Text>
                            {currentUploadTaskId ? (
                                <>
                                    <Progress percent={uploadProgress} size="small" style={{ width: '100%' }} />
                                    <Text type="secondary" style={{ fontSize: 12 }}>Processing...</Text>
                                </>
                            ) : (
                                <Text type="secondary" style={{ fontSize: 12 }}>Uploading...</Text>
                            )}
                        </Space>
                    </Card>
                </Col>
            );
        } else {
            // Show existing media assets grid or empty state
            return (
                <Row gutter={[8, 8]}>
                    {mediaAssets.map(asset => (
                        <Col span={12} key={asset.id}>
                            <Card hoverable size="small" className="media-asset-card">
                                <Row gutter={8} wrap={false} align="top">
                                    <Col flex="48px">
                                        <Avatar
                                            shape="square" size={48} src={asset.secureUrl}
                                            icon={!asset.secureUrl ? (asset.type.startsWith('video') ? <VideoCameraOutlined /> : <FileImageOutlined />) : null}
                                            style={{ objectFit: 'cover', background: token.colorFillAlter }}
                                        />
                                    </Col>
                                    <Col flex="auto" style={{ overflow: 'hidden' }}>
                                        <Tooltip title={asset.name} placement="bottomLeft">
                                            <Text strong ellipsis style={{ color: token.colorText, display: 'block' }}>
                                                {asset.name}
                                            </Text>
                                        </Tooltip>
                                    </Col>
                                </Row>
                            </Card>
                        </Col>
                    ))}

                    {/* Empty State */}
                    {mediaAssets.length === 0 && (
                        <Col span={24}>
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <Paragraph type="secondary" style={{ marginBottom: 8 }}>Drop files here or</Paragraph>
                                {/* Link này cũng kích hoạt input file ẩn */}
                                <Button type="link" style={{ padding: 0 }} onClick={triggerFileInput}>click to upload</Button>
                            </div>
                        </Col>
                    )}
                </Row>
            );
        }
    }, [isBackendProcessing, uploadingFile, currentUploadTaskId, uploadProgress, mediaAssets, token, triggerFileInput]);


    return (
        <div className="contextual-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: token.colorBgContainer }}>
            {/* Panel Header/Tabs */}
            <Tabs
                defaultActiveKey="project_media"
                size="small"
                tabBarGutter={12}
                tabBarStyle={{ marginBottom: 0, paddingLeft: 12, paddingRight: 12 }}
                moreIcon={<MoreOutlined />}
                style={{ flexShrink: 0, borderBottom: `1px solid ${token.colorBorderSecondary}` }}
            >
                <TabPane tab="This Project" key="project_media" />
                <TabPane tab="My Media" key="my_media" disabled />
                <TabPane tab="Google Photos" key="google_photos" disabled icon={<GoogleOutlined />} />
            </Tabs>

            {/* Input file ẩn - lắng nghe sự kiện thay đổi (chọn file) */}
            <input
                type="file"
                accept="video/*,image/*" // Only accept video and image for manual upload flow
                ref={inputRef} // Attach ref
                style={{ display: 'none' }}
                onChange={handleManualUpload} // Attach the manual upload handler
            />

            {/* Panel Content */}
            <div className="media-panel-content" style={{ flexGrow: 1, overflowY: 'auto', padding: '16px 12px' }}>
                {/* Upgrade Section Placeholder */}
                <Card size="small" style={{ marginBottom: 16, background: token.colorFillContent, border: `1px dashed ${token.colorBorder}` }}>
                    <Space direction="vertical" align="center" style={{ width: '100%' }}>
                        <Text strong style={{ fontSize: '13px' }}>Bigger, bolder assets</Text>
                        <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center', lineHeight: '1.3' }}>
                            Upgrade to upload and store assets over 250+ megabytes
                        </Text>
                        <Button type="primary" size="small" block disabled>Upgrade ✨</Button>
                    </Space>
                </Card>

                {/* "Add Media" Button - Hidden while processing */}
                {!isBackendProcessing && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        block
                        style={{ marginBottom: 16 }}
                        onClick={triggerFileInput} // Clicks the hidden input
                    >
                        Add Media
                    </Button>
                )}


                {/* Kéo thả - Dùng Dragger UI. customRequest/beforeUpload from hook handle subtitle or ignore media */}
                {/* When isBackendProcessing is true, Dragger still exists but shows progress UI */}
                <Dragger
                    {...draggerProps} // Use draggerProps from the hook
                    showUploadList={false} // Managed manually
                    style={{ padding: 0, border: 'none', background: 'transparent' }}
                    className="media-panel-dragger"
                >
                    {draggerContent} {/* Render dynamic content */}
                </Dragger>
            </div>
        </div>
    );
});
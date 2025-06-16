import React, { useRef } from 'react';
import {
    Layout, Button, Select, Space,
    Typography, Grid, theme, Upload, Card, Progress,
    message, Dropdown
} from 'antd';
import Moveable from 'react-moveable';
import {
    InboxOutlined, CaretDownOutlined,
} from '@ant-design/icons';
// Adjust path to your constants file
import { PREVIEW_ZOOM_FIT_MODE, PREVIEW_ZOOM_FILL_MODE, PREVIEW_ZOOM_LEVELS } from '../../Hooks/constants';
import type { VideoEditorLogic } from './types'; // Adjust path if needed

const { Title, Text } = Typography;
const { Dragger } = Upload;


// --- Helper Components (internal to this file) ---

const PreviewArea: React.FC<{ logic: VideoEditorLogic }> = ({ logic }) => {
    const zoomOptions = [
        { key: PREVIEW_ZOOM_FIT_MODE, label: 'Fit' },
        { key: PREVIEW_ZOOM_FILL_MODE, label: 'Fill' },
        { type: 'divider' as const },
        ...PREVIEW_ZOOM_LEVELS.map((level: number) => ({
            key: String(level), label: `${Math.round(level * 100)}%`
        }))
    ];
    const zoomButtonText = logic.previewZoomMode === PREVIEW_ZOOM_FIT_MODE ? 'Fit' :
        (logic.previewZoomMode === PREVIEW_ZOOM_FILL_MODE ? 'Fill' : `${Math.round(logic.previewZoomLevel * 100)}%`);

    return (
        <>
            <div className="preview-header" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <Dropdown menu={{ items: zoomOptions, onClick: logic.handleZoomMenuClick }} trigger={['click']}>
                    <Button size="small" style={{ minWidth: 70 }}>
                        {zoomButtonText} <CaretDownOutlined />
                    </Button>
                </Dropdown>
                <Space></Space>
            </div>
            <div ref={logic.previewContainerRef} className="preview-container">
                <canvas
                    ref={logic.canvasRef}
                    style={{
                        display: 'block',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        transformOrigin: 'center center',
                        transition: 'transform 0.1s ease-out',
                        position: 'absolute',
                        top:'50%',
                        left: '50%',
                        transform: `translate(-50%, -50%) scale(${logic.previewZoomLevel})`
                    }}
                />
                <div
                    className="moveable-target-preview"
                    style={{
                        pointerEvents: logic.selectedClip ? 'auto' : 'none',
                        display: 'none', // Moveable will make it visible when active
                        zIndex: 10
                    }}
                />
                <Moveable
                    ref={logic.previewMoveableRef}
                    target=".moveable-target-preview"
                    container={logic.previewContainerRef.current || undefined}
                    draggable={true}
                    resizable={true}
                    rotatable={true}
                    scalable={false}
                    keepRatio={false}
                    throttleDrag={0}
                    throttleResize={0}
                    throttleRotate={0}
                    snappable={true}
                    origin={true}
                    edge={true}
                    className="preview-moveable"
                    onDrag={({target, beforeTranslate}) => {
                        if (!logic.selectedClip ||
                            !logic.previewContainerRef.current ||
                            !logic.projectState.canvasDimensions) return;
                        const currentTransform = target.style.transform || '';
                        const rotationMatch = currentTransform.match(/rotate\([^)]+\)/);
                        const currentRotation = rotationMatch ? rotationMatch[0] : 'rotate(0deg)';
                        target.style.transform = `translate(${beforeTranslate[0]}px, ${beforeTranslate[1]}px) ${currentRotation}`;
                    }}
                    onDragEnd={logic.onPreviewDragEnd}
                    onResizeEnd={logic.onPreviewResizeEnd}
                    onRotateEnd={logic.onPreviewRotateEnd}
                />
            </div>
        </>
    );
};

const InitialScreen: React.FC<{ logic: VideoEditorLogic }> = ({ logic }) => {
    const initialDraggerProps = {
        name: 'file',
        multiple: true,
        showUploadList: false,
        accept: "video/*,image/*,.srt,.vtt",
        customRequest: (options: any) => {
            const { file, onSuccess } = options;
            const isSubtitle = file.type === 'application/x-subrip' ||
                file.type === 'text/vtt' ||
                file.name.toLowerCase().endsWith('.srt') ||
                file.name.toLowerCase().endsWith('.vtt');
            if (isSubtitle) {
                logic.handleUploadSrt(file as File)
                    .then(() => onSuccess?.({ status: 'done' }, file))
                    .catch(() => {/* error handled by handleUploadSrt */});
            } else {
                const tempEvent = {
                    target: { files: [file], value: '' }
                } as unknown as React.ChangeEvent<HTMLInputElement>;
                logic.handleManualMediaUpload(tempEvent);
                if (onSuccess) onSuccess({ status: 'done' }, file);
            }
        },
        beforeUpload: (file: File) => {
            const isVideo = file.type.startsWith('video/');
            const isImage = file.type.startsWith('image/');
            const isSubtitle = file.type === 'application/x-subrip' ||
                file.type === 'text/vtt' ||
                file.name.toLowerCase().endsWith('.srt') ||
                file.name.toLowerCase().endsWith('.vtt');
            if (!isVideo && !isImage && !isSubtitle) {
                message.error(`${file.name} is not a supported file type.`);
                return Upload.LIST_IGNORE;
            }
            logic.setProjectState(prev => ({
                ...prev,
                uploadProgress: 0,
                uploadingFile: file.name,
                currentUploadTaskId: `initial-upload-${Date.now()}`,
            }));
            logic.setEditorState('uploading');
            return true;
        },
        onDrop: (e: React.DragEvent<HTMLDivElement>) => { console.log('File(s) dropped on initial screen.'); },
    } as const; // Use as const to correctly type Dragger props

    return (
        <Layout.Content
            className="initial-screen-content"
            style={{
                padding: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflowY: 'auto',
                flexGrow: 1
            }}
        >
            <Card className="initial-screen-card">
                <Title level={4} style={{ marginBottom: 24, textAlign: 'center' }}>
                    Start a new project
                </Title>
                <Dragger {...initialDraggerProps} className="initial-screen-dragger">
                    {logic.uploadingFile ? (
                        <Space direction="vertical" align="center" style={{ width: '100%' }}>
                            <Title level={5} style={{ margin: 0 }}>Processing...</Title>
                            <Text type="secondary" ellipsis>
                                {typeof logic.uploadingFile === 'string'
                                    ? logic.uploadingFile
                                    : logic.uploadingFile?.name || 'Unknown file'}
                            </Text>
                            <Progress percent={logic.uploadProgress} size="small" showInfo={true} />
                        </Space>
                    ) : (
                        <>
                            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                            <p className="ant-upload-text">Click or drag file(s) here</p>
                            <p className="ant-upload-hint">
                                Video or Image files, or Subtitles (.srt, .vtt)
                            </p>
                        </>
                    )}
                </Dragger>
            </Card>
        </Layout.Content>
    );
}

// Main component for Editor Preview Area
interface EditorPreviewAreaProps {
    logic: VideoEditorLogic;
}

export const EditorPreviewArea: React.FC<EditorPreviewAreaProps> = ({ logic }) => {
    return (
        <Layout.Content
            style={{
                flexGrow: 1,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {(logic.projectState.mediaAssets.length === 0 && !logic.uploadingFile)
                ? <InitialScreen logic={logic} />
                : <PreviewArea logic={logic} />
            }
        </Layout.Content>
    );
};
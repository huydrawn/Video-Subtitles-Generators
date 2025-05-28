import React, {useRef, useState} from 'react'; // Import useState
import {
    Layout, Button, Input, Select, Space, Slider,
    Typography, Grid, theme, Drawer, Upload, Tabs, Avatar, Tooltip, Dropdown,
    ConfigProvider, Switch, Row, Col, Card, Progress, // Import Progress
    message, List, UploadProps, Modal, Radio,Checkbox
} from 'antd';
import type { MenuProps } from 'antd';
import Moveable from 'react-moveable';
import { fetchFile } from '@ffmpeg/util'; // Đảm bảo bạn có import này từ useVideoEditorLogic hoặc thêm ở đây

// Import the hook, types, and components

import {useVideoEditorLogic} from './useVideoEditorLogic';
import { formatTime,
    parseTimecodeToSeconds,
    interpolateValue,} from './utils';
import {  PREVIEW_ZOOM_FIT_MODE,
    PREVIEW_ZOOM_FILL_MODE,
    PREVIEW_ZOOM_LEVELS,} from '../../Hooks/constants';

import type { VideoEditorLogic, ClipType, Keyframe, SubtitleEntry, MediaAsset } from './types'; // Import MediaAsset
import { MainMenu } from './MainMenu';
// import { MediaPanel } from './MediaPanel'; // We will integrate MediaPanel logic here or simplify
import { TextPanel } from './TextPanel';
import { PropertiesPanel } from './PropertiesPanel';
import {
    VideoCameraOutlined, FontSizeOutlined, AudioOutlined, AppstoreOutlined,
    MenuOutlined, ShareAltOutlined, DownloadOutlined, UserOutlined, SettingOutlined,
    PauseOutlined, FileImageOutlined, ScissorOutlined,
    PlayCircleOutlined, SplitCellsOutlined, UndoOutlined, RedoOutlined, ZoomInOutlined,
    ZoomOutOutlined, InboxOutlined, CameraOutlined, CaretDownOutlined,
    AudioMutedOutlined, PlusOutlined, GoogleOutlined,
    ExpandOutlined, FullscreenOutlined,
    SecurityScanOutlined, LockOutlined, EyeOutlined, MenuUnfoldOutlined,
    DragOutlined, BgColorsOutlined as BackgroundIcon, BorderOutlined, TranslationOutlined,
    CustomerServiceOutlined, LeftOutlined, DeleteOutlined, FileTextOutlined
} from '@ant-design/icons';

// Import custom CSS
import './videoeditor.css';

const { Header, Sider, Content, Footer } = Layout;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;
const { Dragger } = Upload;
const { TabPane } = Tabs;

// --- Reusable UI Components ---
const TranscriptionProgressIndicator: React.FC<{
    progress: number; // Đây sẽ là giá trị đã được animate
    fileName: string | null;
    themeToken: ReturnType<typeof theme.useToken>['token'];
    isTranscribingActive: boolean; // Prop để biết khi nào thực sự ẩn hẳn
}> = ({ progress, fileName, themeToken, isTranscribingActive }) => {
    if (!isTranscribingActive) return null; // Ẩn nếu không còn active

    // Logic xác định văn bản trạng thái dựa trên progress
    let statusText = "Transcribing...";
    if (progress < 5) statusText = "Initializing...";
    else if (progress < 15) statusText = "Preparing Request...";
    else if (progress < 60) statusText = "Sending Request...";
    else if (progress < 75) statusText = "Processing Response...";
    else if (progress < 100) statusText = "Finalizing Subtitles...";
    else if (progress === 100) statusText = "Transcription Complete!";

    return (
        <Card bordered={false} style={{ marginBottom: 16, marginTop: 16 }}>
            <Space direction="vertical" align="center" style={{ width: '100%', paddingBottom: 16 }}>
                <Title level={5} style={{ margin: 0 }}>{statusText}</Title>
                <Progress percent={Math.round(progress)} size="small" showInfo={true} style={{ width: '100%' }} />
            </Space>
            {/* Phần hiển thị thanh progress nhỏ và tên file */}
            <div style={{
                backgroundColor: '#2c2c2c',
                padding: '12px 16px',
                borderRadius: 4,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                }}>
                    <div style={{
                        flexGrow: 1,
                        backgroundColor: '#555',
                        height: 5,
                        borderRadius: 2.5,
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            backgroundColor: themeToken.colorPrimary, // Sử dụng màu chủ đạo từ theme
                            height: '100%',
                            width: `${progress}%`, // Độ rộng dựa trên progress
                            transition: 'width 0.05s linear', // Hiệu ứng chuyển động mượt
                        }}></div>
                    </div>
                    <span style={{
                        fontSize: 12,
                        color: '#ccc',
                        minWidth: 40,
                        textAlign: 'right',
                    }}>
                        {Math.round(progress)}%
                    </span>
                </div>
                {/* Hiển thị tên file nếu có và progress chưa hoàn thành */}
                {fileName && progress < 100 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TranslationOutlined style={{ color: themeToken.colorPrimary }} />
                        <Text type="secondary" ellipsis style={{ flexGrow: 1, color: '#ccc' }}>
                            {fileName}
                        </Text>
                    </div>
                )}
            </div>
        </Card>
    );
};
// Integrated MediaPanel content into the main component render logic for simplicity.
// The MediaPanel component itself might still be useful for styling the content within the sider.
const MediaPanelContent: React.FC<{
    logic: VideoEditorLogic;
    screens: any; // Pass screens prop if needed for responsiveness
}> = ({ logic, screens }) => {
    const { token } = theme.useToken();

    // Use a hidden file input to trigger manual media upload
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAddMediaClick = () => {
        // Trigger the hidden file input click
        fileInputRef.current?.click();
    };

    return (
        <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Title level={5} style={{ margin: '0 0 16px 0' }}>Media</Title>

            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="video/*,image/*" // Specify accepted media types
                multiple={true} // Allow multiple files
                onChange={logic.handleManualMediaUpload} // Use the handler from the hook
            />

            {/* Upload Area / Progress Indicator */}
            {logic.uploadingFile ? (
                <Card bordered={false} style={{ marginBottom: 16 }}>
                    <Space direction="vertical" align="center" style={{ width: '100%', paddingBottom: 16 }}>
                        {/* Tiêu đề chính */}
                        <Title level={5} style={{ margin: 0 }}>Uploading...</Title>
                        {/* Thanh Progress Ant Design chính (vẫn hiển thị phần trăm ở đây theo mặc định) */}
                        <Progress percent={logic.uploadProgress} size="small" showInfo={true} style={{ width: '100%' }} />
                    </Space>

                    {/* --- Bắt đầu phần thêm mới để mô phỏng thanh player bar và tên file --- */}
                    <div style={{
                        backgroundColor: '#2c2c2c', // Nền tối cho phần bar
                        padding: '12px 16px', // Padding bên trong nền tối
                        borderRadius: 4, // Bo góc nhẹ cho nền tối
                        display: 'flex',
                        flexDirection: 'column', // Sắp xếp nội dung theo cột (bar + tên file)
                        gap: 12, // Khoảng cách giữa thanh bar và tên file
                    }}>
                        {/* Container cho Timestamp, thanh progress nhỏ và phần trăm */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center', // Căn giữa theo chiều dọc
                            gap: 8, // Khoảng cách giữa các thành phần
                            width: '100%',
                        }}>
                            {/* Timestamp bên trái */}
                            <span style={{
                                color: 'white',
                                fontSize: 12,
                                backgroundColor: '#1a1a1a',
                                padding: '2px 6px',
                                borderRadius: 4,
                                minWidth: 40,
                                textAlign: 'center',
                            }}>
                      {logic.projectState.uploadTimeRemaining || '00:00'}

                </span>

                            {/* Thanh progress nhỏ */}
                            <div style={{
                                flexGrow: 1, // Chiếm hết không gian còn lại
                                backgroundColor: '#555', // Màu nền track của bar
                                height: 5, // Chiều cao thanh bar
                                borderRadius: 2.5, // Bo góc
                                overflow: 'hidden',
                            }}>
                                {/* Thanh fill */}
                                <div style={{
                                    backgroundColor: token.colorPrimary, // Sử dụng màu chính từ theme
                                    height: '100%',
                                    width: `${logic.uploadProgress}%`, // Độ rộng theo phần trăm upload
                                    transition: 'width 0.1s ease-in-out', // Hiệu ứng chuyển động
                                }}></div>
                            </div>

                            {/* Thêm hiển thị phần trăm vào đây */}
                            <span style={{
                                fontSize: 12,
                                color: '#ccc', // Màu chữ xám nhạt
                                minWidth: 40, // Đảm bảo đủ không gian cho "100%"
                                textAlign: 'right', // Căn lề phải
                            }}>
                    {Math.round(logic.uploadProgress)}% {/* Sử dụng Math.round để làm tròn */}
                </span>

                        </div>

                        {/* Tên file với icon */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileTextOutlined style={{ color: token.colorPrimary }} /> {/* Icon file */}
                            <Text type="secondary" ellipsis style={{ flexGrow: 1, color: '#ccc' }}>
                                {typeof logic.uploadingFile === 'string'
                                    ? logic.uploadingFile
                                    : logic.uploadingFile?.name || 'Unknown file'}
                            </Text>
                        </div>

                    </div>
                    {/* --- Kết thúc phần thêm mới --- */}

                </Card>
            ) : (
                // Giữ nguyên phần hiển thị khi chưa upload
                <Card hoverable style={{ marginBottom: 16, cursor: 'pointer' }} onClick={handleAddMediaClick}>
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <InboxOutlined style={{ fontSize: 30, color: token.colorPrimary }} />
                        <Title level={5} style={{ margin: '8px 0 4px 0' }}>Upload Media</Title>
                        <Text type="secondary" style={{ fontSize: 12 }}>Drag and drop or click to upload videos or images</Text>
                    </div>
                </Card>
            )}

            {/* Media Assets List */}
            <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                {logic.projectState.mediaAssets.length > 0 ? (
                    <List
                        itemLayout="horizontal"
                        dataSource={logic.projectState.mediaAssets}
                        renderItem={(item: MediaAsset) => (
                            <List.Item
                                key={item.id}
                                // Optionally add click handler to add to timeline or preview
                                actions={[
                                    <Button key="add" size="small" icon={<PlusOutlined />} onClick={() => console.log("Add asset to timeline (placeholder)")} />,
                                    <Button key="delete" size="small" icon={<DeleteOutlined />} danger onClick={() => console.log("Delete asset (placeholder)")} />,
                                ]}
                            >
                                <List.Item.Meta
                                    avatar={<Avatar src={item.type.startsWith('image') ? item.secureUrl : undefined} icon={item.type.startsWith('video') ? <VideoCameraOutlined /> : (item.type.startsWith('image') ? <FileImageOutlined /> : <FileImageOutlined />)} />}
                                    title={<Text ellipsis>{item.name}</Text>}
                                    description={<Text type="secondary" style={{fontSize: 12}}>{item.type.split('/')[0]}</Text>}
                                />
                            </List.Item>
                        )}
                    />
                ) : (
                    !logic.uploadingFile && ( // Hide "No media" message if currently uploading
                        <div style={{ textAlign: 'center', marginTop: 40 }}>
                            <Text type="secondary">No media assets added yet.</Text>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};


const PreviewArea: React.FC<{ logic: VideoEditorLogic }> = ({ logic }) => {
    const { token } = theme.useToken();
    // const { setEditorState } = useVideoEditorLogic(); //
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
            <div className="preview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <Dropdown menu={{ items: zoomOptions, onClick: logic.handleZoomMenuClick }} trigger={['click']}>
                    <Button size="small" style={{ minWidth: 70 }}>{zoomButtonText} <CaretDownOutlined /></Button>
                </Dropdown>
                <Space></Space>
                <Space>
                    <Tooltip title="Capture Snapshot"><Button size="small" icon={<CameraOutlined />} onClick={logic.handleCaptureSnapshot} disabled={!logic.canvasRef.current} /></Tooltip>
                    <Tooltip title="Toggle Guides (Placeholder)"><Button size="small" icon={<AppstoreOutlined />} disabled /></Tooltip>
                    <Tooltip title="Toggle Snapping (Placeholder)"><Button size="small" icon={<DragOutlined />} disabled /></Tooltip>
                    <Tooltip title="Fullscreen (Placeholder)"><Button size="small" icon={<FullscreenOutlined />} disabled /></Tooltip>
                </Space>
            </div>
            <div ref={logic.previewContainerRef} className="preview-container">
                <canvas
                    ref={logic.canvasRef}
                    style={{
                        display: 'block', maxWidth: '100%', maxHeight: '100%',
                        objectFit: 'contain', transformOrigin: 'center center',
                        transition: 'transform 0.1s ease-out', position: 'absolute',
                        top:'50%', left: '45%',
                        // Apply the current zoom level to the canvas transform
                        transform: `translate(-50%, -50%) scale(${logic.previewZoomLevel})`
                    }}
                />
                {/* Moveable target for selected clips, positioned via JS */}
                <div className="moveable-target-preview" style={{ pointerEvents: logic.selectedClip ? 'auto' : 'none', display: 'none', zIndex: 10 }} />

                {/* Moveable instance for manipulating preview elements */}
                <Moveable
                    ref={logic.previewMoveableRef}
                    target=".moveable-target-preview"
                    container={logic.previewContainerRef.current || undefined} // Bind to the preview container
                    draggable={true} resizable={true} rotatable={true} scalable={false} keepRatio={false}
                    throttleDrag={0} throttleResize={0} throttleRotate={0}
                    snappable={true} origin={true} edge={true}
                    // Bounds calculation needs to account for the scaled canvas within the container
                    // The bounds should constrain the *center* of the clip to the scaled canvas area.
                    // This is complex and depends on the clip's dimensions and scale.
                    // For simplicity, leaving bounds off for now or setting them to container,
                    // relying on user not to drag elements fully outside.
                    // bounds={logic.previewContainerRef.current ? { left: 0, top: 0, right: logic.previewContainerRef.current.clientWidth, bottom: logic.previewContainerRef.current.clientHeight, position: "css" } : undefined}
                    className="preview-moveable"
                    // Fix position calculation in Moveable
                    onDrag={({target, beforeTranslate}) => {
                        if (!logic.selectedClip || !logic.previewContainerRef.current || !logic.projectState.canvasDimensions) return;

                        // The target's style.transform is already set by the useEffect to position it.
                        // beforeTranslate is the delta from this *initial* position.
                        // To keep the element visually smooth, we apply the delta directly.
                        // We need to preserve the rotation part of the transform.
                        const currentTransform = target.style.transform || '';
                        const rotationMatch = currentTransform.match(/rotate\([^)]+\)/);
                        const currentRotation = rotationMatch ? rotationMatch[0] : 'rotate(0deg)';

                        // Apply the delta translate provided by Moveable and keep the rotation
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

const TimelineControls: React.FC<{ logic: VideoEditorLogic, screens: any }> = ({ logic, screens }) => {
    const { token } = theme.useToken();
    return (
        <div className="timeline-controls" style={{ display: 'flex', alignItems: 'center', gap: screens.xs ? '4px' : '10px' }}>
            <Space>
                <Button shape="circle" icon={logic.projectState.isPlaying ? <PauseOutlined /> : <PlayCircleOutlined />} onClick={logic.handlePlayPause} />
                <Tooltip title={logic.projectState.isPreviewMuted ? "Unmute" : "Mute"}><Button shape="circle" icon={logic.projectState.isPreviewMuted ? <AudioMutedOutlined /> : <AudioOutlined />} onClick={logic.toggleMutePreview} /></Tooltip>
            </Space>
            <Text className="timeline-timecode">{formatTime(logic.currentTime)}</Text>
            <Text className="timeline-duration">/ {formatTime(logic.projectState.totalDuration)}</Text>
            <Select value={logic.projectState.playbackRate} onChange={logic.handlePlaybackRateChange} size="small" style={{ width: 65 }} options={logic.PLAYBACK_RATES.map(r => ({ value: r, label: `${r}x` }))} />
            <Button size="small" icon={<SplitCellsOutlined />} disabled>Split</Button>
            <Button size="small" icon={<UndoOutlined />} disabled>Undo</Button>
            <Button size="small" icon={<RedoOutlined />} disabled>Redo</Button>
            <div style={{ flexGrow: 1 }} />
            <Space align="center">
                <Switch size="small" checked={false} disabled style={{marginRight: 4}} />
                <Text style={{fontSize: '12px', color: token.colorTextSecondary}}>Fit to Screen</Text>
                <Tooltip title="Zoom Out"><Button size="small" icon={<ZoomOutOutlined />} onClick={() => logic.setTimelineZoom(z => Math.max(10, z / 1.5))} /></Tooltip>
                {/* The slider value maps a linear range (0-6) to an exponential zoom (10*2^v), allowing finer control at lower zooms */}
                <Slider value={Math.log2(logic.timelineZoom / 10)} onChange={v => logic.setTimelineZoom(10 * Math.pow(2, v))} min={0} max={6} step={0.1} style={{ width: 80 }} tooltip={{ open: false }} />
                <Tooltip title="Zoom In"><Button size="small" icon={<ZoomInOutlined />} onClick={() => logic.setTimelineZoom(z => Math.min(1000, z * 1.5))} /></Tooltip>
            </Space>
        </div>
    );
};

const TimelineTracks: React.FC<{ logic: VideoEditorLogic }> = ({ logic }) => {
    const { token } = theme.useToken();
    const pxPerSec = Math.max(20, logic.timelineZoom);
    const totalTimelineWidth = Math.max(
        (logic.timelineContainerRef.current?.clientWidth || 500),
        (logic.projectState.totalDuration + 5) * pxPerSec // Add some padding at the end
    );

    // Ruler logic remains similar
    let secondsPerMajorMarker: number; let secondsPerMinorMarker: number;
    if (pxPerSec < 25) { secondsPerMajorMarker = 10; secondsPerMinorMarker = 2; }
    else if (pxPerSec < 60) { secondsPerMajorMarker = 5; secondsPerMinorMarker = 1; }
    else if (pxPerSec < 120) { secondsPerMajorMarker = 2; secondsPerMinorMarker = 0.5; }
    else if (pxPerSec < 300) { secondsPerMajorMarker = 1; secondsPerMinorMarker = 0.2; }
    else { secondsPerMajorMarker = 0.5; secondsPerMinorMarker = 0.1; }
    // Calculate number of minor markers needed based on total width
    const numMinorMarkers = Math.ceil(totalTimelineWidth / (secondsPerMinorMarker * pxPerSec));


    const activeSubtitleInTimeline = logic.projectState.subtitles.find(sub =>
        logic.currentTime >= sub.startTime && logic.currentTime < sub.endTime
    );

    const subtitleTrackHeight = logic.projectState.subtitles.length > 0 ? 35 : 0; // Only show subtitle track if subtitles exist

    return (
        <div ref={logic.timelineContainerRef} className="timeline-scroll-container">
            <div
                className="timeline-content-width"
                style={{ width: `${totalTimelineWidth}px`, paddingTop: `${28 + subtitleTrackHeight}px` }} // Add padding for ruler + subtitle track
                onClick={(e) => { if (e.target === e.currentTarget) logic.handleSelectClip(null); }} // Deselect clip on timeline empty space click
            >
                {/* Ruler */}
                <div className="ruler-container" style={{ top: `${subtitleTrackHeight}px`, height: '28px' }}> {/* Position ruler below subtitle track */}
                    {Array.from({ length: numMinorMarkers }).map((_, i) => {
                        const time = i * secondsPerMinorMarker;
                        // Limit markers drawn to visible area + some buffer
                        if (time > logic.projectState.totalDuration + secondsPerMajorMarker * 5 && time > (logic.currentTime / 0.8) + secondsPerMajorMarker * 5) return null; // Buffer based on duration and current time
                        const leftPos = time * pxPerSec;
                        const isMajor = Math.abs(time % secondsPerMajorMarker) < 0.001 || time === 0;
                        const markerHeight = isMajor ? '60%' : '30%';
                        return (
                            <React.Fragment key={`m-${time.toFixed(3)}`}>
                                <div className={`ruler-marker ${isMajor ? 'major' : ''}`} style={{ left: `${leftPos}px`, height: markerHeight }}/>
                                {/* Show time label only for major markers */}
                                {isMajor && <span className="ruler-label" style={{ left: `${leftPos}px` }}>{formatTime(time).split('.')[0]}</span>}
                            </React.Fragment>
                        );
                    })}
                    {/* Playhead */}
                    <div className="playhead-line" style={{ left: `${logic.currentTime * pxPerSec}px`, top: '0px', bottom: `-${(logic.projectState.tracks.length * 60)}px` }}> {/* Extend playhead line */}
                        <div className="playhead-handle" />
                    </div>
                    {/* Invisible Slider for Seeking */}
                    <Slider
                        className="timeline-seek-slider"
                        value={logic.currentTime}
                        max={logic.projectState.totalDuration || 1} // Ensure max is at least 1 to avoid issues with empty timeline
                        min={0} step={0.001} // Increased precision for smoother seeking
                        onChange={(v) => logic.handleTimelineSeek(v ?? 0)}
                        tooltip={{ open: false }}
                        // The default Ant Design Slider track fills based on `value` prop.
                        // We make the rail transparent and rely on the default track styling.
                        railStyle={{ background: 'transparent' }}
                        style={{ position: 'absolute', top: '0px', left: 0, right: 0, margin: 0, padding: 0, height: '28px', zIndex: 28 }} // Match ruler height
                    />
                </div>

                {/* Subtitle Track Area */}
                {subtitleTrackHeight > 0 && (
                    <div className="timeline-subtitle-track-area" style={{ height: `${subtitleTrackHeight}px`, top: '0px' }}>
                        <div className="timeline-track-header">
                            <TranslationOutlined style={{ marginRight: 4 }} /><Text>Subtitles</Text>
                        </div>
                        <div className="timeline-track-clips-area" >
                            {/* Subtitle Blocks */}
                            {logic.projectState.subtitles.map(subtitle => {
                                const subWidthPx = (subtitle.endTime - subtitle.startTime) * pxPerSec;
                                const subLeftPx = subtitle.startTime * pxPerSec;
                                const isCurrent = activeSubtitleInTimeline?.id === subtitle.id;
                                return (
                                    <div
                                        key={subtitle.id}
                                        className={`timeline-subtitle ${isCurrent ? 'active' : ''}`}
                                        style={{
                                            left: `${subLeftPx}px`,
                                            width: `${Math.max(5, subWidthPx)}px`, // Ensure minimum width
                                            zIndex: isCurrent ? 25 : 20,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 4px',
                                            lineHeight: '30px', // Center text vertically in the track height
                                            color: 'white', fontSize: '10px',
                                            display: 'flex', alignItems: 'center',
                                            fontFamily: logic.projectState.subtitleFontFamily // Apply font from state
                                        }}
                                        onClick={(e) => { e.stopPropagation(); logic.handleTimelineSeek(subtitle.startTime); }} // Seek to subtitle start on click
                                        title={subtitle.text} // Show full text on hover
                                    >
                                        <Text ellipsis style={{ color: 'white', fontSize: '10px' }}>{subtitle.text}</Text>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Media/Text Tracks Area */}
                <div style={{ paddingTop: 0 }}> {/* This div ensures tracks start immediately below the ruler/subtitle track */}
                    {logic.projectState.tracks.map((track, trackIndex) => (
                        <div key={track.id} className="timeline-track">
                            <div className="timeline-track-header">
                                <Text>{trackIndex + 1}</Text>
                                <Tooltip title="Mute Track (Placeholder)"><Button type="text" size="small" shape="circle" icon={<EyeOutlined />} disabled /></Tooltip>
                                <Tooltip title="Lock Track (Placeholder)"><Button type="text" size="small" shape="circle" icon={<LockOutlined />} disabled /></Tooltip>
                            </div>
                            <div
                                className="timeline-track-clips-area"
                                onClick={(e) => { if (e.target === e.currentTarget) logic.handleSelectClip(null); }} // Deselect clip on track empty space click
                            >
                                {/* Clips within the track */}
                                {track.clips.filter(clip => {
                                    // Only include text clips that are NOT associated with subtitles here
                                    // Subtitle text clips are now handled in the dedicated subtitle track area
                                    return !(clip.type === 'text' && logic.projectState.subtitles.find(sub => sub.id === clip.id));
                                }).map(clip => {
                                    const clipWidthPx = clip.duration * pxPerSec;
                                    const clipLeftPx = clip.startTime * pxPerSec;
                                    const isSelected = clip.id === logic.projectState.selectedClipId;
                                    const displayWidth = Math.max(2, clipWidthPx); // Ensure minimum display width
                                    return (
                                        <div
                                            key={clip.id}
                                            id={`clip-${clip.id}`}
                                            className={`timeline-clip ${isSelected ? 'selected' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); logic.handleSelectClip(clip.id); }} // Select clip on click
                                            style={{ left: `${clipLeftPx}px`, width: `${displayWidth}px` }}
                                        >
                                            <div className="clip-thumbnail-container">
                                                {/* Render thumbnails or placeholder */}
                                                {clip.thumbnailUrls && clip.thumbnailUrls.length > 0 && clip.type !== 'text' && (() => {
                                                    // Logic to draw multiple thumbnails based on duration and pxPerSec
                                                    const segments: React.ReactNode[] = [];
                                                    const segmentDuration = logic.THUMBNAIL_INTERVAL;
                                                    const segmentWidthPx = segmentDuration * pxPerSec;
                                                    let currentLeft = 0;
                                                    const sortedThumbs = [...clip.thumbnailUrls].sort((a, b) => a.time - b.time);

                                                    for (let i = 0; currentLeft < displayWidth; ++i) {
                                                        // Calculate time within the original clip for this segment
                                                        const timeInOriginalClip = clip.startTime + (currentLeft / pxPerSec); // This is not quite right - should be time relative to clip start
                                                        const timeInClip = i * segmentDuration; // Time relative to the start of the *clip* source
                                                        const segmentStartTime = clip.startTime + timeInClip;

                                                        let bestThumb = sortedThumbs[0]; // Default to first thumb
                                                        // Find the thumbnail closest to (but not exceeding) the segment's start time
                                                        for(let j = sortedThumbs.length - 1; j >= 0; j--) {
                                                            // Allow a small epsilon for float comparisons
                                                            if(sortedThumbs[j].time <= segmentStartTime + 0.01) {
                                                                bestThumb = sortedThumbs[j];
                                                                break; // Found the best thumb for this segment
                                                            }
                                                        }

                                                        const widthForThisSegment = Math.min(segmentWidthPx, displayWidth - currentLeft);
                                                        if (widthForThisSegment <= 0) break;

                                                        segments.push(
                                                            <div
                                                                key={`${clip.id}-thumb-${i}`}
                                                                className="clip-thumbnail-segment"
                                                                style={{
                                                                    left: `${currentLeft}px`,
                                                                    width: `${widthForThisSegment}px`,
                                                                    backgroundImage: bestThumb ? `url(${bestThumb.url})` : 'none',
                                                                    backgroundSize: 'cover',
                                                                    backgroundPosition: 'center',
                                                                    // Optional: Add background color if no image to make segments visible
                                                                    backgroundColor: '#333',
                                                                }}
                                                            />
                                                        );
                                                        currentLeft += segmentWidthPx;
                                                    }
                                                    return segments;
                                                })()}
                                                {/* Placeholder for videos without thumbnails */}
                                                {(clip.type === 'video') && !clip.thumbnailUrls?.length && (
                                                    <div style={{width: '100%', height: '100%', background: 'repeating-linear-gradient( 45deg, #444, #444 2px, #3a3a3a 2px, #3a3a3a 4px)', opacity: 0.3}} title="Waveform Placeholder"></div>
                                                )}
                                                {/* Text clip content preview */}
                                                {clip.type === 'text' && (
                                                    <div className="clip-text-content">
                                                        <Text ellipsis style={{ color: 'white', fontSize: '10px' }}>{clip.source as string}</Text>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="clip-info-overlay">
                                                {clip.type === 'video' && <VideoCameraOutlined />}
                                                {clip.type === 'image' && <FileImageOutlined />}
                                                {clip.type === 'text' && <FontSizeOutlined />}
                                                <Text ellipsis style={{ flexGrow: 1 }}>{clip.name || `${clip.type}`}</Text>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    {/* Add Track Button (Placeholder) */}
                    <div style={{ padding: '5px 5px 5px 55px' }}>
                        <Button size="small" icon={<PlusOutlined />} disabled block type="dashed">Add Track</Button>
                    </div>
                </div>

                {/* Moveable for Timeline Clips */}
                <Moveable
                    ref={logic.moveableRef}
                    target={logic.projectState.selectedClipId ? `#clip-${logic.projectState.selectedClipId}` : null}
                    container={logic.timelineContainerRef.current || undefined}
                    origin={false} edge={false}
                    draggable={true} throttleDrag={0}
                    // dragTarget allows dragging the clip itself, not just the moveable handles
                    dragTarget={logic.projectState.selectedClipId ? `#clip-${logic.projectState.selectedClipId}` : undefined}
                    resizable={true} renderDirections={["w", "e"]} keepRatio={false} throttleResize={0}
                    snappable={true} snapDirections={{ left: true, right: true }} elementSnapDirections={{ left: true, right: true }} snapThreshold={5}
                    className="timeline-moveable"
                    // onDrag handles the visual movement during drag
                    onDrag={({ target, beforeTranslate }) => {
                        // Prevent drag for subtitle-associated text clips on the timeline
                        const clipId = logic.projectState.selectedClipId;
                        const clip = logic.projectState.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
                        const isSubtitleClip = clip?.type === 'text' && logic.projectState.subtitles.some(sub => sub.id === clipId);
                        if (!clipId || isSubtitleClip) return;

                        // Moveable's `beforeTranslate` provides the delta relative to the element's starting position for the drag.
                        // We apply this delta as a `translateX` transform to the target element.
                        // We also need to preserve any vertical transform that might be applied by the track layout (though not currently used).
                        const currentTransform = target.style.transform || '';
                        const translateYMatch = currentTransform.match(/translateY\([^)]+\)/);
                        const translateY = translateYMatch ? translateYMatch[0] : ''; // Keep existing Y transform

                        // Apply the horizontal delta provided by Moveable
                        target.style.transform = `translateX(${beforeTranslate[0]}px) ${translateY}`;
                    }}
                    // onDragEnd commits the position change to state
                    onDragEnd={logic.onTimelineDragEnd}
                    // onResize handles the visual resizing during drag
                    onResize={({ target, width, drag, direction }) => {
                        // Allow resizing only for non-subtitle text clips
                        const clipId = logic.projectState.selectedClipId; // Use selectedClipId to find the clip
                        const clip = logic.projectState.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
                        const isSubtitleClip = clip?.type === 'text' && logic.projectState.subtitles.some(sub => sub.id === clipId);

                        if (!clipId || isSubtitleClip) { console.warn("Attempted to resize a subtitle clip."); return; }

                        // Apply the new width visually
                        target.style.width = `${Math.max(1, width)}px`;

                        // If resizing from the left ('w'), the element also needs to shift horizontally.
                        // Moveable provides this shift in `drag.beforeTranslate`.
                        const currentTransform = target.style.transform || '';
                        const translateYMatch = currentTransform.match(/translateY\([^)]+\)/);
                        const translateY = translateYMatch ? translateYMatch[0] : '';

                        if (direction[0] === -1) { // Resizing from the left ('w')
                            // Apply the horizontal translation provided by Moveable's drag component
                            target.style.transform = `translateX(${drag.beforeTranslate[0]}px) ${translateY}`;
                        } else { // Resizing from the right ('e') or no horizontal resize
                            // Ensure no unexpected horizontal translate is applied for right resize
                            target.style.transform = `${translateY}`; // Reset translateX, keep translateY
                        }
                    }}
                    // onResizeEnd commits the size and position change to state
                    onResizeEnd={logic.onTimelineResizeEnd}
                />
            </div>
        </div>
    );
};


const InitialScreen: React.FC<{ logic: VideoEditorLogic }> = ({ logic }) => {
    const { token } = theme.useToken();

    // Dragger props specific for the initial screen, allowing all accepted types (media + subtitles)
    const initialDraggerProps: UploadProps = {
        name: 'file', multiple: true, showUploadList: false, accept: "video/*,image/*,.srt,.vtt",
        customRequest: (options: any) => {
            const { file, onSuccess } = options;
            const isSubtitle = file.type === 'application/x-subrip' || file.type === 'text/vtt' || file.name.toLowerCase().endsWith('.srt') || file.name.toLowerCase().endsWith('.vtt');

            if (isSubtitle) {
                logic.handleUploadSrt(file as File);
                // Signal done immediately for subtitle upload simulation
                if (onSuccess) onSuccess({ status: 'done' }, file);
            } else {
                // For media files, we need to simulate/handle the upload process
                // The handleManualMediaUpload function is designed for the *manual* upload flow (button click).
                // We need to adapt it or call its core logic here for Dragger.
                // Let's create a temporary file input event-like object for handleManualMediaUpload.
                const tempEvent = {target: {files: [file], value: ''}} as unknown as React.ChangeEvent<HTMLInputElement>;
                logic.handleManualMediaUpload(tempEvent); // Trigger the media upload flow
                // Signal done immediately to the Dragger component, the state update is handled by the hook
                if (onSuccess) onSuccess({ status: 'done' }, file);
            }
        },
        beforeUpload: (file: File) => {
            const isVideo = file.type.startsWith('video/');
            const isImage = file.type.startsWith('image/');
            const isSubtitle = file.type === 'application/x-subrip' || file.type === 'text/vtt' || file.name.toLowerCase().endsWith('.srt') || file.name.toLowerCase().endsWith('.vtt');

            if (!isVideo && !isImage && !isSubtitle) {
                message.error(`${file.name} is not a supported file type.`);
                return Upload.LIST_IGNORE; // Ignore unsupported types
            }

            // Set editor state to uploading immediately
            logic.setProjectState(prev => ({
                ...prev,
                uploadProgress: 0,
                uploadingFile: file.name,
                currentUploadTaskId: `initial-upload-${Date.now()}`,
            }));
            logic.setEditorState('uploading');

            return true; // Allow the file to be passed to customRequest
        },
        onChange(info) {
            // Upload state updates handled within customRequest and the handlers it calls.
            // This onChange can be used for general feedback or logging if needed.
            if (info.file.status === 'done' || info.file.status === 'error' || info.file.status === 'removed') {
                // Clear upload state might be redundant if handled in specific handlers,
                // but could act as a fallback. Let's rely on the specific handlers for now.
            }
        },
        onDrop: (e) => {
            // The beforeUpload and customRequest chain handles dropped files.
            console.log('File(s) dropped on initial screen.');
        },
    };


    return (
        <Content className="initial-screen-content" style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', flexGrow: 1 }}>
            <Card className="initial-screen-card">
                <Title level={4} style={{ marginBottom: 24, textAlign: 'center' }}>Start a new project</Title>
                <Dragger {...initialDraggerProps} className="initial-screen-dragger">
                    {/* Show upload progress UI if uploadingFile is set in projectState */}
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
                            <p className="ant-upload-hint">Video or Image files, or Subtitles (.srt, .vtt)</p>
                        </>
                    )}
                </Dragger>
            </Card>
        </Content>
    );
}


// --- Main Video Editor Component ---
const VideoEditor: React.FC<{ projectId: string }> = ({ projectId }) => {

    const logic: VideoEditorLogic = useVideoEditorLogic(projectId);

    const screens = useBreakpoint();
    const { token } = theme.useToken();
    const iconSiderWidth = 60;
    const contextualPanelWidth = 350;
    // const propertiesPanelWidth = 350; // This is fine as a local variable if used for styling
    const [isExportModalVisible, setIsExportModalVisible] = useState(false);
    const [selectedImageType, setSelectedImageType] = useState<'default' | 'webp'>('default'); // 'default' (jpeg/png), 'webp'
    const [selectedGifType, setSelectedGifType] = useState<'gif' | 'webp'>('gif');         // 'gif', 'webp' (cho ảnh động)
    const [isExporting, setIsExporting] = useState(false); // Thêm state cho trạng thái exporting
    const [exportProgress, setExportProgress] = useState(0); // Thêm state cho tiến trình export
    const [removeColorOnExport, setRemoveColorOnExport] = useState(false);

    const srtUploadButtonProps: UploadProps = {
        name: 'file', multiple: false, accept: '.srt,.vtt', showUploadList: false,
        beforeUpload: (file) => { logic.handleUploadSrt(file); return false; }, // Use beforeUpload to trigger handler directly
    };

    const activeSubtitleInList = logic.projectState.subtitles.find(sub =>
        logic.currentTime >= sub.startTime && logic.currentTime < sub.endTime
    );
    const showExportModal = () => setIsExportModalVisible(true);
    const handleExportModalCancel = () => setIsExportModalVisible(false);
    const handleExportModalOk = async () => {
        if (!logic.ffmpegLoaded || !logic.ffmpegRef.current) {
            message.error("FFmpeg is not loaded. Cannot process export.");
            if (!logic.ffmpegLoaded) logic.loadFFmpeg(); // Thử load nếu chưa load
            return;
        }
        if (isExporting) {
            message.warning("Export is already in progress.");
            return;
        }

        const firstVideoAsset = logic.projectState.mediaAssets.find(
            asset => asset.type.startsWith('video/') && asset.secureUrl
        );

        if (!firstVideoAsset?.secureUrl) {
            message.error('No video asset with a secure URL found to export.');
            setIsExportModalVisible(false);
            return;
        }

        setIsExporting(true);
        setExportProgress(0);
        message.info("Starting export process...");

        const ffmpeg = logic.ffmpegRef.current;
        const inputVideoName = `input_${Date.now()}.${firstVideoAsset.secureUrl.split('.').pop() || 'mp4'}`;
        const outputBaseName = logic.projectState.projectName.replace(/\s+/g, '_') || `export_${Date.now()}`;

        // Lưu trữ callback để có thể gỡ bỏ
        const progressCallback = ({ progress }: { progress: number; time?: number }) => {
            setExportProgress(Math.round(progress * 100));
        };

        try {
            // 1. Fetch video and write to FFmpeg virtual FS
            message.info(`Fetching video: ${firstVideoAsset.name}`);
            await ffmpeg.writeFile(inputVideoName, await fetchFile(firstVideoAsset.secureUrl));
            message.info("Video loaded into FFmpeg.");

            ffmpeg.on('progress', progressCallback);

            // --- Xử lý chính: CHỈ XUẤT VIDEO ---
            const outputVideoName = `${outputBaseName}_video.mp4`;
            const videoExportArgs: string[] = ['-i', inputVideoName]; // Declare only once

            if (removeColorOnExport) {
                message.info("Applying desaturation filter to video. This will re-encode the video.");
                videoExportArgs.push(
                    '-vf', 'hue=s=0',        // Desaturation filter
                    '-c:v', 'libx264',       // Re-encode with H.264 for video
                    '-preset', 'medium',     // Encoding speed/quality trade-off
                    '-crf', '23',            // Constant Rate Factor for video quality
                    '-c:a', 'aac',           // Re-encode audio with AAC (common for MP4)
                    '-b:a', '128k'           // Audio bitrate for AAC
                );
            } else {
                // Original logic: attempt to copy codecs if no filter is applied
                videoExportArgs.push(
                    '-c', 'copy'             // Try to copy both video and audio codecs
                );
            }
            // Add movflags and output name, common to both branches
            videoExportArgs.push('-movflags', '+faststart', outputVideoName);


            message.info(`Processing video: ${outputVideoName}`);
            await ffmpeg.exec(videoExportArgs);
            message.success("Video processing complete.");

            const videoData = await ffmpeg.readFile(outputVideoName);
            const videoBlob = new Blob([videoData], { type: 'video/mp4' });
            const videoDownloadUrl = URL.createObjectURL(videoBlob);
            const videoLink = document.createElement('a');
            videoLink.href = videoDownloadUrl;
            videoLink.download = outputVideoName;
            document.body.appendChild(videoLink);
            videoLink.click();
            document.body.removeChild(videoLink);
            URL.revokeObjectURL(videoDownloadUrl);
            message.success(`Video "${outputVideoName}" downloaded.`);
            await ffmpeg.deleteFile(outputVideoName);


            // --- Xử lý xuất ảnh tĩnh (Snapshot) ---
            const snapshotTime = '00:00:01'; // Xuất khung hình ở giây thứ 1
            let imageOutputName = '';
            let imageMimeType = '';
            const imageExportArgs: string[] = [
                '-i', inputVideoName,
                '-ss', snapshotTime, // Thời điểm lấy snapshot
                '-frames:v', '1',    // Chỉ lấy 1 khung hình
            ];

            if (selectedImageType === 'webp') {
                imageOutputName = `${outputBaseName}_snapshot.webp`;
                imageMimeType = 'image/webp';
                imageExportArgs.push('-c:v', 'libwebp', '-lossless', '0', '-q:v', '75', imageOutputName); // -lossless 0 (lossy), -q:v 75 (quality)
            } else { // default là JPEG
                imageOutputName = `${outputBaseName}_snapshot.jpg`;
                imageMimeType = 'image/jpeg';
                imageExportArgs.push('-c:v', 'mjpeg', '-q:v', '4', imageOutputName); // -q:v 4 (chất lượng JPEG)
            }

            if (imageOutputName) {
                message.info(`Processing snapshot: ${imageOutputName}`);
                await ffmpeg.exec(imageExportArgs);
                message.success("Snapshot processing complete.");
                const imageData = await ffmpeg.readFile(imageOutputName);
                const imageBlob = new Blob([imageData], { type: imageMimeType });
                const imageDownloadUrl = URL.createObjectURL(imageBlob);
                const imageLink = document.createElement('a');
                imageLink.href = imageDownloadUrl;
                imageLink.download = imageOutputName;
                document.body.appendChild(imageLink);
                imageLink.click();
                document.body.removeChild(imageLink);
                URL.revokeObjectURL(imageDownloadUrl);
                message.success(`Snapshot "${imageOutputName}" downloaded.`);
                await ffmpeg.deleteFile(imageOutputName);
            }

            // --- Xử lý xuất GIF/WEBP động (Ví dụ: 5 giây đầu tiên) ---
            let animOutputName = '';
            let animMimeType = '';
            const animDuration = '5'; // Lấy 5 giây
            const animExportArgsBase: string[] = [ // Renamed to avoid conflict if we were to make it conditional
                '-i', inputVideoName,
                '-t', animDuration, // Thời lượng của ảnh động
                '-vf', 'fps=15,scale=320:-1:flags=lanczos', // Giảm fps và kích thước để file nhỏ hơn
            ];
            let finalAnimExportArgs = [...animExportArgsBase];


            if (selectedGifType === 'webp') {
                animOutputName = `${outputBaseName}_animation.webp`;
                animMimeType = 'image/webp';
                finalAnimExportArgs.push('-c:v', 'libwebp', '-loop', '0', '-lossless', '0', '-q:v', '70', '-preset', 'picture', animOutputName);
            } else { // 'gif'
                animOutputName = `${outputBaseName}_animation.gif`;
                animMimeType = 'image/gif';
                const paletteName = 'palette.png';
                await ffmpeg.exec([
                    '-i', inputVideoName, '-t', animDuration,
                    '-vf', `fps=15,scale=320:-1:flags=lanczos,palettegen`,
                    '-y', paletteName
                ]);
                finalAnimExportArgs.push('-i', paletteName, '-lavfi', 'fps=15,scale=320:-1:flags=lanczos [x]; [x][1:v] paletteuse', animOutputName);
            }

            if (animOutputName) {
                message.info(`Processing animation: ${animOutputName}`);
                await ffmpeg.exec(finalAnimExportArgs);
                message.success("Animation processing complete.");
                const animData = await ffmpeg.readFile(animOutputName);
                const animBlob = new Blob([animData], { type: animMimeType });
                const animDownloadUrl = URL.createObjectURL(animBlob);
                const animLink = document.createElement('a');
                animLink.href = animDownloadUrl;
                animLink.download = animOutputName;
                document.body.appendChild(animLink);
                animLink.click();
                document.body.removeChild(animLink);
                URL.revokeObjectURL(animDownloadUrl);
                message.success(`Animation "${animOutputName}" downloaded.`);
                await ffmpeg.deleteFile(animOutputName);
                if (selectedGifType === 'gif') await ffmpeg.deleteFile('palette.png');
            }


            // Cleanup input file
            await ffmpeg.deleteFile(inputVideoName);

        } catch (error) {
            console.error("Error during FFmpeg export:", error);
            message.error(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            ffmpeg.off('progress', progressCallback); // Gỡ bỏ listener
            setIsExporting(false);
            setExportProgress(0);
            setIsExportModalVisible(false); // Đóng modal sau khi hoàn tất hoặc lỗi
        }
    };

    return (
        <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#7B61FF', motion: false } }}>
            <Layout className="video-editor-layout" style={{ minHeight: '100vh', overflow: 'hidden' }}>

                {/* Left Icon Sider */}
                {!screens.xs && (
                    <Sider collapsed={true} width={iconSiderWidth} collapsedWidth={iconSiderWidth} theme="dark" className="icon-sider" style={{ zIndex: 3, height: '100vh' }}>
                        <div style={{height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8}}> {/* Adjusted height to match header */}
                            <Button type="text" icon={<LeftOutlined />} style={{color: token.colorTextSecondary}} disabled />
                        </div>
                        <MainMenu selectedKey={logic.selectedMenuKey} onClick={logic.handleMenuClick} mode="inline" />
                        <div style={{ position: 'absolute', bottom: 16, width: '100%', textAlign: 'center' }}>
                            <Tooltip placement="right" title="Settings (Placeholder)"><Button type="text" shape="circle" icon={<SettingOutlined />} disabled style={{color: token.colorTextSecondary}} /></Tooltip>
                        </div>
                    </Sider>
                )}

                {/* Contextual Panel Sider */}
                {(logic.selectedMenuKey !== 'settings_footer' && !screens.xs) && (
                    <Sider width={contextualPanelWidth} theme="dark" className="contextual-sider" style={{ height: '100vh', overflow: 'hidden', zIndex: 2 }}>
                        <div className="contextual-panel-content-area">
                            {logic.selectedMenuKey === 'media' && (
                                <MediaPanelContent // Use the integrated content component
                                    logic={logic}
                                    screens={screens}
                                />
                            )}
                            {logic.selectedMenuKey === 'text' && (
                                <TextPanel onAddTextClip={logic.handleAddTextClip} />
                            )}
                            {logic.selectedMenuKey === 'subtitles' && (
                                <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <TranscriptionProgressIndicator
                                        progress={logic.transcriptionProgress}
                                        fileName={logic.transcribingFileName}
                                        themeToken={token} // token từ theme.useToken()
                                        isTranscribingActive={logic.isTranscribing}
                                    />
                                    {logic.projectState.subtitles && logic.projectState.subtitles.length > 0 && !logic.isTranscribing ? (
                                        <>
                                            <div style={{marginBottom: 12, display: 'flex', flexDirection: 'column'}}>
                                                <Title level={5} style={{ margin: '0 0 8px 0' }}>Subtitles</Title>
                                                {/* Subtitle Settings */}
                                                <div style={{ marginBottom: 16, padding: '8px 0', borderTop: `1px solid ${token.colorBorderSecondary}`, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                                                    {/* Font Family Control */}
                                                    <div style={{ marginBottom: 12 }}>
                                                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Font Family</Text>
                                                        <Select
                                                            value={logic.projectState.subtitleFontFamily}
                                                            onChange={logic.updateSubtitleFontFamily}
                                                            style={{ width: '100%' }}
                                                            size="small"
                                                            options={[
                                                                { value: 'Arial, sans-serif', label: 'Arial' },
                                                                { value: 'Verdana, sans-serif', label: 'Verdana' },
                                                                { value: 'Tahoma, sans-serif', label: 'Tahoma' },
                                                                { value: 'Georgia, serif', label: 'Georgia' },
                                                                { value: 'Times New Roman, serif', label: 'Times New Roman' },
                                                                { value: 'Courier New, monospace', label: 'Courier New' },
                                                                { value: 'Lucida Sans Unicode, Lucida Grande, sans-serif', label: 'Lucida Sans' }
                                                            ]}
                                                        />
                                                    </div>
                                                    {/* Font Size Control */}
                                                    <div>
                                                        <Space size="small" style={{ width: '100%', justifyContent: 'space-between', marginBottom: 4 }}>
                                                            <Text type="secondary" style={{ fontSize: 12 }}>Font Size</Text>
                                                            <Text strong style={{ fontSize: 12 }}>{logic.projectState.subtitleFontSize}</Text>
                                                        </Space>
                                                        <Slider
                                                            min={10} max={100} step={1}
                                                            value={logic.projectState.subtitleFontSize}
                                                            onChange={logic.updateSubtitleFontSize}
                                                            tooltip={{ open: false }}
                                                            style={{ margin: '0px 0 8px 0', padding: 0 }}
                                                        />
                                                    </div>
                                                    {/* Placeholder settings */}
                                                    <Space size="small" style={{fontSize: '12px', alignItems: 'center'}}>

                                                    </Space>
                                                </div>
                                                {/* End Subtitle Settings */}
                                            </div>
                                            <div style={{ flexGrow: 1, overflowY: 'auto' }}> {/* Scrollable container for the list */}
                                                <List itemLayout="vertical" dataSource={logic.projectState.subtitles}
                                                      renderItem={(item: SubtitleEntry) => (
                                                          <List.Item key={item.id} className={`subtitle-list-item ${activeSubtitleInList?.id === item.id ? 'active' : ''}`}
                                                                     onClick={() => logic.handleTimelineSeek(item.startTime)} style={{ cursor: 'pointer' }}>
                                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: token.colorTextSecondary, marginBottom: 4 }}>
                                                                  <span>{formatTime(item.startTime).slice(0, -1)}</span>
                                                                  <span>{formatTime(item.endTime).slice(0, -1)}</span>
                                                              </div>
                                                              {/* Apply current font family to the list item text */}
                                                              <div style={{fontSize: '14px', color: token.colorText, whiteSpace: 'pre-wrap', fontFamily: logic.projectState.subtitleFontFamily }}>{item.text}</div>
                                                          </List.Item>
                                                      )}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        !logic.isTranscribing && (!logic.projectState.subtitles || logic.projectState.subtitles.length === 0) && (

                                        <>
                                            <Title level={5} style={{ margin: '0 0 16px 0' }}>Add Subtitles</Title>
                                            <Upload {...srtUploadButtonProps}> {/* Use srt specific props */}
                                                <Card hoverable style={{ marginBottom: 16, cursor: 'pointer' }}>
                                                    <div style={{ textAlign: 'center', padding: '8px 0' }}> <InboxOutlined style={{ fontSize: 30, color: token.colorPrimary }} /><Title level={5} style={{ margin: '8px 0 4px 0' }}>Upload SRT / VTT</Title><Text type="secondary" style={{ fontSize: 12 }}>Use a subtitle file</Text> </div>
                                                </Card>
                                            </Upload>
                                            <div // Wrapper cho Card "Start from scratch"
                                                onClick={() => {
                                                    if (!logic.isTranscribing) { // Chỉ cho phép click khi không đang transcribing
                                                        logic.handleStartFromScratch(); // Gọi hàm xử lý từ hook
                                                    }
                                                }}
                                                style={{ // Style để vô hiệu hóa click và làm mờ
                                                    cursor: logic.isTranscribing ? 'not-allowed' : 'pointer',
                                                    opacity: logic.isTranscribing ? 0.5 : 1,
                                                }}
                                            >
                                            <Card hoverable={!logic.isTranscribing} style={{ cursor: 'pointer' }} onClick={logic.handleStartFromScratch}>
                                                <div style={{ textAlign: 'center', padding: '8px 0' }}> <PlusOutlined style={{ fontSize: 30, color: token.colorPrimary }} /><Title level={5} style={{ margin: '8px 0 4px 0' }}>Start from scratch</Title><Text type="secondary" style={{ fontSize: 12 }}>Type out your subtitles</Text> </div>
                                            </Card>
                                            </div>
                                        </>
                                        )
                                    )}
                                </div>
                            )}
                            {!(logic.selectedMenuKey === 'media' || logic.selectedMenuKey === 'text' || logic.selectedMenuKey === 'subtitles') && (
                                <div style={{ padding: 16, textAlign: 'center' }}><Text type="secondary">Select a tool</Text></div>
                            )}
                        </div>
                    </Sider>
                )}

                {/* Main Content Area (Header, Preview, Properties) + Timeline Footer */}
                <Layout style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: 180 }}> {/* Use fixed timelineHeight here */}
                    {/* Header */}
                    <Header style={{ padding: '0 16px 0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1, flexShrink: 0 }}>
                        <Space size="middle">
                            {screens.xs && <Button type="text" icon={<MenuOutlined />} onClick={logic.showMobileDrawer} style={{ color: token.colorText }} />}
                            {!screens.xs && (
                                <Space align="center">
                                    <Input variant='borderless' value={logic.projectState.projectName} onChange={e => logic.setProjectState(p => ({ ...p, projectName: e.target.value }))} style={{ fontWeight: 500, color: token.colorText, width: '150px', fontSize: '14px' }} />
                                    {/* Add Select for Canvas Size */}
                                    <Select
                                        size="small"
                                        value={`${logic.projectState.canvasDimensions.width}x${logic.projectState.canvasDimensions.height}`}
                                        onChange={(value) => {
                                            const [widthStr, heightStr] = value.split('x');
                                            const width = parseInt(widthStr, 10);
                                            const height = parseInt(heightStr, 10);
                                            if (!isNaN(width) && !isNaN(height)) {
                                                logic.setProjectState(prev => ({
                                                    ...prev,
                                                    canvasDimensions: { width, height }
                                                }));
                                            }
                                        }}
                                        options={[
                                            { value: '1280x720', label: '1280x720 (16:9)' },
                                            { value: '1920x1080', label: '1920x1080 (16:9)' },
                                            { value: '1080x1920', label: '1080x1920 (9:16)' }, // Vertical
                                            { value: '1080x1080', label: '1080x1080 (1:1)' },   // Square
                                        ]}
                                        style={{width: 140}} // Adjust width to fit options
                                    />
                                </Space>
                            )}
                        </Space>
                        <Button onClick={showExportModal} icon={<DownloadOutlined />}>
                            Export Project
                        </Button>
                        <Space size="middle" style={{marginRight:'30px'}}>
                            <Button
                                type="primary"
                                size="small"
                                onClick={logic.handleBurnSubtitlesWithFFmpeg} // <--- CORRECTED METHOD NAME
                                disabled={
                                    logic.editorState === 'processing_video' || // Disable if already processing
                                    logic.isBurningSubtitles || // Disable if FFmpeg burning is in progress (from useVideoEditorLogic)
                                    logic.editorState === 'uploading' ||
                                    !logic.projectState.subtitles ||
                                    logic.projectState.subtitles.length === 0 ||
                                    !(logic.selectedVideoSecureUrl || logic.projectState.mediaAssets.some(asset => asset.type.startsWith("video/") && asset.secureUrl)) ||
                                    !logic.ffmpegLoaded // Disable if FFmpeg isn't loaded
                                }
                                loading={logic.isBurningSubtitles} // Show loading when FFmpeg is burning
                            >
                                {logic.isBurningSubtitles
                                    ? `Burning... ${logic.burningProgress}%` // Show FFmpeg burning progress
                                    : 'Burn Subtitles'} {/* Changed button text for clarity */}
                            </Button>
                            <Button icon={<ShareAltOutlined />} disabled>Share</Button>
                            <Button type="primary" icon={<DownloadOutlined />} style={{ background: token.colorPrimary, borderColor: token.colorPrimary }} disabled>Export Project</Button>
                            <Dropdown menu={{ items: [{key: '1', label: 'Profile'}, {key: '2', label: 'Logout'}] }} placement="bottomRight">
                                <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer', background: token.colorPrimary }}>P</Avatar>
                            </Dropdown>
                        </Space>
                    </Header>
                    <Modal
                        title="Export Settings"
                        open={isExportModalVisible}
                        onOk={handleExportModalOk}
                        onCancel={handleExportModalCancel}
                        okText="Export Project"
                        cancelText="Cancel"
                        confirmLoading={isExporting} // Show loading on OK button while exporting
                    >
                        <Space direction="vertical" size="large" style={{ width: '100%', marginTop: 20 }}>
                            {isExporting && <Progress percent={exportProgress} style={{marginBottom: 16}} />}
                            <div>
                                <Text strong>Image type:</Text>
                                <Radio.Group
                                    onChange={(e) => setSelectedImageType(e.target.value)}
                                    value={selectedImageType}
                                    style={{ marginLeft: 8 }}
                                    optionType="button"
                                    buttonStyle="solid"
                                >
                                    <Radio.Button value="default">Default</Radio.Button>
                                    <Radio.Button value="webp">WEBP</Radio.Button>
                                </Radio.Group>
                                <Text type="secondary" style={{ display: 'block', marginLeft: 8, marginTop: 4 }}>
                                    {selectedImageType === 'default'
                                        ? 'Image output will be JPEG or PNG.'
                                        : 'Image output will be WEBP.'}
                                </Text>
                            </div>
                            <div>
                                <Text strong>GIF type:</Text>
                                <Radio.Group
                                    onChange={(e) => setSelectedGifType(e.target.value)}
                                    value={selectedGifType}
                                    style={{ marginLeft: 8 }}
                                    optionType="button"
                                    buttonStyle="solid"
                                >
                                    <Radio.Button value="webp">WEBP</Radio.Button>
                                    <Radio.Button value="gif">GIF</Radio.Button>
                                </Radio.Group>
                                <Text type="secondary" style={{ display: 'block', marginLeft: 8, marginTop: 4 }}>
                                    {selectedGifType === 'gif'
                                        ? 'GIF output will be GIF file format. We recommend the WEBP file format.'
                                        : 'GIF output will be WEBP file format.'}
                                </Text>
                            </div>
                            <div>
                                <Checkbox
                                    checked={removeColorOnExport}
                                    onChange={(e) => setRemoveColorOnExport(e.target.checked)}
                                >
                                    Remove Color (Desaturate Video)
                                </Checkbox>
                                <Text type="secondary" style={{ display: 'block', marginLeft: 24, marginTop: 4 }}>
                                    Exports the main video in black and white. This will re-encode the video.
                                </Text>
                            </div>
                        </Space>
                    </Modal>


                    {/* Center Area (Preview + Properties) - Takes remaining vertical space, flows horizontally */}
                    <Layout style={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'row', marginRight: '80px' }}>
                        {/* Preview Area - Takes remaining horizontal space */}
                        <Content style={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', marginRight: '50px' }}>
                            {/* Show InitialScreen ONLY if NO media assets exist AND not currently uploading */}
                            {(logic.projectState.mediaAssets.length === 0 && !logic.uploadingFile)
                                ? <InitialScreen logic={logic} />
                                : <PreviewArea logic={logic} /> // Pass logic down
                            }
                        </Content>
                        {/* Properties Panel */}
                        {logic.editorState === 'editor' && !screens.xs && (
                            <Sider width={340} theme="dark" className="properties-sider" style={{ height: '100%', overflow: 'hidden', flexShrink: 0 }}>
                                <PropertiesPanel
                                    selectedClip={logic.selectedClip}
                                    currentTime={logic.currentTime}
                                    updateSelectedClipProperty={logic.updateSelectedClipProperty}
                                    updateSelectedClipText={logic.updateSelectedClipText}
                                    addOrUpdateKeyframe={logic.addOrUpdateKeyframe}
                                    onDeleteClip={logic.handleDeleteClip}
                                    // Pass subtitle state and handlers
                                    subtitleFontFamily={logic.projectState.subtitleFontFamily}
                                    updateSubtitleFontFamily={logic.updateSubtitleFontFamily}
                                    subtitleFontSize={logic.projectState.subtitleFontSize}
                                    updateSubtitleFontSize={logic.updateSubtitleFontSize}
                                    subtitleTextAlign={logic.projectState.subtitleTextAlign as 'left' | 'center' | 'right'} // Cast to specific union type
                                    updateSubtitleTextAlign={logic.updateSubtitleTextAlign}
                                    isSubtitleBold={logic.projectState.isSubtitleBold}
                                    toggleSubtitleBold={logic.toggleSubtitleBold}
                                    isSubtitleItalic={logic.projectState.isSubtitleItalic}
                                    toggleSubtitleItalic={logic.toggleSubtitleItalic}
                                    isSubtitleUnderlined={logic.projectState.isSubtitleUnderlined}
                                    toggleSubtitleUnderlined={logic.toggleSubtitleUnderlined}
                                    subtitleColor={logic.projectState.subtitleColor}
                                    updateSubtitleColor={logic.updateSubtitleColor}
                                    subtitleBackgroundColor={logic.projectState.subtitleBackgroundColor}
                                    updateSubtitleBackgroundColor={logic.updateSubtitleBackgroundColor}
                                />
                            </Sider>
                        )}
                    </Layout>

                    {/* Timeline Footer - Fixed height at the bottom */}
                    {logic.editorState === 'editor' && (
                        <Footer className="timeline-footer" style={{ padding: 0, height: 180, display: 'flex', flexDirection: 'column', flexShrink: 0 }}> {/* Use fixed timelineHeight */}
                            <TimelineControls logic={logic} screens={screens} />
                            <TimelineTracks logic={logic} />
                        </Footer>
                    )}
                </Layout> {/* End Nested Layout for Main Content + Timeline */}

                {/* Mobile Drawer - Sibling to the main Layout, correctly placed */}
                <Drawer
                    title="Menu" placement="left" closable={true} onClose={logic.closeMobileDrawer}
                    open={logic.mobileDrawerVisible && screens.xs} width={250}
                    bodyStyle={{ padding: 0, background: '#1f1f1f' }}
                    headerStyle={{ background: '#1f1f1f', borderBottom: `1px solid #303030` }}
                    zIndex={1050}
                >
                    <MainMenu
                        selectedKey={logic.selectedMenuKey}
                        onClick={(e) => { logic.handleMenuClick(e); logic.closeMobileDrawer(); }}
                        mode="vertical"
                    />
                </Drawer>
            </Layout> {/* End Main Layout */}
        </ConfigProvider>
    );
};

export default VideoEditor;
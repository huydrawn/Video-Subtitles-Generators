
import React from 'react';
import {
    Layout, Button, Input, Select, Space, Slider,
    Typography, Grid, theme, Drawer, Upload, Tabs, Avatar, Tooltip, Dropdown,
    ConfigProvider, Switch, Row, Col, Card,
    message, List, UploadProps
} from 'antd';
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
    CustomerServiceOutlined, LeftOutlined, DeleteOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import Moveable from 'react-moveable';

// Import the hook, types, and components
import {
    useVideoEditorLogic,
    formatTime,
    parseTimecodeToSeconds,
    interpolateValue, // <-- Ensure interpolateValue is imported here if used directly (e.g., in Moveable onDrag)
    PREVIEW_ZOOM_FIT_MODE,
    PREVIEW_ZOOM_FILL_MODE,
    PREVIEW_ZOOM_LEVELS,
    // Import new constants/handlers if needed (although accessed via logic object)
} from './useVideoEditorLogic';
import type { VideoEditorLogic, ClipType, Keyframe, SubtitleEntry } from './types';
import { MainMenu } from './MainMenu';
import { MediaPanel } from './MediaPanel';
import { TextPanel } from './TextPanel';
import { PropertiesPanel } from './PropertiesPanel';

// Import custom CSS
import './videoeditor.css';

const { Header, Sider, Content, Footer } = Layout;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;
const { Dragger } = Upload;
const { TabPane } = Tabs;

// --- Reusable UI Components ---

const PreviewArea: React.FC<{ logic: VideoEditorLogic }> = ({ logic }) => {
    const { token } = theme.useToken();
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

    // activeSubtitleOnCanvas is not directly used for rendering here,
    // as drawing happens in useVideoEditorLogic's drawFrame on the canvas.
    // But it's here if you needed to show an overlay based on the active subtitle.
    // const activeSubtitleOnCanvas = logic.projectState.subtitles.find(sub =>
    //     logic.currentTime >= sub.startTime && logic.currentTime < sub.endTime
    // );

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
                        top:'50%', // Center vertically
                        // FIX: Removed the incorrect offset based on propertiesPanelWidth.
                        // The canvas is positioned absolutely within its container (.preview-container),
                        // and left: 50% combined with transform: translateX(-50%) centers it horizontally
                        // within that container. The container's width is already managed by the flex
                        // layout of its parent (the Content area), shrinking when the properties panel opens.
                        // Therefore, no manual offset is needed here.
                        left: '50%', // Center horizontally within the container
                        transform: `translate(-50%, -50%) scale(${logic.previewZoomLevel})`
                    }}
                />
                {/* Subtitle overlay is drawn directly on canvas in drawFrame */}
                {/* The below div is just for potential UI overlay elements if not drawing on canvas */}
                {/* activeSubtitleOnCanvas && (
                    <div className="preview-subtitle-overlay" style={{
                        position: 'absolute', bottom: '10%', left: '40%', transform: 'translateX(-50%)',
                        color: 'white',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '18px',
                        textAlign: 'left',
                        zIndex: 5,
                        pointerEvents: 'none',
                        whiteSpace: 'pre-wrap',
                        textShadow: '0px 0px 2px rgba(0,0,0,0.5)',
                        lineHeight: 1.4,
                        maxWidth: '80%'
                    }}>
                        {activeSubtitleOnCanvas.text}
                    </div>
                )*/}
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
        (logic.projectState.totalDuration + 5) * pxPerSec
    );

    let secondsPerMajorMarker: number; let secondsPerMinorMarker: number;
    if (pxPerSec < 25) { secondsPerMajorMarker = 10; secondsPerMinorMarker = 2; }
    else if (pxPerSec < 60) { secondsPerMajorMarker = 5; secondsPerMinorMarker = 1; }
    else if (pxPerSec < 120) { secondsPerMajorMarker = 2; secondsPerMinorMarker = 0.5; }
    else if (pxPerSec < 300) { secondsPerMajorMarker = 1; secondsPerMinorMarker = 0.2; }
    else { secondsPerMajorMarker = 0.5; secondsPerMinorMarker = 0.1; }
    const numMinorMarkers = Math.ceil(totalTimelineWidth / (secondsPerMinorMarker * pxPerSec));

    const activeSubtitleInTimeline = logic.projectState.subtitles.find(sub =>
        logic.currentTime >= sub.startTime && logic.currentTime < sub.endTime
    );

    const subtitleTrackHeight = logic.projectState.subtitles.length > 0 ? 35 : 0;

    return (
        <div ref={logic.timelineContainerRef} className="timeline-scroll-container">
            <div
                className="timeline-content-width"
                style={{ width: `${totalTimelineWidth}px`, paddingTop: `${28 + subtitleTrackHeight}px` }}
                onClick={(e) => { if (e.target === e.currentTarget) logic.handleSelectClip(null); }}
            >
                <div className="ruler-container" style={{ top: `${subtitleTrackHeight}px`, height: '28px' }}>
                    {Array.from({ length: numMinorMarkers }).map((_, i) => {
                        const time = i * secondsPerMinorMarker;
                        if (time > logic.projectState.totalDuration + secondsPerMajorMarker * 2 && time > (logic.currentTime + 10) * 2) return null;
                        const leftPos = time * pxPerSec;
                        const isMajor = Math.abs(time % secondsPerMajorMarker) < 0.001 || time === 0;
                        const markerHeight = isMajor ? '60%' : '30%';
                        return (
                            <React.Fragment key={`m-${time.toFixed(3)}`}>
                                <div className={`ruler-marker ${isMajor ? 'major' : ''}`} style={{ left: `${leftPos}px`, height: markerHeight }}/>
                                {isMajor && <span className="ruler-label" style={{ left: `${leftPos}px` }}>{formatTime(time).split('.')[0]}</span>}
                            </React.Fragment>
                        );
                    })}
                    <div className="playhead-line" style={{ left: `${logic.currentTime * pxPerSec}px`, top: '0px', bottom: `-${(logic.projectState.tracks.length * 60)}px` }}>
                        <div className="playhead-handle" />
                    </div>
                    <Slider
                        className="timeline-seek-slider"
                        value={logic.currentTime} max={logic.projectState.totalDuration || 1} min={0} step={0.01}
                        onChange={(v) => logic.handleTimelineSeek(v ?? 0)}
                        tooltip={{ open: false }}
                        // The default Ant Design Slider track fills based on `value` prop and theme's primary color.
                        // This is the desired behavior for showing progress when playing and stopping when paused.
                        // Removed explicit trackStyle customization
                        railStyle={{ background: 'transparent' }}
                        style={{ position: 'absolute', top: '0px', left: 0, right: 0, margin: 0, padding: 0, height: '28px', zIndex: 28 }}
                    />
                </div>

                {subtitleTrackHeight > 0 && (
                    <div className="timeline-subtitle-track-area" style={{ height: `${subtitleTrackHeight}px`, top: '0px' }}>
                        <div className="timeline-track-header"><Text>Subtitles</Text></div>
                        <div className="timeline-track-clips-area" >
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
                                            width: `${Math.max(5, subWidthPx)}px`,
                                            zIndex: isCurrent ? 25 : 20,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 4px',
                                            lineHeight: '30px', color: 'white', fontSize: '10px',
                                            display: 'flex', alignItems: 'center',
                                            fontFamily: logic.projectState.subtitleFontFamily // <-- Apply font here too
                                        }}
                                        onClick={(e) => { e.stopPropagation(); logic.handleTimelineSeek(subtitle.startTime); }}
                                        title={subtitle.text}
                                    >
                                        <Text ellipsis style={{ color: 'white', fontSize: '10px' }}>{subtitle.text}</Text>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div style={{ paddingTop: 0 }}>
                    {logic.projectState.tracks.map((track, trackIndex) => (
                        <div key={track.id} className="timeline-track">
                            <div className="timeline-track-header">
                                <Text>{trackIndex + 1}</Text>
                                <Tooltip title="Mute Track (Placeholder)"><Button type="text" size="small" shape="circle" icon={<EyeOutlined />} disabled /></Tooltip>
                                <Tooltip title="Lock Track (Placeholder)"><Button type="text" size="small" shape="circle" icon={<LockOutlined />} disabled /></Tooltip>
                            </div>
                            <div
                                className="timeline-track-clips-area"
                                onClick={(e) => { if (e.target === e.currentTarget) logic.handleSelectClip(null); }}
                            >
                                {track.clips.filter(clip => {
                                    // Only include text clips that are NOT associated with subtitles here
                                    // Subtitle text clips are now handled in the dedicated subtitle track area
                                    return !(clip.type === 'text' && logic.projectState.subtitles.find(sub => sub.id === clip.id));
                                }).map(clip => {
                                    const clipWidthPx = clip.duration * pxPerSec;
                                    const clipLeftPx = clip.startTime * pxPerSec;
                                    const isSelected = clip.id === logic.projectState.selectedClipId;
                                    const displayWidth = Math.max(2, clipWidthPx);
                                    return (
                                        <div
                                            key={clip.id}
                                            id={`clip-${clip.id}`}
                                            className={`timeline-clip ${isSelected ? 'selected' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); logic.handleSelectClip(clip.id); }}
                                            style={{ left: `${clipLeftPx}px`, width: `${displayWidth}px` }}
                                        >
                                            <div className="clip-thumbnail-container">
                                                {clip.thumbnailUrls && clip.thumbnailUrls.length > 0 && clip.type !== 'text' && (() => {
                                                    const segments: React.ReactNode[] = []; const segmentDuration = logic.THUMBNAIL_INTERVAL; const segmentWidthPx = segmentDuration * pxPerSec; let currentLeft = 0; const sortedThumbs = [...clip.thumbnailUrls].sort((a, b) => a.time - b.time);
                                                    for (let i = 0; currentLeft < displayWidth; ++i) { const segmentStartTime = clip.startTime + i * segmentDuration; let bestThumb = sortedThumbs[0]; for(let j = sortedThumbs.length - 1; j >= 0; j--) { if(sortedThumbs[j].time <= segmentStartTime + 0.01) { bestThumb = sortedThumbs[j]; break; }} const widthForThisSegment = Math.min(segmentWidthPx, displayWidth - currentLeft); if (widthForThisSegment <= 0) break; segments.push(<div key={`${clip.id}-thumb-${i}`} className="clip-thumbnail-segment" style={{ left: `${currentLeft}px`, width: `${widthForThisSegment}px`, backgroundImage: bestThumb ? `url(${bestThumb.url})` : 'none' }} />); currentLeft += segmentWidthPx; } return segments;
                                                })()}
                                                {(clip.type === 'video') && !clip.thumbnailUrls?.length && (
                                                    <div style={{width: '100%', height: '100%', background: 'repeating-linear-gradient( 45deg, #444, #444 2px, #3a3a3a 2px, #3a3a3a 4px)', opacity: 0.3}} title="Waveform Placeholder"></div>
                                                )}
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
                    <div style={{ padding: '5px 5px 5px 55px' }}>
                        <Button size="small" icon={<PlusOutlined />} disabled block type="dashed">Add Track</Button>
                    </div>
                </div>

                <Moveable
                    ref={logic.moveableRef}
                    target={logic.projectState.selectedClipId ? `#clip-${logic.projectState.selectedClipId}` : null}
                    container={logic.timelineContainerRef.current || undefined}
                    origin={false} edge={false} draggable={true} throttleDrag={0}
                    dragTarget={logic.projectState.selectedClipId ? `#clip-${logic.projectState.selectedClipId}` : undefined}
                    resizable={true} renderDirections={["w", "e"]} keepRatio={false} throttleResize={0}
                    snappable={true} snapDirections={{ left: true, right: true }} elementSnapDirections={{ left: true, right: true }} snapThreshold={5}
                    className="timeline-moveable"
                    onDrag={({ target, beforeTranslate }) => {
                        // Prevent drag for subtitle-associated text clips on the timeline
                        const clipId = logic.projectState.selectedClipId;
                        const clip = logic.projectState.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
                        const isSubtitleClip = clip?.type === 'text' && logic.projectState.subtitles.some(sub => sub.id === clipId);
                        if (!clipId || isSubtitleClip) return;

                        let trackIndex = -1;
                        for(let i = 0; i < logic.projectState.tracks.length; i++) {
                            if (logic.projectState.tracks[i].clips.some(c => c.id === clipId)) {
                                trackIndex = i;
                                break;
                            }
                        }
                        if (trackIndex === -1) return;

                        // The target's style.transform is already set by the layout positioning.
                        // beforeTranslate is the delta from this *initial* position.
                        // To keep the element visually smooth, we apply the horizontal delta directly.
                        // The vertical positioning is handled by the track area's layout and the clip's inherent position within it.
                        // We should prevent vertical dragging on the timeline moveable.
                        const currentTransform = target.style.transform || '';
                        const translateYMatch = currentTransform.match(/translateY\([^)]+\)/);
                        const translateY = translateYMatch ? translateYMatch[0] : ''; // Keep existing Y transform

                        // Update target's position based only on horizontal drag and existing vertical position
                        target.style.transform = `translateX(${beforeTranslate[0]}px) ${translateY}`;

                    }}
                    onDragEnd={logic.onTimelineDragEnd}
                    onResize={logic.onTimelineResize}
                    onResizeEnd={logic.onTimelineResizeEnd}
                />
            </div>
        </div>
    );
};


const InitialScreen: React.FC<{ logic: VideoEditorLogic }> = ({ logic }) => {
    const { token } = theme.useToken();
    return (
        <Content className="initial-screen-content" style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', flexGrow: 1 }}>
            <Card className="initial-screen-card">
                <Title level={4} style={{ marginBottom: 24, textAlign: 'center' }}>Start a new project</Title>
                <Dragger {...logic.draggerProps} className="initial-screen-dragger">
                    {logic.editorState === 'uploading' ? (<Text style={{ color: token.colorTextSecondary }}>Processing...</Text>) : (<> <p className="ant-upload-drag-icon"><InboxOutlined /></p><p className="ant-upload-text">Click or drag file(s) here</p><p className="ant-upload-hint">Video or Image files, or Subtitles (.srt, .vtt)</p></>)}
                </Dragger>
            </Card>
        </Content>
    );
}

// --- Main Video Editor Component ---
const VideoEditor: React.FC = () => {
    const logic: VideoEditorLogic = useVideoEditorLogic();
    const screens = useBreakpoint();
    const { token } = theme.useToken();
    const iconSiderWidth = 60;
    const contextualPanelWidth = 350;
    const propertiesPanelWidth = 350; // This variable is defined here, not on the logic object.
    const timelineHeight = 180;
    const headerHeight = 56;

    const srtUploadButtonProps: UploadProps = {
        name: 'file', multiple: false, accept: '.srt,.vtt', showUploadList: false,
        beforeUpload: (file) => { logic.handleUploadSrt(file); return false; },
    };

    const activeSubtitleInList = logic.projectState.subtitles.find(sub =>
        logic.currentTime >= sub.startTime && logic.currentTime < sub.endTime
    );

    return (
        <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#7B61FF', motion: false } }}>
            <Layout className="video-editor-layout" style={{ minHeight: '100vh', overflow: 'hidden' }}>

                {/* Left Icon Sider */}
                {!screens.xs && (
                    <Sider collapsed={true} width={iconSiderWidth} collapsedWidth={iconSiderWidth} theme="dark" className="icon-sider" style={{ zIndex: 3, height: '100vh' }}>
                        <div style={{height: headerHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8}}>
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
                        {/* The actual content div inside the sider that gets the white background and scrolling */}
                        {/* The CSS rules for .ant-layout-sider-children target this area */}
                        <div className="contextual-panel-content-area"> {/* Added a class for easier targeting if needed, but ant-layout-sider-children is used in CSS */}
                            {logic.selectedMenuKey === 'media' && (
                                <MediaPanel draggerProps={logic.draggerProps} editorState={logic.editorState} mediaAssets={logic.projectState.mediaAssets} />
                            )}
                            {logic.selectedMenuKey === 'text' && (
                                <TextPanel onAddTextClip={logic.handleAddTextClip} />
                            )}
                            {logic.selectedMenuKey === 'subtitles' && (
                                <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    {logic.projectState.subtitles && logic.projectState.subtitles.length > 0 ? (
                                        <>
                                            <div style={{marginBottom: 12, display: 'flex', flexDirection: 'column'}}>
                                                <Title level={5} style={{ margin: '0 0 8px 0' }}>Subtitles</Title>
                                                {/* Subtitle Settings */}
                                                <div style={{ marginBottom: 16, padding: '8px 0', borderTop: `1px solid ${token.colorBorderSecondary}`, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                                                    {/* Font Family Control (Existing) */}
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
                                                    {/* Font Size Control (NEW) */}
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
                                                        <Text type="secondary">Chars per subtitle:</Text> <Text strong>92</Text>
                                                        <Switch size="small" checked={false} disabled style={{marginLeft: 8}} />
                                                        <Text type="secondary">Smart tools</Text>
                                                        <Button type="text" size="small" icon={<CaretDownOutlined />} disabled />
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
                                                              {/* Optional: Apply canvas font size to list item for preview? Probably not desired. Keep separate sizes. */}
                                                              <div style={{fontSize: '14px', color: token.colorText, whiteSpace: 'pre-wrap', fontFamily: logic.projectState.subtitleFontFamily }}>{item.text}</div>
                                                          </List.Item>
                                                      )}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Title level={5} style={{ margin: '0 0 16px 0' }}>Add Subtitles</Title>
                                            <Upload {...srtUploadButtonProps}>
                                                <Card hoverable style={{ marginBottom: 16, cursor: 'pointer' }}>
                                                    <div style={{ textAlign: 'center', padding: '8px 0' }}> <InboxOutlined style={{ fontSize: 30, color: token.colorPrimary }} /><Title level={5} style={{ margin: '8px 0 4px 0' }}>Upload SRT / VTT</Title><Text type="secondary" style={{ fontSize: 12 }}>Use a subtitle file</Text> </div>
                                                </Card>
                                            </Upload>
                                            <Card hoverable style={{ cursor: 'pointer' }} onClick={logic.handleStartFromScratch}>
                                                <div style={{ textAlign: 'center', padding: '8px 0' }}> <PlusOutlined style={{ fontSize: 30, color: token.colorPrimary }} /><Title level={5} style={{ margin: '8px 0 4px 0' }}>Start from scratch</Title><Text type="secondary" style={{ fontSize: 12 }}>Type out your subtitles</Text> </div>
                                            </Card>
                                        </>
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
                <Layout style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: timelineHeight }}>
                    {/* Header */}
                    <Header style={{ padding: '0 16px 0 20px', height: headerHeight, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1, flexShrink: 0 }}>
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
                        <Space><Text type="secondary" style={{fontSize: '12px'}}>Last edited a few seconds ago</Text></Space>
                        <Space size="middle">
                            <Button type="primary" size="small" disabled>Upgrade ✨</Button>
                            <Button icon={<ShareAltOutlined />} disabled>Share</Button>
                            <Button type="primary" icon={<DownloadOutlined />} style={{ background: token.colorPrimary, borderColor: token.colorPrimary }} disabled>Export Project</Button>
                            <Dropdown menu={{ items: [{key: '1', label: 'Profile'}, {key: '2', label: 'Logout'}] }} placement="bottomRight">
                                <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer', background: token.colorPrimary }}>P</Avatar>
                            </Dropdown>
                        </Space>
                    </Header>

                    {/* Center Area (Preview + Properties) - Takes remaining vertical space, flows horizontally */}
                    <Layout style={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'row' }}>
                        {/* Preview Area - Takes remaining horizontal space */}
                        <Content style={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            {logic.editorState === 'initial' || (logic.editorState === 'uploading' && logic.projectState.mediaAssets.length === 0)
                                ? <InitialScreen logic={logic} />
                                : <PreviewArea logic={logic} /> // Pass logic down
                            }
                        </Content>
                        {/* Properties Panel */}
                        {logic.editorState === 'editor' && !screens.xs && (
                            <Sider width={propertiesPanelWidth} theme="dark" className="properties-sider" style={{ height: '100%', overflow: 'hidden', flexShrink: 0 }}>
                                {/* The actual content div inside the sider that gets the white background and scrolling */}
                                {/* The CSS rules for .ant-layout-sider-children target this area */}
                                <div className="properties-panel-content-area"> {/* Added a class for easier targeting if needed */}
                                    <PropertiesPanel
                                        selectedClip={logic.selectedClip}
                                        currentTime={logic.currentTime}
                                        updateSelectedClipProperty={logic.updateSelectedClipProperty}
                                        updateSelectedClipText={logic.updateSelectedClipText}
                                        addOrUpdateKeyframe={logic.addOrUpdateKeyframe}
                                        onDeleteClip={logic.handleDeleteClip}
                                        // Pass the subtitle properties and handlers to satisfy the PropertiesPanelProps interface
                                        subtitleFontFamily={logic.projectState.subtitleFontFamily}
                                        updateSubtitleFontFamily={logic.updateSubtitleFontFamily}
                                        subtitleFontSize={logic.projectState.subtitleFontSize}
                                        updateSubtitleFontSize={logic.updateSubtitleFontSize}
                                        // Pass subtitle alignment props
                                        subtitleTextAlign={logic.projectState.subtitleTextAlign}
                                        updateSubtitleTextAlign={logic.updateSubtitleTextAlign}
                                        // --- ADDED: Pass subtitle style props --- <--- ADDED HERE
                                        isSubtitleBold={logic.projectState.isSubtitleBold}
                                        toggleSubtitleBold={logic.toggleSubtitleBold}
                                        isSubtitleItalic={logic.projectState.isSubtitleItalic}
                                        toggleSubtitleItalic={logic.toggleSubtitleItalic}
                                        isSubtitleUnderlined={logic.projectState.isSubtitleUnderlined}
                                        toggleSubtitleUnderlined={logic.toggleSubtitleUnderlined}
                                        // ----------------------------------------------
                                    />
                                </div>
                            </Sider>
                        )}
                    </Layout>

                    {/* Timeline Footer - Fixed height at the bottom */}
                    {logic.editorState === 'editor' && (
                        <Footer className="timeline-footer" style={{ padding: 0, height: timelineHeight, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
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


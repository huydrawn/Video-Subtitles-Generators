import React from 'react';
import {
    Layout, Button, Input, Select, Space, Slider,
    Typography, Grid, theme, Drawer, Upload, Tabs, Avatar, Tooltip, Dropdown,
    ConfigProvider, Switch, Row, Col, Card, // Added missing imports
    message, // Import message for error/success popups
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

// Import the hook, types, and components (Corrected Paths and Exports)
import {
    useVideoEditorLogic, // This is the corrected hook
    formatTime,
    PREVIEW_ZOOM_FIT_MODE,
    PREVIEW_ZOOM_FILL_MODE,
    PREVIEW_ZOOM_LEVELS // Ensure this is exported and imported
} from './useVideoEditorLogic';
import type { VideoEditorLogic, ClipType, Keyframe } from './types'; // Adjusted path
import { MainMenu } from './MainMenu'; // Adjusted path
import { MediaPanel } from './MediaPanel'; // Adjusted path
import { TextPanel } from './TextPanel'; // Adjusted path
import { PropertiesPanel } from './PropertiesPanel'; // Adjusted path

// Import custom CSS
import './videoeditor.css'; // Assuming CSS is in the same directory

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
        ...PREVIEW_ZOOM_LEVELS.map((level: number) => ({ // Added type for level
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
                        top:'50%', left: '50%',
                        transform: `translate(-50%, -50%) scale(${logic.previewZoomLevel})` // Single transform
                    }}
                />
                <div className="moveable-target-preview" style={{ pointerEvents: logic.selectedClip ? 'auto' : 'none', display: 'none', zIndex: 10 }} />
                <Moveable
                    ref={logic.previewMoveableRef}
                    target=".moveable-target-preview"
                    container={logic.previewContainerRef.current || undefined}
                    draggable={true} resizable={true} rotatable={true} scalable={false} keepRatio={false}
                    throttleDrag={0} throttleResize={0} throttleRotate={0}
                    snappable={true} origin={true} edge={true}
                    bounds={logic.previewContainerRef.current ? { left: 0, top: 0, right: logic.previewContainerRef.current.clientWidth, bottom: logic.previewContainerRef.current.clientHeight, position: "css" } : undefined}
                    className="preview-moveable"
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
    const totalTimelineWidth = Math.max((logic.timelineContainerRef.current?.clientWidth || 500), (logic.projectState.totalDuration + 5) * pxPerSec);
    let secondsPerMajorMarker: number; let secondsPerMinorMarker: number;
    if (pxPerSec < 25) { secondsPerMajorMarker = 10; secondsPerMinorMarker = 2; }
    else if (pxPerSec < 60) { secondsPerMajorMarker = 5; secondsPerMinorMarker = 1; }
    else if (pxPerSec < 120) { secondsPerMajorMarker = 2; secondsPerMinorMarker = 0.5; }
    else if (pxPerSec < 300) { secondsPerMajorMarker = 1; secondsPerMinorMarker = 0.2; }
    else { secondsPerMajorMarker = 0.5; secondsPerMinorMarker = 0.1; }
    const numMinorMarkers = Math.ceil(totalTimelineWidth / (secondsPerMinorMarker * pxPerSec));

    return (
        <div ref={logic.timelineContainerRef} className="timeline-scroll-container">
            {/* FIXED: Wrap direct children of scroll container in a single element */}
            <div
                className="timeline-content-width"
                style={{ width: `${totalTimelineWidth}px` }}
                onClick={(e) => { if (e.target === e.currentTarget) logic.handleSelectClip(null); }}
            >
                {/* Ruler and Playhead are positioned absolutely within this */}
                <div className="ruler-container">
                    {Array.from({ length: numMinorMarkers }).map((_, i) => {
                        const time = i * secondsPerMinorMarker;
                        if (time > logic.projectState.totalDuration + secondsPerMajorMarker * 2) return null;
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
                    <div className="playhead-line" style={{ left: `${logic.currentTime * pxPerSec}px` }}>
                        <div className="playhead-handle" />
                    </div>
                    <Slider
                        className="timeline-seek-slider"
                        value={logic.currentTime} max={logic.projectState.totalDuration || 1} min={0} step={0.01}
                        onChange={(v) => logic.handleTimelineSeek(v ?? 0)}
                        tooltip={{ open: false }} trackStyle={{ background: 'transparent' }} railStyle={{ background: 'transparent' }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, margin: 0, padding: 0, height: '100%', zIndex: 28 }}
                    />
                </div>

                {/* Tracks Container (Relative positioning context for clips) */}
                <div style={{ paddingTop: 0 /* Ruler handles padding */ }}>
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
                                {track.clips.map(clip => {
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
                                                {/* Thumbnail rendering */}
                                                {clip.thumbnailUrls && clip.thumbnailUrls.length > 0 && clip.type !== 'text' && (() => {
                                                    const segments: React.ReactNode[] = []; const segmentDuration = logic.THUMBNAIL_INTERVAL; const segmentWidthPx = segmentDuration * pxPerSec; let currentLeft = 0; const sortedThumbs = [...clip.thumbnailUrls].sort((a, b) => a.time - b.time);
                                                    for (let i = 0; currentLeft < displayWidth; ++i) { const segmentStartTime = i * segmentDuration; let bestThumb = sortedThumbs[0]; for(let j = sortedThumbs.length - 1; j >= 0; j--) { if(sortedThumbs[j].time <= segmentStartTime + 0.01) { bestThumb = sortedThumbs[j]; break; }} const widthForThisSegment = Math.min(segmentWidthPx, displayWidth - currentLeft); if (widthForThisSegment <= 0) break; segments.push(<div key={`${clip.id}-thumb-${i}`} className="clip-thumbnail-segment" style={{ left: `${currentLeft}px`, width: `${widthForThisSegment}px`, backgroundImage: bestThumb ? `url(${bestThumb.url})` : 'none' }} />); currentLeft += widthForThisSegment; } return segments;
                                                })()}
                                                {/* Waveform placeholder */}
                                                {(clip.type === 'video') && !clip.thumbnailUrls?.length && (
                                                    <div style={{width: '100%', height: '100%', background: 'repeating-linear-gradient( 45deg, #444, #444 2px, #3a3a3a 2px, #3a3a3a 4px)', opacity: 0.3}} title="Waveform Placeholder"></div>
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

                {/* Moveable is positioned relative to timeline-scroll-container */}
                <Moveable
                    ref={logic.moveableRef}
                    target={logic.projectState.selectedClipId ? `#clip-${logic.projectState.selectedClipId}` : null}
                    container={logic.timelineContainerRef.current || undefined}
                    origin={false} edge={false} draggable={true} throttleDrag={0}
                    dragTarget={logic.projectState.selectedClipId ? `#clip-${logic.projectState.selectedClipId}` : undefined}
                    resizable={true} renderDirections={["w", "e"]} keepRatio={false} throttleResize={0}
                    snappable={true} snapDirections={{ left: true, right: true }} elementSnapDirections={{ left: true, right: true }} snapThreshold={5}
                    className="timeline-moveable"
                    onDrag={({ target, beforeTranslate }) => { const yTransform = target.style.transform.match(/translateY\([^)]+\)/)?.[0] || 'translateY(-50%)'; target.style.transform = `translate(${beforeTranslate[0]}px, ${yTransform.includes('-50%') ? '-50%' : '0%'})`; }}
                    onDragEnd={logic.onTimelineDragEnd}
                    onResize={logic.onTimelineResize}
                    onResizeEnd={logic.onTimelineResizeEnd}
                />
            </div> {/* End timeline-content-width */}
        </div> // End timeline-scroll-container
    );
};

const InitialScreen: React.FC<{ logic: VideoEditorLogic }> = ({ logic }) => {
    const { token } = theme.useToken();
    return (
        <Content className="initial-screen-content" style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', flexGrow: 1 }}>
            <Card className="initial-screen-card">
                <Title level={4} style={{ marginBottom: 24, textAlign: 'center' }}>Start a new project</Title>
                <Dragger {...logic.draggerProps} className="initial-screen-dragger">
                    {logic.editorState === 'uploading' ? (<Text style={{ color: token.colorTextSecondary }}>Processing...</Text>) : (<> <p className="ant-upload-drag-icon"><InboxOutlined /></p><p className="ant-upload-text">Click or drag file(s) here</p><p className="ant-upload-hint">Video or Image files</p></>)}
                </Dragger>
            </Card>
        </Content>
    );
}

const ContextualPanel: React.FC<{ logic: VideoEditorLogic }> = ({ logic }) => {
    switch (logic.selectedMenuKey) {
        case 'media': return <MediaPanel draggerProps={logic.draggerProps} editorState={logic.editorState} mediaAssets={logic.projectState.mediaAssets} />;
        case 'text': return <TextPanel onAddTextClip={logic.handleAddTextClip} />;
        default: return <div style={{ padding: 16, textAlign: 'center' }}><Text type="secondary">Select a tool</Text></div>;
    }
};

// --- Main Video Editor Component ---
const VideoEditor: React.FC = () => {
    const logic: VideoEditorLogic = useVideoEditorLogic(); // Type assertion can help here, but is not strictly needed after hook fix
    const screens = useBreakpoint();
    const { token } = theme.useToken();
    const iconSiderWidth = 60;
    const contextualPanelWidth = 280;
    const propertiesPanelWidth = 280;
    const timelineHeight = 180;
    const headerHeight = 56;

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
                        <ContextualPanel logic={logic} />
                    </Sider>
                )}

                {/* Main Application Layout */}
                <Layout style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
                    {/* Header */}
                    <Header style={{ padding: '0 16px 0 20px', height: headerHeight, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1, flexShrink: 0 }}>
                        <Space size="middle">
                            {screens.xs && <Button type="text" icon={<MenuOutlined />} onClick={logic.showMobileDrawer} style={{ color: token.colorText }} />}
                            {!screens.xs && (
                                <Space align="center">
                                    <Input variant='borderless' value={logic.projectState.projectName} onChange={e => logic.setProjectState(p => ({ ...p, projectName: e.target.value }))} style={{ fontWeight: 500, color: token.colorText, width: '150px', fontSize: '14px' }} />
                                    <Select size="small" value={`${logic.projectState.canvasDimensions.width}x${logic.projectState.canvasDimensions.height}`} disabled options={[{value: '1280x720', label: '1280x720'}, {value: '1920x1080', label: '1920x1080'}]} style={{width: 110}} />
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

                    {/* Center Area */}
                    <Layout style={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'row' }}>
                        <div style={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            {logic.editorState === 'initial' || (logic.editorState === 'uploading' && logic.projectState.mediaAssets.length === 0)
                                ? <InitialScreen logic={logic} />
                                : <PreviewArea logic={logic} />
                            }
                        </div>
                        {logic.editorState === 'editor' && !screens.xs && (
                            <Sider width={propertiesPanelWidth} theme="dark" className="properties-sider" style={{ height: '100%', overflow: 'hidden', flexShrink: 0 }}>
                                <PropertiesPanel
                                    selectedClip={logic.selectedClip}
                                    currentTime={logic.currentTime}
                                    updateSelectedClipProperty={logic.updateSelectedClipProperty}
                                    updateSelectedClipText={logic.updateSelectedClipText}
                                    addOrUpdateKeyframe={logic.addOrUpdateKeyframe}
                                    onDeleteClip={logic.handleDeleteClip}
                                />
                            </Sider>
                        )}
                    </Layout>

                    {/* Timeline Footer */}
                    {logic.editorState === 'editor' && (
                        <Footer className="timeline-footer" style={{ padding: 0, height: timelineHeight, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                            <TimelineControls logic={logic} screens={screens} />
                            <TimelineTracks logic={logic} />
                        </Footer>
                    )}
                </Layout>

                {/* Mobile Drawer */}
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
            </Layout>
        </ConfigProvider>
    );
};

export default VideoEditor;
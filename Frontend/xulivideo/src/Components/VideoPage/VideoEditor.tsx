import React, {useEffect, useRef, useState, useCallback} from 'react'; // Added useCallback
import {
    Layout, Button, Input, Select, Space, Slider,
    Typography, Grid, theme, Drawer, Upload, Tabs, Avatar, Tooltip, Dropdown,
    ConfigProvider, Switch, Card, Progress, // Ensured Progress is imported
    message, List, UploadProps, Modal, Radio, Checkbox, Spin
} from 'antd';
import type { MenuProps } from 'antd';
import Moveable from 'react-moveable';
import { fetchFile } from '@ffmpeg/util';

import {useVideoEditorLogic} from './useVideoEditorLogic';
import { formatTime, parseTimecodeToSeconds } from './utils'; // Added parseTimecodeToSeconds
import {  PREVIEW_ZOOM_FIT_MODE,
    PREVIEW_ZOOM_FILL_MODE,
    PREVIEW_ZOOM_LEVELS,} from '../../Hooks/constants';

import type { VideoEditorLogic, SubtitleEntry, MediaAsset } from './types';
import { MainMenu } from './MainMenu';
import { TextPanel } from './TextPanel';
import { PropertiesPanel } from './PropertiesPanel';
import {
    VideoCameraOutlined, FontSizeOutlined, AudioOutlined, AppstoreOutlined,
    MenuOutlined, ShareAltOutlined, DownloadOutlined, UserOutlined, SettingOutlined,
    PauseOutlined, FileImageOutlined,
    PlayCircleOutlined, SplitCellsOutlined, UndoOutlined, RedoOutlined, ZoomInOutlined,
    ZoomOutOutlined, InboxOutlined, CameraOutlined, CaretDownOutlined,
    AudioMutedOutlined, PlusOutlined,
    FullscreenOutlined,
    LockOutlined, EyeOutlined,
    DragOutlined, BgColorsOutlined as TranslationOutlinedIcon, LeftOutlined, DeleteOutlined, FileTextOutlined,QuestionCircleOutlined,
    BarsOutlined,
    EnterOutlined,
} from '@ant-design/icons';

import './videoeditor.css';

const { Header, Sider, Content, Footer } = Layout;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;
const { Dragger } = Upload;


// --- Reusable UI Components ---
const TranscriptionProgressIndicator: React.FC<{
    progress: number;
    fileName: string | null;
    themeToken: ReturnType<typeof theme.useToken>['token'];
    isTranscribingActive: boolean;
}> = ({ progress, fileName, themeToken, isTranscribingActive }) => {
    if (!isTranscribingActive) return null;

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
                            backgroundColor: themeToken.colorPrimary,
                            height: '100%',
                            width: `${progress}%`,
                            transition: 'width 0.05s linear',
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
                {fileName && progress < 100 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TranslationOutlinedIcon style={{ color: themeToken.colorPrimary }} />
                        <Text type="secondary" ellipsis style={{ flexGrow: 1, color: '#ccc' }}>
                            {fileName}
                        </Text>
                    </div>
                )}
            </div>
        </Card>
    );
};

const MediaPanelContent: React.FC<{
    logic: VideoEditorLogic;
    screens: any;
}> = ({ logic, screens }) => {
    const { token } = theme.useToken();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleAddMediaClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Title level={5} style={{ margin: '0 0 16px 0' }}>Media</Title>
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="video/*,image/*"
                multiple={true}
                onChange={logic.handleManualMediaUpload}
            />
            {logic.uploadingFile ? (
                <Card bordered={false} style={{ marginBottom: 16 }}>
                    <Space direction="vertical" align="center" style={{ width: '100%', paddingBottom: 16 }}>
                        <Title level={5} style={{ margin: 0 }}>Uploading...</Title>
                        <Progress percent={logic.uploadProgress} size="small" showInfo={true} style={{ width: '100%' }} />
                    </Space>
                    <div style={{
                        backgroundColor: '#2c2c2c', padding: '12px 16px', borderRadius: 4,
                        display: 'flex', flexDirection: 'column', gap: 12,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                            <span style={{
                                color: 'white', fontSize: 12, backgroundColor: '#1a1a1a',
                                padding: '2px 6px', borderRadius: 4, minWidth: 40, textAlign: 'center',
                            }}>
                                {logic.projectState.uploadTimeRemaining || '00:00'}
                            </span>
                            <div style={{
                                flexGrow: 1, backgroundColor: '#555', height: 5,
                                borderRadius: 2.5, overflow: 'hidden',
                            }}>
                                <div style={{
                                    backgroundColor: token.colorPrimary, height: '100%',
                                    width: `${logic.uploadProgress}%`, transition: 'width 0.1s ease-in-out',
                                }}></div>
                            </div>
                            <span style={{ fontSize: 12, color: '#ccc', minWidth: 40, textAlign: 'right' }}>
                                {Math.round(logic.uploadProgress)}%
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileTextOutlined style={{ color: token.colorPrimary }} />
                            <Text type="secondary" ellipsis style={{ flexGrow: 1, color: '#ccc' }}>
                                {typeof logic.uploadingFile === 'string'
                                    ? logic.uploadingFile
                                    : logic.uploadingFile?.name || 'Unknown file'}
                            </Text>
                        </div>
                    </div>
                </Card>
            ) : (
                <Card hoverable style={{ marginBottom: 16, cursor: 'pointer' }} onClick={handleAddMediaClick}>
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <InboxOutlined style={{ fontSize: 30, color: token.colorPrimary }} />
                        <Title level={5} style={{ margin: '8px 0 4px 0' }}>Upload Media</Title>
                        <Text type="secondary" style={{ fontSize: 12 }}>Drag and drop or click to upload videos or images</Text>
                    </div>
                </Card>
            )}
            <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                {logic.projectState.mediaAssets.length > 0 ? (
                    <List
                        itemLayout="horizontal"
                        dataSource={logic.projectState.mediaAssets}
                        renderItem={(item: MediaAsset) => (
                            <List.Item
                                key={item.id}
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
                    !logic.uploadingFile && (
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
                    <Button size="small" style={{ minWidth: 70 }}>{zoomButtonText} <CaretDownOutlined /></Button>
                </Dropdown>
                <Space></Space>

            </div>
            <div ref={logic.previewContainerRef} className="preview-container">
                <canvas
                    ref={logic.canvasRef}
                    style={{
                        display: 'block', maxWidth: '100%', maxHeight: '100%',
                        objectFit: 'contain', transformOrigin: 'center center',
                        transition: 'transform 0.1s ease-out', position: 'absolute',
                        top:'50%', left: '50%',
                        transform: `translate(-50%, -50%) scale(${logic.previewZoomLevel})`
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
                    className="preview-moveable"
                    onDrag={({target, beforeTranslate}) => {
                        if (!logic.selectedClip || !logic.previewContainerRef.current || !logic.projectState.canvasDimensions) return;
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
                        if (time > logic.projectState.totalDuration + secondsPerMajorMarker * 5 && time > (logic.currentTime / 0.8) + secondsPerMajorMarker * 5) return null;
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
                        value={logic.currentTime}
                        max={logic.projectState.totalDuration || 1}
                        min={0} step={0.001}
                        onChange={(v) => logic.handleTimelineSeek(v ?? 0)}
                        tooltip={{ open: false }}
                        railStyle={{ background: 'transparent' }}
                        style={{ position: 'absolute', top: '0px', left: 0, right: 0, margin: 0, padding: 0, height: '28px', zIndex: 28 }}
                    />
                </div>

                {subtitleTrackHeight > 0 && (
                    <div className="timeline-subtitle-track-area" style={{ height: `${subtitleTrackHeight}px`, top: '0px' }}>
                        <div className="timeline-track-header">
                            <TranslationOutlinedIcon style={{ marginRight: 4 }} /><Text>Subtitles</Text>
                        </div>
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
                                            left: `${subLeftPx}px`, width: `${Math.max(5, subWidthPx)}px`,
                                            zIndex: isCurrent ? 25 : 20, overflow: 'hidden', textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap', padding: '0 4px', lineHeight: '30px',
                                            color: 'white', fontSize: '10px', display: 'flex', alignItems: 'center',
                                            fontFamily: logic.projectState.subtitleFontFamily
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
                                                    const segments: React.ReactNode[] = [];
                                                    const segmentDuration = logic.THUMBNAIL_INTERVAL;
                                                    const segmentWidthPx = segmentDuration * pxPerSec;
                                                    let currentLeft = 0;
                                                    const sortedThumbs = [...clip.thumbnailUrls].sort((a, b) => a.time - b.time);
                                                    for (let i = 0; currentLeft < displayWidth; ++i) {
                                                        const timeInClip = i * segmentDuration;
                                                        const segmentStartTime = clip.startTime + timeInClip;
                                                        let bestThumb = sortedThumbs[0];
                                                        for(let j = sortedThumbs.length - 1; j >= 0; j--) {
                                                            if(sortedThumbs[j].time <= segmentStartTime + 0.01) {
                                                                bestThumb = sortedThumbs[j];
                                                                break;
                                                            }
                                                        }
                                                        const widthForThisSegment = Math.min(segmentWidthPx, displayWidth - currentLeft);
                                                        if (widthForThisSegment <= 0) break;
                                                        segments.push(
                                                            <div
                                                                key={`${clip.id}-thumb-${i}`}
                                                                className="clip-thumbnail-segment"
                                                                style={{
                                                                    left: `${currentLeft}px`, width: `${widthForThisSegment}px`,
                                                                    backgroundImage: bestThumb ? `url(${bestThumb.url})` : 'none',
                                                                    backgroundSize: 'cover', backgroundPosition: 'center',
                                                                    backgroundColor: '#333',
                                                                }}
                                                            />
                                                        );
                                                        currentLeft += segmentWidthPx;
                                                    }
                                                    return segments;
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
                    origin={false} edge={false}
                    draggable={true} throttleDrag={0}
                    dragTarget={logic.projectState.selectedClipId ? `#clip-${logic.projectState.selectedClipId}` : undefined}
                    resizable={true} renderDirections={["w", "e"]} keepRatio={false} throttleResize={0}
                    snappable={true} snapDirections={{ left: true, right: true }} elementSnapDirections={{ left: true, right: true }} snapThreshold={5}
                    className="timeline-moveable"
                    onDrag={({ target, beforeTranslate }) => {
                        const clipId = logic.projectState.selectedClipId;
                        const clip = logic.projectState.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
                        const isSubtitleClip = clip?.type === 'text' && logic.projectState.subtitles.some(sub => sub.id === clipId);
                        if (!clipId || isSubtitleClip) return;
                        const currentTransform = target.style.transform || '';
                        const translateYMatch = currentTransform.match(/translateY\([^)]+\)/);
                        const translateY = translateYMatch ? translateYMatch[0] : '';
                        target.style.transform = `translateX(${beforeTranslate[0]}px) ${translateY}`;
                    }}
                    onDragEnd={logic.onTimelineDragEnd}
                    onResize={({ target, width, drag, direction }) => {
                        const clipId = logic.projectState.selectedClipId;
                        const clip = logic.projectState.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
                        const isSubtitleClip = clip?.type === 'text' && logic.projectState.subtitles.some(sub => sub.id === clipId);
                        if (!clipId || isSubtitleClip) { console.warn("Attempted to resize a subtitle clip."); return; }
                        target.style.width = `${Math.max(1, width)}px`;
                        const currentTransform = target.style.transform || '';
                        const translateYMatch = currentTransform.match(/translateY\([^)]+\)/);
                        const translateY = translateYMatch ? translateYMatch[0] : '';
                        if (direction[0] === -1) {
                            target.style.transform = `translateX(${drag.beforeTranslate[0]}px) ${translateY}`;
                        } else {
                            target.style.transform = `${translateY}`;
                        }
                    }}
                    onResizeEnd={logic.onTimelineResizeEnd}
                />
            </div>
        </div>
    );
};

const InitialScreen: React.FC<{ logic: VideoEditorLogic }> = ({ logic }) => {
    const { token } = theme.useToken();
    const initialDraggerProps: UploadProps = {
        name: 'file', multiple: true, showUploadList: false, accept: "video/*,image/*,.srt,.vtt",
        customRequest: (options: any) => {
            const { file, onSuccess } = options;
            const isSubtitle = file.type === 'application/x-subrip' || file.type === 'text/vtt' || file.name.toLowerCase().endsWith('.srt') || file.name.toLowerCase().endsWith('.vtt');
            if (isSubtitle) {
                logic.handleUploadSrt(file as File)
                    .then(() => onSuccess?.({ status: 'done' }, file))
                    .catch(() => {/* error handled by handleUploadSrt */});
            } else {
                const tempEvent = {target: {files: [file], value: ''}} as unknown as React.ChangeEvent<HTMLInputElement>;
                logic.handleManualMediaUpload(tempEvent);
                if (onSuccess) onSuccess({ status: 'done' }, file);
            }
        },
        beforeUpload: (file: File) => {
            const isVideo = file.type.startsWith('video/');
            const isImage = file.type.startsWith('image/');
            const isSubtitle = file.type === 'application/x-subrip' || file.type === 'text/vtt' || file.name.toLowerCase().endsWith('.srt') || file.name.toLowerCase().endsWith('.vtt');
            if (!isVideo && !isImage && !isSubtitle) {
                message.error(`${file.name} is not a supported file type.`);
                return Upload.LIST_IGNORE;
            }
            logic.setProjectState(prev => ({
                ...prev, uploadProgress: 0, uploadingFile: file.name,
                currentUploadTaskId: `initial-upload-${Date.now()}`,
            }));
            logic.setEditorState('uploading');
            return true;
        },
        onDrop: (e) => { console.log('File(s) dropped on initial screen.'); },
    };

    return (
        <Content className="initial-screen-content" style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', flexGrow: 1 }}>
            <Card className="initial-screen-card">
                <Title level={4} style={{ marginBottom: 24, textAlign: 'center' }}>Start a new project</Title>
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
                            <p className="ant-upload-hint">Video or Image files, or Subtitles (.srt, .vtt)</p>
                        </>
                    )}
                </Dragger>
            </Card>
        </Content>
    );
}

const VideoEditor: React.FC<{ projectId: string }> = ({ projectId }) => {
    const logic: VideoEditorLogic = useVideoEditorLogic(
        projectId,
    );
    const screens = useBreakpoint();
    const { token } = theme.useToken();
    const iconSiderWidth = 60;
    const contextualPanelWidth = 350;
    const [isExportModalVisible, setIsExportModalVisible] = useState(false);
    const [selectedImageType, setSelectedImageType] = useState<'default' | 'webp'>('default');
    const [selectedGifType, setSelectedGifType] = useState<'gif' | 'webp'>('gif');
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [removeColorOnExport, setRemoveColorOnExport] = useState(false);

    // --- NEW STATE FOR EXPORT TIMING ---
    const [exportStartTime, setExportStartTime] = useState(0); // in seconds
    const [exportEndTime, setExportEndTime] = useState(0); // in seconds
    const [currentVideoAssetDuration, setCurrentVideoAssetDuration] = useState(0);
    // --- END NEW STATE ---


    const [availableLanguages, setAvailableLanguages] = useState<{ value: string; label: string }[]>([]);
    const [languagesLoading, setLanguagesLoading] = useState<boolean>(false);
    const [selectedOriginalLanguage, setSelectedOriginalLanguage] = useState<string | undefined>(undefined);
    const [hoveredSubtitleGapIndex, setHoveredSubtitleGapIndex] = useState<number | null>(null);
    const {
        selectedVideoSecureUrl,
            handleExtractAudio,
            isExtractingAudio,
            audioExtractionProgress,
            ffmpegLoaded,

    } = logic;

    const srtUploadButtonProps: UploadProps = {
        name: 'file', multiple: false, accept: '.srt,.vtt', showUploadList: false,
        customRequest: (options: any) => {
            if (options.file) {
                logic.handleUploadSrt(options.file as File)
                    .then(() => {
                        options.onSuccess?.({}, new XMLHttpRequest());
                    })
                    .catch((err) => {
                        options.onError?.(err instanceof Error ? err : new Error("SRT processing failed"));
                    });
            } else {
                options.onError?.(new Error("No file provided"));
            }
        },
        beforeUpload: (file: File) => {
            const isSrtOrVtt = file.name.endsWith('.srt') || file.name.endsWith('.vtt');
            if (!isSrtOrVtt) {
                message.error(`${file.name} is not an SRT or VTT file`);
            }
            return isSrtOrVtt || Upload.LIST_IGNORE;
        },
    };

    const activeSubtitleInList = logic.projectState.subtitles.find(sub =>
        logic.currentTime >= sub.startTime && logic.currentTime < sub.endTime
    );

    const getFirstVideoAssetDuration = useCallback(() => {
        const firstVideoAsset = logic.projectState.mediaAssets.find(
            asset => asset.type.startsWith('video/') && asset.secureUrl
        );
        if (firstVideoAsset?.secureUrl) {
            // Attempt to get duration from a media element if available, otherwise use project total duration
            const mediaElement = logic.mediaElementsRef.current?.[firstVideoAsset.id] as HTMLVideoElement;
            if (mediaElement && mediaElement.duration && isFinite(mediaElement.duration)) {
                return mediaElement.duration;
            }
        }
        return logic.projectState.totalDuration; // Fallback
    }, [logic.projectState.mediaAssets, logic.projectState.totalDuration, logic.mediaElementsRef]);


    const showExportModal = () => {
        const duration = getFirstVideoAssetDuration();
        setExportStartTime(0);
        setExportEndTime(duration);
        setCurrentVideoAssetDuration(duration);
        setIsExportModalVisible(true);
        setExportProgress(0); // Reset progress when modal opens
    };

    const handleExportModalCancel = () => {
        setIsExportModalVisible(false);
        // Optionally reset states if export was in progress but cancelled
        if (isExporting || logic.isDesaturating) {
            setIsExporting(false);
            // Note: logic.isDesaturating is handled by its own hook, might need a cancel mechanism there if complex
            setExportProgress(0);
            message.info("Export cancelled.");
        }
    };

    const handleExportModalOk = async () => {
        if (!logic.ffmpegLoaded || !logic.ffmpegRef.current) {
            message.error("FFmpeg is not loaded. Cannot process export.");
            if (!logic.ffmpegLoaded) logic.loadFFmpeg();
            return;
        }
        if (isExporting || logic.isDesaturating) { // Check both states
            message.warning("An export or processing operation is already in progress.");
            return;
        }

        const firstVideoAsset = logic.projectState.mediaAssets.find(
            asset => asset.type.startsWith('video/') && asset.secureUrl
        );

        if (!firstVideoAsset?.secureUrl) {
            message.error('No video asset with a secure URL found to export.');
            // setIsExportModalVisible(false); // Keep modal open to show error
            return;
        }

        // Set loading state based on operation type
        if (removeColorOnExport) {
            // logic.isDesaturating will be set by handleDesaturateVideoSegment
            // No need to set isExporting here
        } else {
            setIsExporting(true);
        }
        setExportProgress(0); // Ensure progress starts from 0

        message.info("Starting export process...");

        const ffmpeg = logic.ffmpegRef.current;
        const inputVideoName = `input_${Date.now()}.${firstVideoAsset.secureUrl.split('.').pop() || 'mp4'}`;
        const outputBaseName = logic.projectState.projectName.replace(/\s+/g, '_') || `export_${Date.now()}`;

        const progressCallback = ({ progress }: { progress: number; time?: number }) => {
            setExportProgress(Math.round(progress * 100));
        };

        try {
            if (removeColorOnExport) {
                message.info(`Preparing to desaturate and trim video segment (${formatTime(exportStartTime)} to ${formatTime(exportEndTime)}).`);
                // handleDesaturateVideoSegment will manage its own logic.isDesaturating and logic.desaturationProgress states.
                await logic.handleDesaturateVideoSegment(firstVideoAsset.secureUrl, exportStartTime, exportEndTime);
                message.success("Desaturated video segment processed and downloaded.");
            } else {
                // Standard export
                setIsExporting(true); // Ensure this is set for standard export
                message.info(`Fetching video: ${firstVideoAsset.name}`);
                await ffmpeg.writeFile(inputVideoName, await fetchFile(firstVideoAsset.secureUrl));
                message.info("Video loaded into FFmpeg.");
                ffmpeg.on('progress', progressCallback);

                const outputVideoName = `${outputBaseName}_video.mp4`;
                const videoExportArgs: string[] = ['-i', inputVideoName];
                const isTrimmed = exportStartTime > 0 || exportEndTime < currentVideoAssetDuration;

                if (isTrimmed) {
                    message.info(`Trimming video from ${formatTime(exportStartTime, true)} to ${formatTime(exportEndTime, true)}.`);
                    videoExportArgs.push('-ss', formatTime(exportStartTime, true));
                    videoExportArgs.push('-to', formatTime(exportEndTime, true));
                }
                if (isTrimmed) {
                    videoExportArgs.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-c:a', 'aac', '-b:a', '128k');
                } else {
                    videoExportArgs.push('-c', 'copy');
                }
                videoExportArgs.push('-movflags', '+faststart', outputVideoName);

                message.info(`Processing video: ${outputVideoName}`);
                await ffmpeg.exec(videoExportArgs);
                // Progress should be 100 here
                message.success("Video processing complete.");

                const videoData = await ffmpeg.readFile(outputVideoName);
                const videoBlob = new Blob([videoData], { type: 'video/mp4' });
                const videoDownloadUrl = URL.createObjectURL(videoBlob);
                const videoLink = document.createElement('a');
                videoLink.href = videoDownloadUrl; videoLink.download = outputVideoName;
                document.body.appendChild(videoLink); videoLink.click();
                document.body.removeChild(videoLink); URL.revokeObjectURL(videoDownloadUrl);
                message.success(`Video "${outputVideoName}" downloaded.`);
                await ffmpeg.deleteFile(outputVideoName);


                // Image and GIF export
                const sourceForSnapshots = firstVideoAsset.secureUrl;
                // Check if inputVideoName still exists in FFmpeg FS, or if it was deleted (e.g. if trimming created an intermediate)
                // For simplicity, assume inputVideoName for trimming was the main outputVideoName, which was deleted.
                // So, re-fetch or use the original inputVideoName if it wasn't the one processed and deleted.
                // The current logic uses a fresh inputVideoName and deletes it. If snapshots need the *trimmed* video,
                // the outputVideoName from trimming should be the input here.
                // This part assumes snapshots from original if not trimmed, or would need more complex file management.

                // Re-writing the input file for snapshots if it was deleted or is different
                // This check logic was for when inputVideoName might persist; now it's usually deleted after video processing.
                // So, we always write it if we need it for snapshots/GIFs.
                await ffmpeg.writeFile(inputVideoName, await fetchFile(sourceForSnapshots));


                let imageOutputName = ''; let imageMimeType = '';
                const imageExportArgs: string[] = ['-i', inputVideoName, '-ss', '00:00:01', '-frames:v', '1'];
                if (selectedImageType === 'webp') {
                    imageOutputName = `${outputBaseName}_snapshot.webp`; imageMimeType = 'image/webp';
                    imageExportArgs.push('-c:v', 'libwebp', '-lossless', '0', '-q:v', '75', imageOutputName);
                } else {
                    imageOutputName = `${outputBaseName}_snapshot.jpg`; imageMimeType = 'image/jpeg';
                    imageExportArgs.push('-c:v', 'mjpeg', '-q:v', '4', imageOutputName);
                }
                if (imageOutputName) {
                    await ffmpeg.exec(imageExportArgs);
                    const imageData = await ffmpeg.readFile(imageOutputName); // Read before delete
                    await ffmpeg.deleteFile(imageOutputName); // Delete from FS
                    const imageBlob = new Blob([imageData], { type: imageMimeType });
                    const imageDownloadUrl = URL.createObjectURL(imageBlob);
                    const imageLink = document.createElement('a');
                    imageLink.href = imageDownloadUrl; imageLink.download = imageOutputName;
                    document.body.appendChild(imageLink); imageLink.click();
                    document.body.removeChild(imageLink); URL.revokeObjectURL(imageDownloadUrl);
                    message.success(`Snapshot "${imageOutputName}" downloaded.`);
                }

                let animOutputName = ''; let animMimeType = '';
                const animExportArgsBase: string[] = ['-i', inputVideoName, '-t', '5', '-vf', 'fps=15,scale=320:-1:flags=lanczos'];
                let finalAnimExportArgs = [...animExportArgsBase];
                if (selectedGifType === 'webp') {
                    animOutputName = `${outputBaseName}_animation.webp`; animMimeType = 'image/webp';
                    finalAnimExportArgs.push('-c:v', 'libwebp', '-loop', '0', '-lossless', '0', '-q:v', '70', '-preset', 'picture', animOutputName);
                } else {
                    animOutputName = `${outputBaseName}_animation.gif`; animMimeType = 'image/gif';
                    const paletteName = 'palette.png';
                    await ffmpeg.exec(['-i', inputVideoName, '-t', '5', '-vf', `fps=15,scale=320:-1:flags=lanczos,palettegen`, '-y', paletteName]);
                    finalAnimExportArgs.push('-i', paletteName, '-lavfi', 'fps=15,scale=320:-1:flags=lanczos [x]; [x][1:v] paletteuse', animOutputName);
                }
                if (animOutputName) {
                    await ffmpeg.exec(finalAnimExportArgs);
                    const animData = await ffmpeg.readFile(animOutputName); // Read before delete
                    await ffmpeg.deleteFile(animOutputName); // Delete from FS
                    if (selectedGifType === 'gif') await ffmpeg.deleteFile('palette.png');

                    const animBlob = new Blob([animData], { type: animMimeType });
                    const animDownloadUrl = URL.createObjectURL(animBlob);
                    const animLink = document.createElement('a');
                    animLink.href = animDownloadUrl; animLink.download = animOutputName;
                    document.body.appendChild(animLink); animLink.click();
                    document.body.removeChild(animLink); URL.revokeObjectURL(animDownloadUrl);
                    message.success(`Animation "${animOutputName}" downloaded.`);
                }
                await ffmpeg.deleteFile(inputVideoName); // Clean up the snapshot/GIF input
            }
        } catch (error) {
            console.error("Error during FFmpeg export:", error);
            message.error(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            ffmpeg.off('progress', progressCallback);
            setIsExporting(false);
            // logic.isDesaturating is handled by its own hook and will also turn false

            // Don't reset exportProgress here if we want the 100% to show before modal closes.
            // However, the modal closes immediately after these states turn false.
            // Resetting for the next modal open is good.
            // setExportProgress(0); // Will be reset on next modal open via showExportModal

            // Modal will close once isExporting and logic.isDesaturating are false,
            // due to confirmLoading={isExporting || logic.isDesaturating} and Spin's behavior
            // Or explicitly:
            setIsExportModalVisible(false);
        }
    };

    const handleTimeInputChange = (value: string, type: 'start' | 'end') => {
        let seconds = 0;
        const parts = value.replace(',', '.').split(':');
        if (parts.length === 2) {
            seconds = parseTimecodeToSeconds(`00:${value}`);
        } else if (parts.length === 3) {
            seconds = parseTimecodeToSeconds(value);
        } else {
            return;
        }
        if (isNaN(seconds)) seconds = 0;
        if (type === 'start') {
            setExportStartTime(Math.max(0, Math.min(seconds, exportEndTime, currentVideoAssetDuration)));
        } else {
            setExportEndTime(Math.max(exportStartTime, Math.min(seconds, currentVideoAssetDuration)));
        }
    };


    useEffect(() => {
        const fetchLanguages = async () => {
            setLanguagesLoading(true);
            try {
                const response = await fetch('https://restcountries.com/v3.1/all?fields=languages,cca2,name');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const countriesData = await response.json();
                const languageMap = new Map<string, string>();
                countriesData.forEach((country: any) => {
                    if (country.languages) {
                        Object.entries(country.languages).forEach(([code, name]) => {
                            if (typeof name === 'string' && !languageMap.has(code)) {
                                languageMap.set(code, name);
                            }
                        });
                    }
                });
                const formattedLanguages = Array.from(languageMap.entries())
                    .map(([code, name]) => ({ value: code, label: `${name} (${code})` }))
                    .sort((a, b) => a.label.localeCompare(b.label));
                const ensureSpecificLanguage = (langCode: string, langName: string, currentLangs: typeof formattedLanguages) => {
                    if (!currentLangs.some(l => l.value === langCode)) {
                        currentLangs.unshift({ value: langCode, label: `${langName} (${langCode})`});
                    }
                };
                ensureSpecificLanguage('en', 'English', formattedLanguages);
                ensureSpecificLanguage('vi', 'Vietnamese', formattedLanguages);
                setAvailableLanguages([{ value: 'auto', label: 'Auto Detect' }, ...formattedLanguages]);
                setSelectedOriginalLanguage('auto');
            } catch (error) {
                console.error("Failed to fetch languages:", error);
                message.error("Could not load languages for translation.");
                setAvailableLanguages([{ value: 'auto', label: 'Auto Detect' }, { value: 'en', label: 'English (en)' }, { value: 'vi', label: 'Vietnamese (vi)' }]);
                setSelectedOriginalLanguage('auto');
            } finally {
                setLanguagesLoading(false);
            }
        };
        fetchLanguages();
    }, []);

    const currentOperationInProgress = isExporting || logic.isDesaturating;
    const currentProgressValue = isExporting ? exportProgress : logic.desaturationProgress;
    const operationIsDone = (isExporting && exportProgress === 100) || (logic.isDesaturating && logic.desaturationProgress === 100);


    return (
        <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#7B61FF', motion: false } }}>
            <Layout className="video-editor-layout" style={{ minHeight: '100vh', overflow: 'hidden' }}>
                {/* ... Sider and other layout components ... */}
                {!screens.xs && (
                    <Sider collapsed={true} width={iconSiderWidth} collapsedWidth={iconSiderWidth} theme="dark" className="icon-sider" style={{ zIndex: 3, height: '100vh' }}>
                        <div style={{height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8}}>
                            <Button type="text" icon={<LeftOutlined />} style={{color: token.colorTextSecondary}} disabled />
                        </div>
                        <MainMenu selectedKey={logic.selectedMenuKey} onClick={logic.handleMenuClick} mode="inline" />
                        <div style={{ position: 'absolute', bottom: 16, width: '100%', textAlign: 'center' }}>
                            <Tooltip placement="right" title="Settings (Placeholder)"><Button type="text" shape="circle" icon={<SettingOutlined />} disabled style={{color: token.colorTextSecondary}} /></Tooltip>
                        </div>
                    </Sider>
                )}
                {(logic.selectedMenuKey !== 'settings_footer' && !screens.xs) && (
                    <Sider width={contextualPanelWidth} theme="dark" className="contextual-sider" style={{ height: '100vh', overflow: 'hidden', zIndex: 2 }}>
                        <div className="contextual-panel-content-area">
                            {logic.selectedMenuKey === 'media' && (<MediaPanelContent logic={logic} screens={screens} />)}
                            {logic.selectedMenuKey === 'text' && (<TextPanel onAddTextClip={logic.handleAddTextClip} />)}
                            {logic.selectedMenuKey === 'subtitles' && (
                                <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    {logic.isTranscribing ? (
                                        <TranscriptionProgressIndicator
                                            progress={logic.transcriptionProgress}
                                            fileName={logic.transcribingFileName}
                                            themeToken={token}
                                            isTranscribingActive={logic.isTranscribing}
                                        />
                                    ) : (
                                        <>
                                            {logic.projectState.subtitles && logic.projectState.subtitles.length > 0 ? (
                                                <>
                                                    <div style={{marginBottom: 12, display: 'flex', flexDirection: 'column'}}>
                                                        <Title level={5} style={{ margin: '0 0 8px 0' }}>Subtitles</Title>
                                                        <div style={{ marginBottom: 16, padding: '8px 0', borderTop: `1px solid ${token.colorBorderSecondary}`, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                                                            <div style={{ marginBottom: 12 }}>
                                                                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Font Family</Text>
                                                                <Select
                                                                    value={logic.projectState.subtitleFontFamily}
                                                                    onChange={logic.updateSubtitleFontFamily}
                                                                    style={{ width: '100%' }} size="small"
                                                                    options={[
                                                                        { value: 'Arial, sans-serif', label: 'Arial' }, { value: 'Verdana, sans-serif', label: 'Verdana' },
                                                                        { value: 'Tahoma, sans-serif', label: 'Tahoma' }, { value: 'Georgia, serif', label: 'Georgia' },
                                                                        { value: 'Times New Roman, serif', label: 'Times New Roman' }, { value: 'Courier New, monospace', label: 'Courier New' },
                                                                        { value: 'Lucida Sans Unicode, Lucida Grande, sans-serif', label: 'Lucida Sans' }
                                                                    ]}
                                                                />
                                                            </div>
                                                            <div>
                                                                <Space size="small" style={{ width: '100%', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                    <Text type="secondary" style={{ fontSize: 12 }}>Font Size</Text>
                                                                    <Text strong style={{ fontSize: 12 }}>{logic.projectState.subtitleFontSize}</Text>
                                                                </Space>
                                                                <Slider
                                                                    min={10} max={100} step={1} value={logic.projectState.subtitleFontSize}
                                                                    onChange={logic.updateSubtitleFontSize} tooltip={{ open: false }}
                                                                    style={{ margin: '0px 0 8px 0', padding: 0 }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                                                        <List
                                                            itemLayout="vertical"
                                                            dataSource={logic.projectState.subtitles}
                                                            split={false}
                                                            renderItem={(item: SubtitleEntry, index: number) => {
                                                                const nextItem = logic.projectState.subtitles[index + 1];
                                                                const canMerge = !!nextItem;
                                                                const isThisGapHovered = hoveredSubtitleGapIndex === index;

                                                                return (
                                                                    <React.Fragment key={`${item.id}-frag`}>
                                                                        <List.Item
                                                                            className={`subtitle-list-item ${activeSubtitleInList?.id === item.id ? 'active' : ''}`}
                                                                            onClick={() => logic.handleTimelineSeek(item.startTime)}
                                                                            style={{
                                                                                cursor: 'pointer',
                                                                                borderBottom: 'none',
                                                                                padding: '8px 16px',
                                                                            }}
                                                                        >
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: token.colorTextSecondary, marginBottom: 4 }}>
                                                                                <span>{formatTime(item.startTime).slice(0, -1)}</span>
                                                                                <span>{formatTime(item.endTime).slice(0, -1)}</span>
                                                                            </div>
                                                                            <div style={{fontSize: '14px', color: token.colorText, whiteSpace: 'pre-wrap', fontFamily: logic.projectState.subtitleFontFamily }}>{item.text}</div>
                                                                        </List.Item>

                                                                        {index < logic.projectState.subtitles.length - 1 && (
                                                                            <div
                                                                                style={{
                                                                                    height: '25px',
                                                                                    position: 'relative',
                                                                                    margin: '0 16px',
                                                                                }}
                                                                                onMouseEnter={() => setHoveredSubtitleGapIndex(index)}
                                                                                onMouseLeave={() => setHoveredSubtitleGapIndex(null)}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                {isThisGapHovered ? (
                                                                                    <Space
                                                                                        style={{
                                                                                            position: 'absolute',
                                                                                            top: '50%',
                                                                                            left: '50%',
                                                                                            transform: 'translate(-50%, -50%)',
                                                                                            backgroundColor: token.colorBgElevated,
                                                                                            padding: '2px 6px',
                                                                                            borderRadius: token.borderRadiusSM,
                                                                                            boxShadow: token.boxShadowTertiary,
                                                                                            zIndex: 5,
                                                                                        }}
                                                                                    >

                                                                                        {canMerge && (
                                                                                            <Button
                                                                                                type="text"
                                                                                                size="small"
                                                                                                style={{ fontSize: '11px', padding: '0 5px', color: token.colorTextSecondary }}
                                                                                                icon={<BarsOutlined rotate={90} style={{ fontSize: '11px', marginRight: '3px' }} />}
                                                                                                onClick={() => {
                                                                                                    logic.handleMergeSubtitles(item.id);
                                                                                                    setHoveredSubtitleGapIndex(null);
                                                                                                }}
                                                                                            >
                                                                                                Merge Lines
                                                                                            </Button>
                                                                                        )}
                                                                                    </Space>
                                                                                ) : (
                                                                                    <div style={{
                                                                                        height: '1px',
                                                                                        backgroundColor: token.colorBorderSecondary,
                                                                                        position: 'absolute',
                                                                                        top: '50%', left: 0, right: 0,
                                                                                        transform: 'translateY(-50%)'
                                                                                    }} />
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {index === logic.projectState.subtitles.length - 1 && (
                                                                            <div style={{ height: '1px', backgroundColor: token.colorBorderSecondary, margin: '8px 16px 0 16px' }} />
                                                                        )}
                                                                    </React.Fragment>
                                                                );
                                                            }}
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

                                                    <div style={{ opacity: logic.isTranscribing ? 0.5 : 1, pointerEvents: logic.isTranscribing ? 'none' : 'auto' }}>
                                                        <Card bodyStyle={{ padding: 0 }}>
                                                            <div style={{ padding: '16px' }}>
                                                                <div style={{ marginBottom: '20px' }}>
                                                                    <Space align="center"  style={{ width: '100%', marginBottom: '8px' }}>
                                                                        <Text style={{ color: token.colorText }}>Original language</Text>
                                                                        <Tooltip title="Select the original language of the video or choose auto-detect.">
                                                                            <QuestionCircleOutlined style={{ color: token.colorTextSecondary, cursor: 'pointer' }} />
                                                                        </Tooltip>
                                                                    </Space>
                                                                    <Select
                                                                        placeholder="Auto detect"
                                                                        style={{ width: '100%' }}
                                                                        options={availableLanguages}
                                                                        loading={languagesLoading}
                                                                        disabled={logic.isTranscribing || languagesLoading || !logic.selectedVideoSecureUrl}
                                                                        value={selectedOriginalLanguage}
                                                                        onChange={(value) => setSelectedOriginalLanguage(value)}
                                                                        showSearch
                                                                        filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                                                        notFoundContent={languagesLoading ? <Spin size="small" /> : "No languages found"}
                                                                    />
                                                                    {!logic.selectedVideoSecureUrl && <Text type="danger" style={{fontSize: 12, display: 'block', marginTop: 4}}>Select a video clip first.</Text>}
                                                                </div>
                                                                <div style={{ marginBottom: '10px' }}>
                                                                </div>
                                                                <Button
                                                                    type="primary" block
                                                                    style={{ marginBottom: '12px', backgroundColor: '#18D2D3', borderColor: '#18D2D3', color: '#000000' }}
                                                                    onClick={() => {
                                                                        if (!logic.selectedVideoSecureUrl) { message.error("Please select a video clip from the timeline first."); return; }
                                                                        const langToUse = selectedOriginalLanguage === 'vi' ? 'vi' : (selectedOriginalLanguage || 'auto');
                                                                        logic.handleStartFromScratch({ language: langToUse, translate: false });
                                                                    }}
                                                                    disabled={logic.isTranscribing || !logic.selectedVideoSecureUrl}
                                                                > Auto Subtitle </Button>
                                                                <Button
                                                                    type="primary" block
                                                                    style={{ backgroundColor: '#18D2D3', borderColor: '#18D2D3', color: '#000000' }}
                                                                    onClick={() => {
                                                                        if (!logic.selectedVideoSecureUrl) { message.error("Please select a video clip from the timeline first."); return; }
                                                                        logic.handleStartFromScratch({ language: 'en', translate: true });
                                                                    }}
                                                                    disabled={logic.isTranscribing || !logic.selectedVideoSecureUrl}
                                                                > Translate </Button>
                                                            </div>
                                                        </Card>
                                                    </div>
                                                </>
                                            )}
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

                <Layout style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: 180 }}>
                    <Header style={{ padding: '0 16px 0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1, flexShrink: 0 }}>
                        <Space size="middle">
                            {screens.xs && <Button type="text" icon={<MenuOutlined />} onClick={logic.showMobileDrawer} style={{ color: token.colorText }} />}
                            {!screens.xs && (
                                <Space align="center">
                                    <Input variant='borderless' value={logic.projectState.projectName} onChange={e => logic.setProjectState(p => ({ ...p, projectName: e.target.value }))} style={{ fontWeight: 500, color: token.colorText, width: '150px', fontSize: '14px' }} />
                                    <Select
                                        size="small" value={`${logic.projectState.canvasDimensions.width}x${logic.projectState.canvasDimensions.height}`}
                                        onChange={(value) => {
                                            const [widthStr, heightStr] = value.split('x');
                                            const width = parseInt(widthStr, 10); const height = parseInt(heightStr, 10);
                                            if (!isNaN(width) && !isNaN(height)) {
                                                logic.setProjectState(prev => ({ ...prev, canvasDimensions: { width, height } }));
                                            }
                                        }}
                                        options={[
                                            { value: '1280x720', label: '1280x720 (16:9)' }, { value: '1920x1080', label: '1920x1080 (16:9)' },
                                            { value: '1080x1920', label: '1080x1920 (9:16)' }, { value: '1080x1080', label: '1080x1080 (1:1)' },
                                        ]}
                                        style={{width: 140}}
                                    />
                                </Space>
                            )}
                        </Space>
                        <Button onClick={showExportModal} icon={<DownloadOutlined />}>
                            Export Options
                        </Button>
                        <Space size="middle" style={{marginRight:'30px'}}>
                            <Button
                                type="primary" size="small" onClick={logic.handleBurnSubtitlesWithFFmpeg}
                                disabled={
                                    logic.isBurningSubtitles ||
                                    !logic.projectState.subtitles ||
                                    logic.projectState.subtitles.length === 0 ||
                                    !logic.selectedVideoSecureUrl ||
                                    !logic.ffmpegLoaded
                                }
                                loading={logic.isBurningSubtitles}
                            >
                                {logic.isBurningSubtitles ? `Burning... ${logic.burningProgress}%` : 'Burn Subtitles'}
                            </Button>

                        </Space>
                    </Header>
                    <Modal
                        title="Export Project Settings"
                        open={isExportModalVisible}
                        onOk={handleExportModalOk}
                        onCancel={handleExportModalCancel}
                        okText="Start Export"
                        cancelText="Cancel"
                        confirmLoading={currentOperationInProgress} // Use combined loading state
                        width={600}
                        maskClosable={!currentOperationInProgress} // Prevent closing mask during export
                        keyboard={!currentOperationInProgress} // Prevent Esc key during export
                    >
                        <Spin
                            spinning={currentOperationInProgress}
                            tip={isExporting ? `Exporting... ${exportProgress}%` : (logic.isDesaturating ? `Processing... ${logic.desaturationProgress}%` : 'Processing...')}
                        >
                            {currentOperationInProgress && (
                                <Progress
                                    percent={currentProgressValue}
                                    status={operationIsDone ? "success" : "active"}
                                    style={{ marginBottom: 20 }}
                                    showInfo={true} // Explicitly show info, though tip on Spin also shows it
                                />
                            )}
                            <Space direction="vertical" size="large" style={{ width: '100%', marginTop: currentOperationInProgress ? 8 : 20 }}>
                                <Card size="small" title="Timing">
                                    <Space align="start" style={{ width: '100%' }} >
                                        <div style={{ flex: 1, textAlign: 'center' }}>
                                            <Text>Start</Text>
                                            <Input
                                                value={formatTime(exportStartTime)}
                                                onChange={(e) => handleTimeInputChange(e.target.value, 'start')}
                                                style={{ textAlign: 'center', fontFamily: 'monospace', margin: '8px 0' }}
                                                placeholder="MM:SS.mmm"
                                                disabled={currentOperationInProgress}
                                            />
                                            <Button type="link" size="small" onClick={() => setExportStartTime(0)} disabled={currentOperationInProgress}>
                                                Set to video start
                                            </Button>
                                        </div>
                                        <div style={{ flex: 1, textAlign: 'center' }}>
                                            <Text>End</Text>
                                            <Input
                                                value={formatTime(exportEndTime)}
                                                onChange={(e) => handleTimeInputChange(e.target.value, 'end')}
                                                style={{ textAlign: 'center', fontFamily: 'monospace', margin: '8px 0' }}
                                                placeholder="MM:SS.mmm"
                                                disabled={currentOperationInProgress}
                                            />
                                            <Button type="link" size="small" onClick={() => setExportEndTime(currentVideoAssetDuration)} disabled={currentOperationInProgress}>
                                                Set to video end
                                            </Button>
                                        </div>
                                    </Space>
                                    <Text type="secondary" style={{display: 'block', textAlign: 'center', marginTop: '8px'}}>
                                        Selected duration: {formatTime(Math.max(0, exportEndTime - exportStartTime))}
                                    </Text>
                                </Card>

                                <Card size="small" title="Video Options">
                                    <Checkbox
                                        checked={removeColorOnExport}
                                        onChange={(e) => setRemoveColorOnExport(e.target.checked)}
                                        disabled={currentOperationInProgress}
                                    >
                                        Remove Color (Desaturate Video Segment)
                                    </Checkbox>
                                    <Text type="secondary" style={{ display: 'block', marginLeft: 24, marginTop: 4 }}>
                                        Exports the selected video segment in black and white. This will re-encode the segment.
                                    </Text>
                                </Card>

                                <Card size="small" title="Snapshot & Animation Options (from original video)">
                                    <div>
                                        <Text strong>Image type:</Text>
                                        <Radio.Group
                                            onChange={(e) => setSelectedImageType(e.target.value)}
                                            value={selectedImageType}
                                            style={{ marginLeft: 8 }}
                                            optionType="button"
                                            buttonStyle="solid"
                                            disabled={currentOperationInProgress || removeColorOnExport}
                                        >
                                            <Radio.Button value="default">Default</Radio.Button>
                                            <Radio.Button value="webp">WEBP</Radio.Button>
                                        </Radio.Group>
                                    </div>
                                    <div style={{marginTop: 16}}>
                                        <Text strong>GIF type:</Text>
                                        <Radio.Group
                                            onChange={(e) => setSelectedGifType(e.target.value)}
                                            value={selectedGifType}
                                            style={{ marginLeft: 8 }}
                                            optionType="button"
                                            buttonStyle="solid"
                                            disabled={currentOperationInProgress || removeColorOnExport}
                                        >
                                            <Radio.Button value="webp">WEBP</Radio.Button>
                                            <Radio.Button value="gif">GIF</Radio.Button>
                                        </Radio.Group>
                                    </div>
                                    {removeColorOnExport && <Text type="secondary" style={{display: 'block', marginTop: 8}}>Snapshots and animations are disabled when "Remove Color" is selected, as the desaturated segment is the primary output.</Text>}
                                </Card>
                            </Space>
                        </Spin>
                    </Modal>

                    <Layout style={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'row', marginRight: screens.xs ? 0 : '10px' }}>
                        <Content style={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', marginRight: screens.xs ? 0 : '10px' }}>
                            {(logic.projectState.mediaAssets.length === 0 && !logic.uploadingFile)
                                ? <InitialScreen logic={logic} />
                                : <PreviewArea logic={logic} />
                            }
                        </Content>
                        {(logic.editorState === 'editor' || logic.isTranscribing) && !screens.xs && (
                            <Sider width={340} theme="dark" className="properties-sider" style={{ height: '100%', overflow: 'auto', flexShrink: 0, padding: '16px',marginRight: '-15px' }}>
                                <PropertiesPanel
                                    selectedClip={logic.selectedClip} currentTime={logic.currentTime}
                                    updateSelectedClipProperty={logic.updateSelectedClipProperty}
                                    updateSelectedClipText={logic.updateSelectedClipText}
                                    addOrUpdateKeyframe={logic.addOrUpdateKeyframe}
                                    onDeleteClip={logic.handleDeleteClip}
                                    subtitleFontFamily={logic.projectState.subtitleFontFamily}
                                    updateSubtitleFontFamily={logic.updateSubtitleFontFamily}
                                    subtitleFontSize={logic.projectState.subtitleFontSize}
                                    updateSubtitleFontSize={logic.updateSubtitleFontSize}
                                    subtitleTextAlign={logic.projectState.subtitleTextAlign as 'left' | 'center' | 'right'}
                                    updateSubtitleTextAlign={logic.updateSubtitleTextAlign}
                                    isSubtitleBold={logic.projectState.isSubtitleBold} toggleSubtitleBold={logic.toggleSubtitleBold}
                                    isSubtitleItalic={logic.projectState.isSubtitleItalic} toggleSubtitleItalic={logic.toggleSubtitleItalic}
                                    isSubtitleUnderlined={logic.projectState.isSubtitleUnderlined} toggleSubtitleUnderlined={logic.toggleSubtitleUnderlined}
                                    subtitleColor={logic.projectState.subtitleColor} updateSubtitleColor={logic.updateSubtitleColor}
                                    subtitleBackgroundColor={logic.projectState.subtitleBackgroundColor} updateSubtitleBackgroundColor={logic.updateSubtitleBackgroundColor}
                                    selectedVideoSecureUrl={selectedVideoSecureUrl}
                                    handleExtractAudio={handleExtractAudio}
                                    isExtractingAudio={isExtractingAudio}
                                    audioExtractionProgress={audioExtractionProgress}
                                    ffmpegLoaded={ffmpegLoaded}
                                />
                            </Sider>
                        )}
                    </Layout>

                    {(logic.editorState === 'editor' || logic.isTranscribing) && (
                        <Footer className="timeline-footer" style={{ padding: 0, height: 180, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                            <TimelineControls logic={logic} screens={screens} />
                            <TimelineTracks logic={logic} />
                        </Footer>
                    )}
                </Layout>

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
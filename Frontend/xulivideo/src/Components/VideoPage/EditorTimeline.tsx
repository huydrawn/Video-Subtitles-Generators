import React from 'react';
import {
    Layout, Button, Input, Select, Space, Slider,
    Typography, Tooltip, Switch,
} from 'antd';
import Moveable from 'react-moveable';
import {
    AudioOutlined,
    PauseOutlined,
    PlayCircleOutlined, SplitCellsOutlined, UndoOutlined, RedoOutlined, ZoomInOutlined,
    ZoomOutOutlined, AudioMutedOutlined, PlusOutlined,
    LockOutlined, EyeOutlined, BgColorsOutlined as TranslationOutlinedIcon, FileImageOutlined,
    VideoCameraOutlined, FontSizeOutlined
} from '@ant-design/icons';
import { theme } from 'antd'; // Import theme here as well

// Adjust paths to your utility and types files
import { formatTime, getKapwingTimelineLabelInterval, formatRulerTimeForDynamicLabels } from './utils';
import type { VideoEditorLogic } from './types';

const { Title, Text, Paragraph } = Typography;


// --- Helper Components (internal to this file) ---

const TimelineControls: React.FC<{ logic: VideoEditorLogic, screens: any }> = ({ logic, screens }) => {
    const { token } = theme.useToken();
    return (
        <div
            className="timeline-controls"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: screens.xs ? '4px' : '10px'
            }}
        >
            <Space>
                <Button
                    shape="circle"
                    icon={logic.projectState.isPlaying ? <PauseOutlined /> : <PlayCircleOutlined />}
                    onClick={logic.handlePlayPause}
                />
                <Tooltip title={logic.projectState.isPreviewMuted ? "Unmute" : "Mute"}>
                    <Button
                        shape="circle"
                        icon={logic.projectState.isPreviewMuted ? <AudioMutedOutlined /> : <AudioOutlined />}
                        onClick={logic.toggleMutePreview}
                    />
                </Tooltip>
            </Space>
            <Text className="timeline-timecode">{formatTime(logic.currentTime)}</Text>
            <Text className="timeline-duration">/ {formatTime(logic.projectState.totalDuration)}</Text>
            <Select
                value={logic.projectState.playbackRate}
                onChange={logic.handlePlaybackRateChange}
                size="small"
                style={{ width: 65 }}
                options={logic.PLAYBACK_RATES.map(r => ({ value: r, label: `${r}x` }))}
            />
            <Button size="small" icon={<SplitCellsOutlined />} disabled>Split</Button>
            <Button size="small" icon={<UndoOutlined />} disabled>Undo</Button>
            <Button size="small" icon={<RedoOutlined />} disabled>Redo</Button>
            <div style={{ flexGrow: 1 }} />
            <Space align="center">
                <Switch size="small" checked={false} disabled style={{marginRight: 4}} />
                <Text style={{fontSize: '12px', color: token.colorTextSecondary}}>Fit to Screen</Text>
                <Tooltip title="Zoom Out">
                    <Button
                        size="small"
                        icon={<ZoomOutOutlined />}
                        onClick={() => logic.setTimelineZoom(z => Math.max(10, z / 1.5))}
                    />
                </Tooltip>
                <Slider
                    value={Math.log2(logic.timelineZoom / 10)}
                    onChange={v => logic.setTimelineZoom(10 * Math.pow(2, v))}
                    min={0}
                    max={6}
                    step={0.1}
                    style={{ width: 80 }}
                    tooltip={{ open: false }}
                />
                <Tooltip title="Zoom In">
                    <Button
                        size="small"
                        icon={<ZoomInOutlined />}
                        onClick={() => logic.setTimelineZoom(z => Math.min(1000, z * 1.5))}
                    />
                </Tooltip>
            </Space>
        </div>
    );
};

const TimelineTracks: React.FC<{ logic: VideoEditorLogic }> = ({ logic }) => {
    const { token } = theme.useToken();
    const pxPerSec = Math.max(20, logic.timelineZoom);
    const totalTimelineWidth = Math.max(
        (logic.timelineContainerRef.current?.clientWidth || 500),
        (logic.projectState.totalDuration + 5) * pxPerSec // Ensure enough width
    );

    // --- Logic for visual tick marks (major/minor) based on pxPerSec ---
    let secondsPerMajorVisualMarker: number;
    let secondsPerMinorVisualMarker: number;
    if (pxPerSec < 25) {
        secondsPerMajorVisualMarker = 10; secondsPerMinorVisualMarker = 2;
    } else if (pxPerSec < 60) {
        secondsPerMajorVisualMarker = 5; secondsPerMinorVisualMarker = 1;
    } else if (pxPerSec < 120) {
        secondsPerMajorVisualMarker = 2; secondsPerMinorVisualMarker = 0.5;
    } else if (pxPerSec < 300) {
        secondsPerMajorVisualMarker = 1; secondsPerMinorVisualMarker = 0.2;
    } else {
        secondsPerMajorVisualMarker = 0.5; secondsPerMinorVisualMarker = 0.1;
    }
    const numVisualMarkers = Math.ceil(totalTimelineWidth / (secondsPerMinorVisualMarker * pxPerSec)) + 1;

    // --- MODIFIED: Use dynamic label interval for text labels ---
    const kapwingLabelIntervalSeconds = getKapwingTimelineLabelInterval(
        logic.projectState.totalDuration,
        pxPerSec // Pass the current pixels per second (zoom level)
    );

    const numTextLabels = (kapwingLabelIntervalSeconds > 0 && pxPerSec > 0)
        ? Math.ceil(totalTimelineWidth / (kapwingLabelIntervalSeconds * pxPerSec)) + 2 // +2 for buffer
        : 0;

    const activeSubtitleInTimeline = logic.projectState.subtitles.find(sub =>
        logic.currentTime >= sub.startTime && logic.currentTime < sub.endTime
    );
    const subtitleTrackHeight = logic.projectState.subtitles.length > 0 ? 35 : 0;

    return (
        <div ref={logic.timelineContainerRef} className="timeline-scroll-container">
            <div
                className="timeline-content-width"
                style={{
                    width: `${totalTimelineWidth}px`,
                    paddingTop: `${28 + subtitleTrackHeight}px` // Account for ruler and subtitle track
                }}
                onClick={(e) => { if (e.target === e.currentTarget) logic.handleSelectClip(null); }}
            >
                {/* --- Ruler Container --- */}
                <div
                    className="ruler-container"
                    style={{
                        top: `${subtitleTrackHeight}px`, // Position below subtitle track
                        height: '28px'
                    }}
                >
                    {/* Loop 1: Render visual tick marks (major and minor) */}
                    {Array.from({ length: numVisualMarkers }).map((_, i) => {
                        const time = i * secondsPerMinorVisualMarker;
                        // Optimization: don't render markers too far off-screen
                        if (time > logic.projectState.totalDuration + secondsPerMajorVisualMarker * 10 &&
                            time > (logic.currentTime / 0.7) + secondsPerMajorVisualMarker * 10 &&
                            time !== 0) {
                            return null;
                        }

                        const leftPos = time * pxPerSec;
                        const isMajor = Math.abs(time % secondsPerMajorVisualMarker) < 0.001 || time === 0;
                        const markerHeight = isMajor ? '60%' : '30%';
                        return (
                            <div
                                key={`visual-marker-${time.toFixed(3)}`}
                                className={`ruler-marker ${isMajor ? 'major' : ''}`}
                                style={{ left: `${leftPos}px`, height: markerHeight }}
                            />
                        );
                    })}

                    {/* Loop 2: Render dynamic text labels */}
                    {kapwingLabelIntervalSeconds > 0 && Array.from({ length: numTextLabels }).map((_, i) => {
                        const time = i * kapwingLabelIntervalSeconds
                        // Optimization: don't render labels too far off-screen or beyond duration
                        if (time > (totalTimelineWidth / pxPerSec) + kapwingLabelIntervalSeconds && time !== 0) {
                            return null;
                        }
                        if (time > logic.projectState.totalDuration && time !== 0) {
                            return null;
                        }
                        const leftPos = time * pxPerSec;
                        const minPixelSpacingForLabels = 35; // Minimum pixel space between labels
                        if (time !== 0 && i > 0) {
                            const prevLabelTime = (i - 1) * kapwingLabelIntervalSeconds;
                            const prevLabelLeftPos = prevLabelTime * pxPerSec;
                            if ((leftPos - prevLabelLeftPos) < minPixelSpacingForLabels) {
                                return null;
                            }
                        }

                        return (
                            <span
                                key={`text-label-${time.toFixed(1)}`}
                                className="ruler-label"
                                style={{
                                    position: 'absolute',
                                    left: `${leftPos + (time === 0 ? 0 : 2)}px`, // Small offset for '0'
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: token.colorTextLightSolid,
                                    fontSize: '11px',
                                }}
                            >
                                {formatRulerTimeForDynamicLabels(time)}
                            </span>
                        );
                    })}

                    <div
                        className="playhead-line"
                        style={{
                            left: `${logic.currentTime * pxPerSec}px`,
                            top: '0px',
                            bottom: `-${(logic.projectState.tracks.length * 60 + subtitleTrackHeight)}px` // Extend below all tracks
                        }}
                    >
                        <div className="playhead-handle" />
                    </div>
                    <Slider
                        className="timeline-seek-slider"
                        value={logic.currentTime}
                        max={logic.projectState.totalDuration || 1}
                        min={0}
                        step={0.001}
                        onChange={(v) => logic.handleTimelineSeek(v ?? 0)}
                        tooltip={{ open: false }}
                        railStyle={{ background: 'transparent' }}
                        style={{
                            position: 'absolute',
                            top: '0px',
                            left: 0,
                            right: 0,
                            margin: 0,
                            padding: 0,
                            height: '28px',
                            zIndex: 28
                        }}
                    />
                </div>

                {/* --- Subtitle Track Area --- */}
                {subtitleTrackHeight > 0 && (
                    <div
                        className="timeline-subtitle-track-area"
                        style={{ height: `${subtitleTrackHeight}px`, top: '0px' }}
                    >
                        <div className="timeline-track-header">
                            <TranslationOutlinedIcon style={{ marginRight: 4 }} />
                            <Text>Subtitles</Text>
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
                                            left: `${subLeftPx}px`,
                                            width: `${Math.max(5, subWidthPx)}px`, // Minimum width for visibility
                                            zIndex: isCurrent ? 25 : 20,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            padding: '0 4px',
                                            lineHeight: '30px', // Matches track height
                                            color: 'white',
                                            fontSize: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            fontFamily: logic.projectState.subtitleFontFamily
                                        }}
                                        onClick={(e) => { e.stopPropagation(); logic.handleTimelineSeek(subtitle.startTime); }}
                                        title={subtitle.text}
                                    >
                                        <Text ellipsis style={{ color: 'white', fontSize: '10px' }}>
                                            {subtitle.text}
                                        </Text>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* --- Media Tracks Area --- */}
                <div style={{ paddingTop: 0 }}>
                    {logic.projectState.tracks.map((track, trackIndex) => (
                        <div key={track.id} className="timeline-track">
                            <div className="timeline-track-header">
                                <Text>{trackIndex + 1}</Text>
                                <Tooltip title="Mute Track (Placeholder)">
                                    <Button type="text" size="small" shape="circle" icon={<EyeOutlined />} disabled />
                                </Tooltip>
                                <Tooltip title="Lock Track (Placeholder)">
                                    <Button type="text" size="small" shape="circle" icon={<LockOutlined />} disabled />
                                </Tooltip>
                            </div>
                            <div
                                className="timeline-track-clips-area"
                                onClick={(e) => { if (e.target === e.currentTarget) logic.handleSelectClip(null); }}
                            >
                                {track.clips.filter(clip => {
                                    // Don't render subtitle text clips if they are already handled by the dedicated subtitle track
                                    return !(clip.type === 'text' && logic.projectState.subtitles.find(sub => sub.id === clip.id));
                                }).map(clip => {
                                    const clipWidthPx = clip.duration * pxPerSec;
                                    const clipLeftPx = clip.startTime * pxPerSec;
                                    const isSelected = clip.id === logic.projectState.selectedClipId;
                                    const displayWidth = Math.max(2, clipWidthPx); // Ensure min width for draggable handle
                                    return (
                                        <div
                                            key={clip.id}
                                            id={`clip-${clip.id}`} // Used by Moveable
                                            className={`timeline-clip ${isSelected ? 'selected' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); logic.handleSelectClip(clip.id); }}
                                            style={{ left: `${clipLeftPx}px`, width: `${displayWidth}px` }}
                                        >
                                            <div className="clip-thumbnail-container">
                                                {clip.thumbnailUrls && clip.thumbnailUrls.length > 0 && clip.type !== 'text' && (() => {
                                                    const segments: React.ReactNode[] = [];
                                                    const segmentDuration = logic.THUMBNAIL_INTERVAL; // Assuming this is defined in logic
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
                                                                    left: `${currentLeft}px`,
                                                                    width: `${widthForThisSegment}px`,
                                                                    backgroundImage: bestThumb ? `url(${bestThumb.url})` : 'none',
                                                                    backgroundSize: 'cover',
                                                                    backgroundPosition: 'center',
                                                                    backgroundColor: '#333', // Fallback color
                                                                }}
                                                            />
                                                        );
                                                        currentLeft += segmentWidthPx;
                                                    }
                                                    return segments;
                                                })()}
                                                {(clip.type === 'video') && !clip.thumbnailUrls?.length && (
                                                    <div
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            background: 'repeating-linear-gradient( 45deg, #444, #444 2px, #3a3a3a 2px, #3a3a3a 4px)',
                                                            opacity: 0.3
                                                        }}
                                                        title="Waveform Placeholder"
                                                    />
                                                )}
                                                {clip.type === 'text' && (
                                                    <div className="clip-text-content">
                                                        <Text ellipsis style={{ color: 'white', fontSize: '10px' }}>
                                                            {clip.source as string}
                                                        </Text>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="clip-info-overlay">
                                                {clip.type === 'video' && <VideoCameraOutlined />}
                                                {clip.type === 'image' && <FileImageOutlined />}
                                                {clip.type === 'text' && <FontSizeOutlined />}
                                                <Text ellipsis style={{ flexGrow: 1 }}>
                                                    {clip.name || `${clip.type}`}
                                                </Text>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    <div style={{ padding: '5px 5px 5px 55px' }}>
                        <Button size="small" icon={<PlusOutlined />} disabled block type="dashed">
                            Add Track
                        </Button>
                    </div>
                </div>

                {/* --- Moveable for Timeline Clips --- */}
                <Moveable
                    ref={logic.moveableRef}
                    target={logic.projectState.selectedClipId ? `#clip-${logic.projectState.selectedClipId}` : null}
                    container={logic.timelineContainerRef.current || undefined}
                    origin={false}
                    edge={false}
                    draggable={true}
                    throttleDrag={0}
                    dragTarget={logic.projectState.selectedClipId ? `#clip-${logic.projectState.selectedClipId}` : undefined}
                    resizable={true}
                    renderDirections={["w", "e"]} // Only allow resizing from left/right
                    keepRatio={false}
                    throttleResize={0}
                    snappable={true}
                    snapDirections={{ left: true, right: true }} // Snap to other clips/playhead
                    elementSnapDirections={{ left: true, right: true }}
                    snapThreshold={5}
                    className="timeline-moveable"
                    onDrag={({ target, beforeTranslate }) => {
                        const clipId = logic.projectState.selectedClipId;
                        const clip = logic.projectState.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
                        const isSubtitleClip = clip?.type === 'text' && logic.projectState.subtitles.some(sub => sub.id === clipId);
                        if (!clipId || isSubtitleClip) return; // Prevent dragging subtitle clips (they're managed differently)

                        const currentTransform = target.style.transform || '';
                        const translateYMatch = currentTransform.match(/translateY\([^)]+\)/);
                        const translateY = translateYMatch ? translateYMatch[0] : '';
                        target.style.transform = `translateX(${beforeTranslate[0]}px) ${translateY}`; // Only translateX, preserve translateY
                    }}
                    onDragEnd={logic.onTimelineDragEnd}
                    onResize={({ target, width, drag, direction }) => {
                        const clipId = logic.projectState.selectedClipId;
                        const clip = logic.projectState.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
                        const isSubtitleClip = clip?.type === 'text' && logic.projectState.subtitles.some(sub => sub.id === clipId);
                        if (!clipId || isSubtitleClip) {
                            console.warn("Attempted to resize a subtitle clip via timeline moveable. This is not supported.");
                            return;
                        }
                        target.style.width = `${Math.max(1, width)}px`; // Ensure width doesn't go below 1px
                        const currentTransform = target.style.transform || '';
                        const translateYMatch = currentTransform.match(/translateY\([^)]+\)/);
                        const translateY = translateYMatch ? translateYMatch[0] : '';
                        if (direction[0] === -1) { // Resizing from left
                            target.style.transform = `translateX(${drag.beforeTranslate[0]}px) ${translateY}`;
                        } else { // Resizing from right (transformX remains 0 relative to original position)
                            target.style.transform = `${translateY}`;
                        }
                    }}
                    onResizeEnd={logic.onTimelineResizeEnd}
                />
            </div>
        </div>
    );
};


// Main component for Editor Timeline (Footer Content)
interface EditorTimelineProps {
    logic: VideoEditorLogic;
    screens: any; // Antd Grid screens breakpoint object
}

export const EditorTimeline: React.FC<EditorTimelineProps> = ({ logic, screens }) => {
    return (
        <Layout.Footer
            className="timeline-footer"
            style={{
                padding: 0,
                height: 180,
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0 // Prevent shrinking
            }}
        >
            <TimelineControls logic={logic} screens={screens} />
            <TimelineTracks logic={logic} />
        </Layout.Footer>
    );
};
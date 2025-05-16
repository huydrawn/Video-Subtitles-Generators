// --- START OF FILE useVideoEditorLogic.ts ---
import {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo
} from 'react';
import { message, Upload } from 'antd';
import type { UploadProps, UploadFile } from 'antd';
import type { UploadChangeParam } from 'antd/es/upload';
import { flushSync } from 'react-dom';
import Moveable from 'react-moveable';
import type { OnDragEnd, OnResize, OnResizeEnd, OnRotateEnd } from 'react-moveable';
import type {
    Clip,
    Track,
    MediaAsset,
    EditorProjectState,
    Keyframe,
    ThumbnailInfo,
    SubtitleEntry // Import SubtitleEntry from types
} from './types'; // Assuming types.ts is in the same directory

// --- Constants ---
const THUMBNAIL_INTERVAL = 5;
const DEFAULT_CLIP_DURATION = 5;
const PLAYBACK_RATES = [0.25, 0.5, 1.0, 1.5, 2.0];
const MIN_CLIP_DURATION = 0.1;
export const PREVIEW_ZOOM_LEVELS = [0.1, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0, 8.0, 16.0];
export const PREVIEW_ZOOM_FIT_MODE = 'fit';
export const PREVIEW_ZOOM_FILL_MODE = 'fill';

// --- Subtitle Constants --- // <-- Thêm hằng số cho phụ đề
const SUBTITLE_MAX_WIDTH_PX = 900; // Chiều rộng tối đa cho phụ đề trên canvas (pixels)
const SUBTITLE_BOTTOM_MARGIN_PX = 20; // Khoảng cách từ đáy canvas (pixels)
const SUBTITLE_LINE_HEIGHT_MULTIPLIER = 1.2; // Khoảng cách dòng (1.2 lần font size)
const SUBTITLE_OUTLINE_WIDTH = 2; // Độ dày viền chữ
const SUBTITLE_FILL_COLOR = 'white'; // Màu chữ
const SUBTITLE_OUTLINE_COLOR = 'black'; // Màu viền
const SUBTITLE_BACKGROUND_COLOR = 'rgba(0, 0, 0, 0.7)'; // Màu nền phụ đề
const DEFAULT_SUBTITLE_FONT_SIZE = 40; // <-- Default subtitle font size
const DEFAULT_SUBTITLE_TEXT_ALIGN = 'center'; // <--- ADDED: Default subtitle text alignment

// --- Helper Functions ---
export const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00.000';
    const totalMs = Math.floor(seconds * 1000);
    const ms = String(totalMs % 1000).padStart(3, '0');
    const totalSec = Math.floor(totalMs / 1000);
    const sec = String(totalSec % 60).padStart(2, '0');
    const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
    return `${min}:${sec}.${ms}`;
};

export const parseTimecodeToSeconds = (timecode: string): number => {
    // Handles SRT format HH:MM:SS,ms and potentially VTT HH:MM:SS.ms
    const parts = timecode.replace(',', '.').split(':');
    if (parts.length !== 3) return 0;
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const secondsParts = parts[2].split('.');
    const seconds = parseInt(secondsParts[0], 10) || 0;
    const milliseconds = parseInt(secondsParts[1], 10) || 0; // Assumes ms are 3 digits after comma/dot

    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
};

// FIX: Export interpolateValue so it can be imported by other files (like PropertiesPanel.tsx)
export const interpolateValue = (kfs: Keyframe[] | undefined, time: number, defaultValue: any): any => {
    if (!kfs || kfs.length === 0) return defaultValue;
    const sortedKfs = [...kfs].sort((a, b) => a.time - b.time);
    if (time <= sortedKfs[0].time) return sortedKfs[0].value;
    if (time >= sortedKfs[sortedKfs.length - 1].time) return sortedKfs[sortedKfs.length - 1].value;
    let prevKf = sortedKfs[0];
    let nextKf = sortedKfs[sortedKfs.length - 1];
    for (let i = 0; i < sortedKfs.length - 1; i++) {
        if (sortedKfs[i].time <= time && sortedKfs[i + 1].time >= time) {
            prevKf = sortedKfs[i]; nextKf = sortedKfs[i + 1]; break;
        }
    }
    const timeDiff = nextKf.time - prevKf.time;
    if (timeDiff === 0) return prevKf.value;
    const factor = (time - prevKf.time) / timeDiff;
    const pVal = prevKf.value; const nVal = nextKf.value;
    if (typeof pVal === 'number' && typeof nVal === 'number') {
        return pVal + (nVal - pVal) * factor;
    }
    else if (
        typeof pVal === 'object' && typeof nVal === 'object' &&
        pVal !== null && nVal !== null &&
        'x' in pVal && 'y' in pVal && 'x' in nVal && 'y' in nVal
    ) {
        const p = pVal as { x: number, y: number }; const n = nVal as { x: number, y: number };
        return { x: p.x + (n.x - p.x) * factor, y: p.y + (n.y - p.y) * factor };
    }
    // For other types, return the value of the previous keyframe
    return pVal;
};


// --- Subtitle Word Wrapping Helper --- // <-- Thêm hàm này
/**
 * Wraps text based on a maximum pixel width using canvas context.
 * Respects existing newline characters (\n).
 * @param ctx - The canvas 2D rendering context.
 * @param text - The string text to wrap.
 * @param maxWidth - The maximum width in pixels allowed for a line.
 * @returns An array of strings, where each string is a wrapped line.
 */
const getWrappedLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const lines: string[] = [];
    if (!text) return lines;

    const segments = text.split('\n'); // Handle existing newlines first

    segments.forEach(segment => {
        const words = segment.split(' ');
        let currentLine = '';

        words.forEach((word, index) => {
            if (index === 0) {
                currentLine = word;
            } else {
                const testLine = currentLine + ' ' + word;
                const testWidth = ctx.measureText(testLine).width;

                if (testWidth > maxWidth) {
                    lines.push(currentLine); // Push the full line we built
                    currentLine = word; // Start a new line with the current word
                } else {
                    currentLine = testLine; // Add the word to the current line
                }
            }
        });

        // Push the last line segment after the loop
        if (currentLine !== '') {
            lines.push(currentLine);
        }
    });

    return lines;
};


// --- The Custom Hook ---
export const useVideoEditorLogic = () => {
    // --- State ---
    const [previewZoomLevel, setPreviewZoomLevel] = useState<number>(1.0);
    const [previewZoomMode, setPreviewZoomMode] = useState<string>(PREVIEW_ZOOM_FIT_MODE);
    const [fitScaleFactor, setFitScaleFactor] = useState<number>(1.0);
    const [fillScaleFactor, setFillScaleFactor] = useState<number>(1.0);
    const [editorState, setEditorState] = useState<'initial' | 'uploading' | 'editor'>('initial');
    const [selectedMenuKey, setSelectedMenuKey] = useState('media');
    const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0); // Not fully used in client-side only mode
    const [currentTime, setCurrentTime] = useState(0);
    const [timelineZoom, setTimelineZoom] = useState(50); // Default zoom level (pixels per second)
    const [projectState, setProjectState] = useState<EditorProjectState>({
        previewZoomLevel: 0, previewZoomMode: "", // Use the updated type
        projectName: "New Video",
        tracks: [{ id: `track-${Date.now()}`, clips: [] }], // Initialize with one track
        mediaAssets: [],
        canvasDimensions: { width: 1280, height: 720 }, // Default canvas size (16:9)
        totalDuration: 0,
        selectedClipId: null,
        isPlaying: false,
        isPreviewMuted: false,
        playbackRate: 1.0,
        subtitles: [], // Initialize subtitles array
        subtitleFontFamily: 'Arial', // <-- Initialize subtitle font
        subtitleFontSize: DEFAULT_SUBTITLE_FONT_SIZE, // <-- Initialize subtitle font size
        subtitleTextAlign: DEFAULT_SUBTITLE_TEXT_ALIGN, // <--- ADDED: Initialize subtitle text alignment
        // --- ADDED: Initialize subtitle styles --- <--- ADDED HERE
        isSubtitleBold: false,
        isSubtitleItalic: false,
        isSubtitleUnderlined: false,
        // ------------------------------------------
    });

    // --- Refs ---
    const timelineContainerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const mediaElementsRef = useRef<{ [key: string]: HTMLVideoElement | HTMLImageElement }>({});
    const moveableRef = useRef<Moveable>(null); // Ref for timeline Moveable
    const previewMoveableRef = useRef<Moveable>(null); // Ref for preview Moveable
    const lastUpdateTimeRef = useRef<number>(Date.now());

    // --- Memoized Derived State ---
    const selectedClip = useMemo(() => {
        if (!projectState.selectedClipId) return null;
        for (const track of projectState.tracks) {
            const clip = track.clips.find(c => c.id === projectState.selectedClipId);
            if (clip) return clip;
        }
        return null;
    }, [projectState.tracks, projectState.selectedClipId]);

    // --- Utility Functions ---
    const calculateTotalDuration = useCallback((tracks: Track[]): number => {
        let maxEndTime = 0;
        tracks.forEach(track => {
            track.clips.forEach(clip => {
                maxEndTime = Math.max(maxEndTime, clip.endTime);
            });
        });
        // Subtitles don't extend total duration in this model, only media clips do.
        return Math.max(0, maxEndTime);
    }, []);

    // --- Thumbnail Generation ---
    const generateSingleThumbnail = useCallback(
        async (videoElement: HTMLVideoElement, time: number): Promise<string | null> => {
            return new Promise((resolve) => {
                if (!videoElement || videoElement.readyState < videoElement.HAVE_METADATA || !isFinite(videoElement.duration)) {
                    if (!videoElement) console.warn("Video element missing for thumbnail generation");
                    else if (videoElement.readyState < videoElement.HAVE_METADATA) console.warn("Video metadata not ready for thumbnail");
                    else if (!isFinite(videoElement.duration)) console.warn("Video duration invalid for thumbnail");
                    resolve(null);
                    return;
                }
                if (!videoElement.videoWidth || !videoElement.videoHeight) {
                    console.warn("Video dimensions not available for thumbnail generation");
                    resolve(null);
                    return;
                }

                const offscreenCanvas = document.createElement('canvas');
                offscreenCanvas.width = 160;
                offscreenCanvas.height = 90;
                const ctx = offscreenCanvas.getContext('2d', { alpha: false });
                if (!ctx) { console.error("Failed to get 2D context for thumbnail"); resolve(null); return; }

                const targetTime = Math.min(Math.max(0, time), videoElement.duration);
                const originalTime = videoElement.currentTime;
                const wasPaused = videoElement.paused;
                let seekHandlerAttached = false;

                const cleanupListeners = () => {
                    if (seekHandlerAttached) {
                        videoElement.removeEventListener('seeked', processFrame);
                        seekHandlerAttached = false;
                    }
                    videoElement.removeEventListener('error', seekErrorHandler);
                };

                const processFrame = () => {
                    cleanupListeners();
                    if (!videoElement.parentNode || !ctx) {
                        console.warn("Video element removed or context lost before thumbnail generation finished.");
                        resolve(null); return;
                    }
                    try {
                        // FIX: Use videoElement instead of element here
                        ctx.drawImage(videoElement, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
                        const dataUrl = offscreenCanvas.toDataURL('image/jpeg', 0.7);

                        if (Math.abs(videoElement.currentTime - originalTime) > 0.01) {
                            try { videoElement.currentTime = originalTime; } catch(e) { /* ignore potential errors */ }
                        }
                        if (!wasPaused) { videoElement.play().catch(() => {}); }
                        resolve(dataUrl);
                    } catch (e) { console.error("Error generating thumbnail data URL:", e); resolve(null); }
                };

                const seekErrorHandler = (event: Event) => {
                    console.error("Error during video seek/load for thumbnail:", event);
                    cleanupListeners(); resolve(null);
                    try {
                        if (Math.abs(videoElement.currentTime - originalTime) > 0.01) videoElement.currentTime = originalTime;
                        if (!wasPaused) videoElement.play().catch(() => {});
                    } catch (restoreError) { console.warn("Error restoring video state after thumbnail error:", restoreError); }
                };

                videoElement.addEventListener('error', seekErrorHandler, { once: true });

                if (Math.abs(videoElement.currentTime - targetTime) > 0.1 && videoElement.seekable.length > 0) {
                    if (!wasPaused) videoElement.pause();
                    seekHandlerAttached = true;
                    videoElement.addEventListener('seeked', processFrame, { once: true });
                    videoElement.currentTime = targetTime;
                }
                else if (videoElement.readyState >= videoElement.HAVE_CURRENT_DATA) {
                    if (!wasPaused) videoElement.pause();
                    requestAnimationFrame(() => {
                        if (videoElement.readyState >= videoElement.HAVE_CURRENT_DATA) {
                            processFrame();
                        } else {
                            console.warn("Video state changed before drawing frame for thumbnail");
                            cleanupListeners(); resolve(null);
                        }
                    });
                }
                else {
                    console.warn("Video not ready to generate thumbnail for time:", time, "State:", videoElement.readyState);
                    cleanupListeners(); resolve(null);
                }
            });
        },
        []
    );

    const generateThumbnailsForClip = useCallback(
        async (clipId: string, videoElement: HTMLVideoElement): Promise<ThumbnailInfo[]> => {
            const duration = videoElement.duration;
            if (!duration || !isFinite(duration) || duration <= 0) return [];
            const thumbnailTimes: number[] = [0.1];
            for (let t = THUMBNAIL_INTERVAL; t < duration; t += THUMBNAIL_INTERVAL) {
                thumbnailTimes.push(t);
            }
            const generatedThumbnails: ThumbnailInfo[] = [];
            for (const time of thumbnailTimes) {
                const currentElement = mediaElementsRef.current[clipId];
                if (!currentElement || !(currentElement instanceof HTMLVideoElement)) {
                    console.warn(`Video element for ${clipId} missing during thumbnail generation loop.`);
                    break;
                }
                const url = await generateSingleThumbnail(currentElement, time);
                if (url) {
                    generatedThumbnails.push({ time, url });
                }
            }
            return generatedThumbnails;
        },
        [generateSingleThumbnail]
    );

    // --- Canvas Drawing Function ---
    const drawFrame = useCallback(
        (time: number) => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx || !projectState) return;

            const { width, height } = projectState.canvasDimensions;
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width; canvas.height = height;
            }

            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);

            // Draw media and text clips (excluding text clips tied to subtitles)
            projectState.tracks.forEach(track => {
                track.clips.forEach(clip => {
                    // Only draw regular clips and text clips that are NOT subtitle-associated
                    const isSubtitleClip = clip.type === 'text' && projectState.subtitles.some(sub => sub.id === clip.id);
                    if (time >= clip.startTime && time < clip.endTime && !isSubtitleClip) {
                        const pos = interpolateValue(clip.keyframes?.position, time, clip.position);
                        const scale = interpolateValue(clip.keyframes?.scale, time, clip.scale);
                        const rotation = interpolateValue(clip.keyframes?.rotation, time, clip.rotation);
                        const opacity = interpolateValue(clip.keyframes?.opacity, time, clip.opacity ?? 1);

                        const drawX = pos.x * width;
                        const drawY = pos.y * height;

                        ctx.save();
                        ctx.globalAlpha = opacity;
                        ctx.translate(drawX, drawY);
                        ctx.rotate(rotation * Math.PI / 180);

                        const element = mediaElementsRef.current[clip.id];
                        let elementWidth = clip.originalWidth || (clip.type === 'text' ? 300 : 100);
                        let elementHeight = clip.originalHeight || (clip.type === 'text' ? 80 : 100);
                        if (element instanceof HTMLVideoElement && element.videoWidth) { elementWidth = element.videoWidth; elementHeight = element.videoHeight; }
                        else if (element instanceof HTMLImageElement && element.naturalWidth) { elementWidth = element.naturalWidth; elementHeight = element.naturalHeight; }

                        const drawWidth = elementWidth * scale.x;
                        const drawHeight = elementHeight * scale.y;
                        const drawOffsetX = -drawWidth / 2;
                        const drawOffsetY = -drawHeight / 2;

                        try {
                            if (clip.type === 'video' && element instanceof HTMLVideoElement && element.readyState >= element.HAVE_CURRENT_DATA) {
                                ctx.drawImage(element, drawOffsetX, drawOffsetY, drawWidth, drawHeight);
                            }
                            else if (clip.type === 'image' && element instanceof HTMLImageElement && element.complete) {
                                ctx.drawImage(element, drawOffsetX, drawOffsetY, drawWidth, drawHeight);
                            }
                            else if (clip.type === 'text') {
                                // Text clips that are NOT subtitles are handled here with their own styles
                                ctx.fillStyle = 'white';
                                // Use a base font size for regular text clips, NOT the subtitle font size
                                const baseFontSize = 50;
                                const fontSize = baseFontSize * Math.min(scale.x, scale.y);
                                const fontSizeRelative = (fontSize / 720) * projectState.canvasDimensions.height;

                                ctx.font = `${fontSizeRelative}px Arial`; // Text clips use Arial for now
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';

                                const lines = (clip.source as string).split('\n');
                                const lineHeight = fontSizeRelative * 1.2;
                                const startY = drawOffsetY - (lines.length - 1) * lineHeight / 2;

                                lines.forEach((line, index) => {
                                    ctx.fillText(line.trim(), 0, startY + index * lineHeight);
                                });
                            }
                        } catch (e) {
                            console.error("Canvas draw error for clip:", clip.id, e);
                        }
                        ctx.restore();
                    }
                });
            });

            // --- Draw Subtitles on canvas ---
            const activeSubtitle = projectState.subtitles.find(sub =>
                time >= sub.startTime && time < sub.endTime
            );

            if (activeSubtitle) {
                ctx.save();
                // Apply subtitle styles
                ctx.fillStyle = SUBTITLE_FILL_COLOR; // White
                ctx.strokeStyle = SUBTITLE_OUTLINE_COLOR; // Black
                ctx.lineWidth = SUBTITLE_OUTLINE_WIDTH; // 2

                // Calculate font size based on state relative to a standard canvas height (e.g., 720)
                const baseFontSize = projectState.subtitleFontSize; // <-- Use font size from state
                const fontSizeRelative = (baseFontSize / 720) * height;

                // Construct the font string based on state
                let fontString = '';
                if (projectState.isSubtitleBold) {
                    fontString += 'bold ';
                }
                if (projectState.isSubtitleItalic) {
                    fontString += 'italic ';
                }
                // Note: Canvas 2D context does not have a built-in underline style in ctx.font
                // We will handle underline by manually drawing a line later.

                // Use subtitleFontFamily FROM STATE
                fontString += `${fontSizeRelative}px ${projectState.subtitleFontFamily}`;
                ctx.font = fontString;


                // --- Apply Text Alignment --- <--- ADDED
                // ctx.textAlign can be 'left', 'center', 'right', 'start', 'end'
                // We map our state ('left', 'center', 'right') directly to canvas textAlign
                ctx.textAlign = projectState.subtitleTextAlign;
                ctx.textBaseline = 'bottom'; // Draw text from the bottom up


                // --- Word Wrapping Logic ---
                // Word wrapping needs the font size context to measure text width
                // The maxWidth here is relative to the canvas width, scaled for the current canvas size
                const scaledSubtitleMaxWidth = (SUBTITLE_MAX_WIDTH_PX / 1280) * width; // Assuming 1280 is reference width
                const wrappedLines = getWrappedLines(ctx, activeSubtitle.text, scaledSubtitleMaxWidth);
                // ---------------------------

                const lineHeight = fontSizeRelative * SUBTITLE_LINE_HEIGHT_MULTIPLIER;
                // Calculate the total height of the subtitle block *after* wrapping
                const totalSubtitleHeight = wrappedLines.length * lineHeight;
                // Calculate the starting Y position for the bottom-most line's *baseline*
                // Position is relative to the canvas bottom, accounting for total block height
                // We draw text with baseline='bottom', so we position the *baseline* of the last line.
                // The Y coordinate for the baseline of the first line will be higher (startY - (wrappedLines.length - 1) * lineHeight)
                const lastLineBaselineY = height - SUBTITLE_BOTTOM_MARGIN_PX; // Baseline of the very last line

                // Determine the horizontal position for drawing based on alignment
                let drawX = width / 2; // Default center
                if (projectState.subtitleTextAlign === 'left') {
                    // For 'left', the drawX coordinate is the left edge of the text bounding box.
                    // We want the text block to be centered horizontally, so the left edge
                    // should be at ((canvas width - max block width) / 2).
                    drawX = (width - scaledSubtitleMaxWidth) / 2;
                } else if (projectState.subtitleTextAlign === 'right') {
                    // For 'right', the drawX coordinate is the right edge of the text bounding box.
                    // We want the text block to be centered horizontally, so the right edge
                    // should be at ((canvas width + max block width) / 2).
                    drawX = (width + scaledSubtitleMaxWidth) / 2;
                }
                // For 'center', ctx.textAlign = 'center' with drawX = width / 2 works correctly,
                // as drawX is the center point of the text bounding box.

                // Draw each wrapped line
                wrappedLines.forEach((line, index) => {
                    // Calculate the Y coordinate for the baseline of the current line
                    // This is the baseline of the last line minus the height of all lines below it.
                    const lineBaselineY = lastLineBaselineY - (wrappedLines.length - 1 - index) * lineHeight;

                    // Draw outline (optional, depending on desired style)
                    ctx.strokeText(line.trim(), drawX, lineBaselineY); // Use drawX based on alignment
                    // Draw text
                    ctx.fillText(line.trim(), drawX, lineBaselineY); // Use drawX based on alignment

                    // --- Draw Underline if enabled --- <--- ADDED HERE
                    if (projectState.isSubtitleUnderlined) {
                        const metrics = ctx.measureText(line.trim());
                        // Calculate the x-start position based on alignment
                        let underlineXStart = drawX;
                        if (projectState.subtitleTextAlign === 'center') {
                            // For center, the line starts half the text width to the left of drawX
                            underlineXStart = drawX - metrics.width / 2;
                        } else if (projectState.subtitleTextAlign === 'right') {
                            // For right, the line starts the full text width to the left of drawX
                            underlineXStart = drawX - metrics.width;
                        }
                        // For left, underlineXStart is just drawX

                        // Calculate the y-position for the underline line
                        // It should be slightly below the baseline.
                        // metrics.actualBoundingBoxDescent gives the distance from baseline to bottom of bounding box.
                        // Add a small offset for spacing below the text.
                        const underlineY = lineBaselineY + (metrics.actualBoundingBoxDescent || (fontSizeRelative * 0.2)) + 2; // Approx descent + small offset

                        // Set underline style (can match outline color/width or be separate)
                        ctx.save(); // Save state before changing line style
                        ctx.strokeStyle = SUBTITLE_OUTLINE_COLOR; // Match outline color
                        ctx.lineWidth = Math.max(1, fontSizeRelative * 0.04); // Underline thickness relative to font size
                        ctx.beginPath();
                        ctx.moveTo(underlineXStart, underlineY);
                        ctx.lineTo(underlineXStart + metrics.width, underlineY);
                        ctx.stroke();
                        ctx.restore(); // Restore line style
                    }
                    // ----------------------------------
                });

                ctx.restore(); // Restore canvas state
            }
        },
        // Add subtitleFontFamily, subtitleFontSize, subtitleTextAlign AND new style dependencies
        [
            projectState.tracks, projectState.canvasDimensions, projectState.subtitles,
            projectState.subtitleFontFamily, projectState.subtitleFontSize, projectState.subtitleTextAlign,
            projectState.isSubtitleBold, projectState.isSubtitleItalic, projectState.isSubtitleUnderlined // <--- ADDED NEW STYLE DEPENDENCIES
        ]
    );


    // --- Effects ---
    useEffect(() => {
        const calculateScales = () => {
            if (!previewContainerRef.current || !projectState.canvasDimensions.width || !projectState.canvasDimensions.height) return { fit: 1.0, fill: 1.0 };
            const containerRect = previewContainerRef.current.getBoundingClientRect();
            const { width: canvasWidth, height: canvasHeight } = projectState.canvasDimensions;
            const { width: containerWidth, height: containerHeight } = containerRect;
            if (!containerWidth || !containerHeight || !canvasWidth || !canvasHeight) return { fit: 1.0, fill: 1.0 };
            const scaleX = containerWidth / canvasWidth; const scaleY = containerHeight / canvasHeight;
            return { fit: Math.min(scaleX, scaleY), fill: Math.max(scaleX, scaleY) };
        };

        const updateScales = () => {
            const { fit, fill } = calculateScales();
            setFitScaleFactor(fit); setFillScaleFactor(fill);
            if (previewZoomMode === PREVIEW_ZOOM_FIT_MODE) setPreviewZoomLevel(fit);
            else if (previewZoomMode === PREVIEW_ZOOM_FILL_MODE) setPreviewZoomLevel(fill);
        };

        updateScales();

        const container = previewContainerRef.current;
        const observer = new ResizeObserver(updateScales);
        if(container) observer.observe(container);

        return () => { if(container) observer.unobserve(container); };
    }, [projectState.canvasDimensions, previewZoomMode]);

    useEffect(() => {
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            Object.values(mediaElementsRef.current).forEach(el => { if (el instanceof HTMLVideoElement) { el.pause(); el.removeAttribute('src'); el.load(); } el.remove(); });
            mediaElementsRef.current = {};
            projectState.mediaAssets.forEach(asset => { if (asset.objectURL) URL.revokeObjectURL(asset.objectURL); });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        Object.values(mediaElementsRef.current).forEach(element => {
            if (element instanceof HTMLVideoElement) {
                element.muted = projectState.isPreviewMuted;
                if (element.playbackRate !== projectState.playbackRate) {
                    element.playbackRate = projectState.playbackRate;
                }
            }
        });
    }, [projectState.isPreviewMuted, projectState.playbackRate]);

    useEffect(() => {
        const currentClipIds = new Set(projectState.tracks.flatMap(t => t.clips.map(c => c.id)));

        projectState.tracks.forEach(track => {
            track.clips.forEach(clip => {
                // Skip media element creation for text clips that are tied to subtitles
                const isSubtitleClip = clip.type === 'text' && projectState.subtitles.some(sub => sub.id === clip.id);

                if (!isSubtitleClip && (clip.type === 'video' || clip.type === 'image') && typeof clip.source === 'string' && (clip.source.startsWith('blob:') || clip.source.startsWith('http'))) {
                    const existingElement = mediaElementsRef.current[clip.id];

                    if (clip.type === 'video' && (!existingElement || !(existingElement instanceof HTMLVideoElement))) {
                        const video = document.createElement('video');
                        video.muted = projectState.isPreviewMuted;
                        video.playbackRate = projectState.playbackRate;
                        video.preload = 'metadata';
                        video.crossOrigin = 'anonymous';
                        video.src = clip.source;
                        video.style.cssText = `position: absolute; opacity: 0; pointer-events: none; width: 1px; height: 1px; top: -10px; left: -10px; overflow: hidden;`;

                        video.onloadedmetadata = async () => {
                            if (!mediaElementsRef.current[clip.id] || !currentClipIds.has(clip.id)) return;

                            const actualDuration = video.duration;
                            const videoWidth = video.videoWidth;
                            const videoHeight = video.videoHeight;

                            const needsMetaUpdate = (!clip.originalWidth || !clip.originalHeight || (clip.duration !== actualDuration && !isNaN(actualDuration) && actualDuration > 0));
                            const needsThumbnails = (!clip.thumbnailUrls || clip.thumbnailUrls.length === 0) && clip.type === 'video';

                            if (needsMetaUpdate || needsThumbnails) {
                                let thumbnails = clip.thumbnailUrls;
                                if (needsThumbnails && videoWidth > 0 && videoHeight > 0 && isFinite(actualDuration) && actualDuration > 0) {
                                    try {
                                        thumbnails = await generateThumbnailsForClip(clip.id, video);
                                    } catch (thumbError) {
                                        console.error(`Thumbnail generation failed for ${clip.id}`, thumbError);
                                        thumbnails = [];
                                    }
                                } else if (needsThumbnails) {
                                    thumbnails = [];
                                }

                                setProjectState(prev => {
                                    let durationChanged = false;
                                    const updatedTracks = prev.tracks.map(t => ({
                                        ...t,
                                        clips: t.clips.map(c => {
                                            if (c.id === clip.id) {
                                                const newDuration = (needsMetaUpdate && !isNaN(actualDuration) && actualDuration > 0) ? actualDuration : c.duration;
                                                durationChanged = durationChanged || (c.duration !== newDuration);
                                                const newEndTime = c.startTime + newDuration;
                                                return {
                                                    ...c,
                                                    originalWidth: videoWidth || c.originalWidth || 0,
                                                    originalHeight: videoHeight || c.originalHeight || 0,
                                                    duration: newDuration,
                                                    endTime: newEndTime,
                                                    thumbnailUrls: thumbnails ?? c.thumbnailUrls
                                                };
                                            }
                                            return c;
                                        })
                                    }));
                                    const newTotalDuration = durationChanged ? calculateTotalDuration(updatedTracks) : prev.totalDuration;
                                    return { ...prev, tracks: updatedTracks, totalDuration: newTotalDuration };
                                });
                            }
                            if (video.preload !== 'auto') video.preload = 'auto';
                        };

                        video.onerror = (e) => {
                            console.error(`Error loading video: ${clip.name || clip.id}`, clip.source, e);
                            message.error(`Failed to load video: ${clip.name || clip.id}`);
                            setProjectState(prev => {
                                const updatedTracks = prev.tracks
                                    .map(t => ({ ...t, clips: t.clips.filter(c => c.id !== clip.id) }))
                                    .filter(track => track.clips.length > 0 || prev.tracks.length === 1);
                                if (updatedTracks.length === 0) {
                                    updatedTracks.push({ id: `track-${Date.now()}`, clips: [] });
                                }
                                const newTotalDuration = calculateTotalDuration(updatedTracks);
                                const newSelectedClipId = prev.selectedClipId === clip.id ? null : prev.selectedClipId;
                                return { ...prev, tracks: updatedTracks, totalDuration: newTotalDuration, selectedClipId: newSelectedClipId };
                            });
                            if (mediaElementsRef.current[clip.id]) {
                                mediaElementsRef.current[clip.id]?.remove();
                                delete mediaElementsRef.current[clip.id];
                            }
                        };

                        document.body.appendChild(video);
                        mediaElementsRef.current[clip.id] = video;
                    }
                    else if (clip.type === 'image' && (!existingElement || !(existingElement instanceof HTMLImageElement))) {
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        img.src = clip.source;

                        img.onload = () => {
                            if (!currentClipIds.has(clip.id) || !mediaElementsRef.current[clip.id]) return;
                            setProjectState(prev => ({
                                ...prev,
                                tracks: prev.tracks.map(t => ({
                                    ...t,
                                    clips: t.clips.map(c =>
                                        // FIX: Use c.source here to get the object URL reliably
                                        c.id === clip.id ? {
                                            ...c,
                                            originalWidth: img.naturalWidth,
                                            originalHeight: img.naturalHeight,
                                            thumbnailUrls: [{ time: 0, url: c.source as string }] // <--- CORRECTED LINE
                                        } : c)
                                }))
                            }));
                        };

                        img.onerror = () => {
                            console.error(`Error loading image: ${clip.name || clip.id}`, clip.source);
                            message.error(`Failed to load image: ${clip.name || clip.id}`);
                            setProjectState(prev => {
                                const updatedTracks = prev.tracks
                                    .map(t => ({ ...t, clips: t.clips.filter(c => c.id !== clip.id) }))
                                    .filter(track => track.clips.length > 0 || prev.tracks.length === 1);
                                if (updatedTracks.length === 0) {
                                    updatedTracks.push({ id: `track-${Date.now()}`, clips: [] });
                                }
                                const newTotalDuration = calculateTotalDuration(updatedTracks);
                                const newSelectedClipId = prev.selectedClipId === clip.id ? null : prev.selectedClipId;
                                return { ...prev, tracks: updatedTracks, totalDuration: newTotalDuration, selectedClipId: newSelectedClipId };
                            });
                            delete mediaElementsRef.current[clip.id];
                        };
                        mediaElementsRef.current[clip.id] = img;
                    }
                }
            });
        });

        // Remove media elements for clips that no longer exist or are now subtitle clips
        Object.keys(mediaElementsRef.current).forEach(id => {
            const clipExists = projectState.tracks.flatMap(t => t.clips).some(c => c.id === id);
            const isSubtitleClip = projectState.subtitles.some(sub => sub.id === id);
            if (!clipExists || isSubtitleClip) {
                const element = mediaElementsRef.current[id];
                if (element) {
                    if (element instanceof HTMLVideoElement) { element.pause(); element.removeAttribute('src'); element.load(); }
                    element.remove();
                }
                delete mediaElementsRef.current[id];
            }
        });

    }, [
        projectState.tracks, projectState.isPreviewMuted, projectState.playbackRate,
        generateThumbnailsForClip, calculateTotalDuration, projectState.subtitles // Added subtitles here
    ]);


    // --- Animation Loop ---
    const renderLoop = useCallback(() => {
        const now = Date.now();
        const deltaTime = projectState.isPlaying
            ? ((now - lastUpdateTimeRef.current) / 1000) * projectState.playbackRate
            : 0;
        let newTime = currentTime;

        if (projectState.isPlaying && deltaTime > 0) {
            newTime = Math.min(projectState.totalDuration, currentTime + deltaTime);
            newTime = Math.max(0, newTime);

            if (newTime !== currentTime) {
                // Use flushSync to ensure currentTime is updated synchronously before drawing the frame
                // and before the next requestAnimationFrame call potentially uses it.
                flushSync(() => {
                    setCurrentTime(newTime);
                });
            }

            if (newTime >= projectState.totalDuration && projectState.totalDuration > 0 && projectState.isPlaying) {
                flushSync(() => { // Use flushSync here too
                    setProjectState(prev => ({ ...prev, isPlaying: false }));
                    setCurrentTime(projectState.totalDuration);
                });
                Object.values(mediaElementsRef.current).forEach(el => {
                    if (el instanceof HTMLVideoElement && !el.paused) {
                        el.pause();
                    }
                });
                animationFrameRef.current = null;
                drawFrame(projectState.totalDuration);
                return;
            }
        }
        lastUpdateTimeRef.current = now;
        drawFrame(newTime);

        if (projectState.isPlaying && editorState === 'editor') {
            animationFrameRef.current = requestAnimationFrame(renderLoop);
        } else {
            animationFrameRef.current = null;
        }
    }, [
        projectState.isPlaying, projectState.totalDuration, projectState.playbackRate,
        currentTime, drawFrame, editorState
    ]);

    useEffect(() => {
        if (editorState === 'editor') {
            drawFrame(currentTime); // Draw initial frame or frame after seek/pause

            if (projectState.isPlaying && !animationFrameRef.current) {
                console.log("Starting animation loop");
                lastUpdateTimeRef.current = Date.now();
                animationFrameRef.current = requestAnimationFrame(renderLoop);
            } else if (!projectState.isPlaying && animationFrameRef.current) {
                console.log("Stopping animation loop (paused)");
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        } else {
            if (animationFrameRef.current) {
                console.log("Stopping animation loop (leaving editor)");
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            if (projectState.isPlaying) {
                setProjectState(prev => ({ ...prev, isPlaying: false }));
                Object.values(mediaElementsRef.current).forEach(el => {
                    if (el instanceof HTMLVideoElement && !el.paused) {
                        el.pause();
                    }
                });
            }
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [editorState, projectState.isPlaying, renderLoop, drawFrame, currentTime]);

    useEffect(() => {
        const targetElement = previewContainerRef.current?.querySelector('.moveable-target-preview') as HTMLElement;
        const containerElement = previewContainerRef.current;
        const moveableInstance = previewMoveableRef.current;

        // Check if the selected clip is a text clip associated with a subtitle
        const selectedIsSubtitleClip = selectedClip?.type === 'text' && projectState.subtitles.some(sub => sub.id === selectedClip.id);


        if (!targetElement || !containerElement || !moveableInstance || !selectedClip || selectedIsSubtitleClip) {
            // Hide Moveable target if no clip is selected or if the selected clip is a subtitle text clip
            if (targetElement) targetElement.style.display = 'none';
            moveableInstance?.updateRect();
            return;
        }

        const { canvasDimensions } = projectState;
        const containerRect = containerElement.getBoundingClientRect();
        const currentContainerScale = previewZoomLevel;

        const displayWidth = canvasDimensions.width * currentContainerScale;
        const displayHeight = canvasDimensions.height * currentContainerScale;
        const offsetX = (containerRect.width - displayWidth) / 2;
        const offsetY = (containerRect.height - displayHeight) / 2;

        const pos = interpolateValue(selectedClip.keyframes?.position, currentTime, selectedClip.position);
        const scale = interpolateValue(selectedClip.keyframes?.scale, currentTime, selectedClip.scale);
        const rotation = interpolateValue(selectedClip.keyframes?.rotation, currentTime, selectedClip.rotation);

        const baseWidth = selectedClip.originalWidth || 100; // Default size for non-media
        const baseHeight = selectedClip.originalHeight || 100; // Default size for non-media

        // Calculate position and size of the scaled clip *relative to the scaled canvas origin*
        const clipScaledWidth = baseWidth * scale.x * currentContainerScale;
        const clipScaledHeight = baseHeight * scale.y * currentContainerScale;
        // Calculate the top-left corner of the clip (which is centered) relative to the scaled canvas origin
        const clipScaledX = (pos.x * canvasDimensions.width - (baseWidth * scale.x / 2)) * currentContainerScale;
        const clipScaledY = (pos.y * canvasDimensions.height - (baseHeight * scale.y / 2)) * currentContainerScale;

        // Calculate the final position in the container, adding the centering offset
        const finalX = clipScaledX + offsetX;
        const finalY = clipScaledY + offsetY;


        targetElement.style.width = `${clipScaledWidth}px`;
        targetElement.style.height = `${clipScaledHeight}px`;
        targetElement.style.transform = `translate(${finalX}px, ${finalY}px) rotate(${rotation}deg)`;
        targetElement.style.display = 'block';

        moveableInstance.updateRect();
    }, [
        selectedClip, currentTime, projectState.canvasDimensions,
        previewZoomLevel, previewContainerRef, previewMoveableRef, projectState.subtitles // Added subtitles dependency
    ]);


    // --- UI Handlers ---
    const handleMenuClick = useCallback((e: { key: string }) => {
        setSelectedMenuKey(e.key);
    }, []);

    const showMobileDrawer = useCallback(() => {
        setMobileDrawerVisible(true);
    }, []);

    const closeMobileDrawer = useCallback(() => {
        setMobileDrawerVisible(false);
    }, []);

    const handlePlayPause = useCallback(() => {
        const nextIsPlaying = !projectState.isPlaying;
        let timeToStartFrom = currentTime;

        if (currentTime >= projectState.totalDuration && projectState.totalDuration > 0 && nextIsPlaying) {
            timeToStartFrom = 0;
            setCurrentTime(0);
        }

        setProjectState(prev => ({ ...prev, isPlaying: nextIsPlaying }));
        lastUpdateTimeRef.current = Date.now();

        projectState.tracks.forEach(track => {
            track.clips.forEach(clip => {
                // Skip subtitle-associated text clips
                const isSubtitleClip = clip.type === 'text' && projectState.subtitles.some(sub => sub.id === clip.id);
                if (clip.type === 'video' && !isSubtitleClip) {
                    const element = mediaElementsRef.current[clip.id];
                    if (element instanceof HTMLVideoElement && element.readyState >= element.HAVE_METADATA) {
                        const isActive = timeToStartFrom >= clip.startTime && timeToStartFrom < clip.endTime;

                        if (nextIsPlaying) {
                            if (isActive && element.readyState >= element.HAVE_METADATA) {
                                if (element.playbackRate !== projectState.playbackRate) {
                                    element.playbackRate = projectState.playbackRate;
                                }
                                element.play().catch(e => console.warn("Autoplay prevented:", e));

                            } else if (!element.paused) {
                                element.pause();
                            }
                        } else {
                            if (!element.paused) {
                                element.pause();
                            }
                        }
                    }
                }
            });
        });

    }, [
        projectState.isPlaying, projectState.totalDuration, projectState.tracks,
        projectState.playbackRate, currentTime, projectState.subtitles // Added subtitles dependency
    ]);


    const handleTimelineSeek = useCallback((time: number) => {
        const newTime = Math.max(0, Math.min(time, projectState.totalDuration || 0));
        flushSync(() => {
            setCurrentTime(newTime);
        });

        lastUpdateTimeRef.current = Date.now();

        projectState.tracks.forEach(track => {
            track.clips.forEach(clip => {
                // Skip subtitle-associated text clips
                const isSubtitleClip = clip.type === 'text' && projectState.subtitles.some(sub => sub.id === clip.id);

                if (clip.type === 'video' && !isSubtitleClip) {
                    const element = mediaElementsRef.current[clip.id];
                    if (element instanceof HTMLVideoElement && element.readyState >= element.HAVE_METADATA) {
                        const clipTime = Math.max(0, newTime - clip.startTime);
                        const isActive = newTime >= clip.startTime && newTime < clip.endTime;

                        if (isActive || !projectState.isPlaying) { // Update video time if active OR paused
                            if (clipTime >= 0 && clipTime <= element.duration + 0.1) {
                                if(Math.abs(element.currentTime - clipTime) > 0.05) {
                                    try {
                                        element.currentTime = clipTime;
                                        // console.log(`Seeked ${clip.id} to ${clipTime}`);
                                    } catch(e) {
                                        console.warn(`Error setting currentTime for ${clip.id} during seek:`, e)
                                    }
                                }
                            }
                        }

                        if (projectState.isPlaying) {
                            if (isActive && element.paused) {
                                element.play().catch(e=>console.warn("Seek play prevented", e));
                            } else if (!isActive && !element.paused) {
                                element.pause();
                            }
                        } else {
                            if (!element.paused) {
                                element.pause();
                            }
                        }
                    }
                }
            });
        });
    }, [
        projectState.totalDuration, projectState.tracks, projectState.isPlaying, projectState.playbackRate, projectState.subtitles // Added subtitles dependency
    ]);

    const toggleMutePreview = useCallback(() => {
        setProjectState(prev => ({ ...prev, isPreviewMuted: !prev.isPreviewMuted }));
    }, []);

    const handlePlaybackRateChange = useCallback((rate: number) => {
        if (PLAYBACK_RATES.includes(rate)) {
            setProjectState(prev => ({ ...prev, playbackRate: rate }));
        }
    }, []);

    const handleCaptureSnapshot = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) { message.error("Preview canvas not available."); return; }
        try {
            drawFrame(currentTime);
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `snapshot_${projectState.projectName}_${formatTime(currentTime)}.png`;
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            message.success(`Snapshot captured at ${formatTime(currentTime)}`);
        } catch (error) {
            console.error("Failed to capture snapshot:", error);
            if (error instanceof DOMException && error.name === 'SecurityError') message.error("Failed to capture snapshot: Canvas may be tainted by cross-origin resources.");
            else message.error("Failed to capture snapshot.");
        }
    }, [currentTime, drawFrame, projectState.projectName]);

    const handleAddTextClip = useCallback(() => {
        setProjectState(prev => {
            const firstTrackId = prev.tracks[0]?.id || `track-${Date.now()}`;
            const targetTrackIndex = prev.tracks.findIndex(t => t.id === firstTrackId);
            const targetTrackId = targetTrackIndex !== -1 ? prev.tracks[targetTrackIndex].id : firstTrackId;

            const newClipStartTime = currentTime;
            const newTextClip: Clip = {
                id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, type: 'text', source: "Your text here", // Updated default text
                trackId: targetTrackId, startTime: newClipStartTime, endTime: newClipStartTime + DEFAULT_CLIP_DURATION,
                duration: DEFAULT_CLIP_DURATION, position: { x: 0.5, y: 0.5 }, scale: { x: 1, y: 1 },
                rotation: 0, opacity: 1, keyframes: {}, name: "Text Clip" // Updated default name
            };
            let updatedTracks = [...prev.tracks];

            if (targetTrackIndex === -1) {
                updatedTracks.push({ id: targetTrackId, clips: [newTextClip] });
            } else {
                updatedTracks[targetTrackIndex] = {
                    ...updatedTracks[targetTrackIndex],
                    clips: [...updatedTracks[targetTrackIndex].clips, newTextClip]
                };
            }

            const newTotalDuration = calculateTotalDuration(updatedTracks);
            return { ...prev, tracks: updatedTracks, totalDuration: newTotalDuration, selectedClipId: newTextClip.id };
        });
        message.success("Text clip added");
    }, [currentTime, calculateTotalDuration]);


    // --- Asset & Clip Management ---
    const handleUploadFinish = useCallback((fileName: string, file: File) => {
        message.success(`${fileName} uploaded successfully!`);
        const objectURL = URL.createObjectURL(file);
        const newAsset: MediaAsset = { id: `asset-${Date.now()}`, name: fileName, file, type: file.type, objectURL };
        const fileType = file.type.startsWith('video') ? 'video' : (file.type.startsWith('image') ? 'image' : 'unknown');
        if (fileType === 'unknown') {
            message.error("Unsupported file type."); URL.revokeObjectURL(objectURL);
            setEditorState(projectState.mediaAssets.length > 0 || projectState.subtitles.length > 0 ? 'editor' : 'initial'); // Check for subtitles too
            return;
        }

        let newClipStartTime = 0;
        const firstTrack = projectState.tracks[0];
        if (firstTrack && firstTrack.clips.length > 0) {
            // Find the latest end time across *all* tracks to append clips
            let maxEndTime = 0;
            projectState.tracks.forEach(track => {
                track.clips.forEach(clip => {
                    maxEndTime = Math.max(maxEndTime, clip.endTime);
                });
            });
            newClipStartTime = maxEndTime;
        }


        setProjectState(prev => {
            const firstTrackId = prev.tracks[0]?.id || `track-${Date.now()}`;
            const targetTrackIndex = prev.tracks.findIndex(t => t.id === firstTrackId);
            const targetTrackId = targetTrackIndex !== -1 ? prev.tracks[targetTrackIndex].id : firstTrackId;

            const newClip: Clip = {
                id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, type: fileType, source: objectURL,
                trackId: targetTrackId, startTime: newClipStartTime,
                duration: fileType === 'image' ? DEFAULT_CLIP_DURATION : 0.01, // Initial duration 0.01 for video, will be updated by metadata
                endTime: newClipStartTime + (fileType === 'image' ? DEFAULT_CLIP_DURATION : 0.01), // Initial endTime
                position: { x: 0.5, y: 0.5 }, scale: { x: 1, y: 1 }, rotation: 0, opacity: 1, keyframes: {}, name: fileName,
                thumbnailUrls: fileType === 'image' ? [{ time: 0, url: objectURL }] : [], // Image gets thumbnail immediately
            };
            let updatedTracks = [...prev.tracks];
            if (targetTrackIndex === -1) {
                updatedTracks.push({ id: targetTrackId, clips: [newClip] });
            } else {
                updatedTracks[targetTrackIndex] = {
                    ...updatedTracks[targetTrackIndex],
                    clips: [...updatedTracks[targetTrackIndex].clips, newClip]
                };
            }

            const newTotalDuration = calculateTotalDuration(updatedTracks);
            return {
                ...prev,
                mediaAssets: [...prev.mediaAssets, newAsset],
                tracks: updatedTracks,
                totalDuration: Math.max(prev.totalDuration, newTotalDuration) // Ensure total duration considers new clip
            };
        });
        setEditorState('editor');
    }, [projectState.mediaAssets.length, projectState.tracks, projectState.subtitles.length, calculateTotalDuration]); // Added subtitles.length dependency


    // --- Subtitles Handlers ---
    const handleUploadSrt = useCallback((file: File) => { // Moved this definition UP
        console.log("Handling SRT/VTT upload:", file.name);
        message.info(`Processing subtitle file: ${file.name}`);

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (text) {
                try {
                    const subtitles: SubtitleEntry[] = [];
                    const subtitleBlocks = text.split(/\r?\n\r?\n/);

                    subtitleBlocks.forEach(block => {
                        const lines = block.trim().split(/\r?\n/);
                        let timecodeLine = null;
                        let textLinesStart = -1;
                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i];
                            if (line.includes('-->') && line.match(/\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}/)) {
                                timecodeLine = line;
                                textLinesStart = i + 1;
                                break;
                            }
                        }

                        if (timecodeLine && textLinesStart !== -1 && lines.length > textLinesStart) {
                            const textLines = lines.slice(textLinesStart);
                            const timeMatch = timecodeLine.match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/);

                            if (timeMatch && timeMatch.length === 3) {
                                const startTimeStr = timeMatch[1];
                                const endTimeStr = timeMatch[2];
                                const subtitleText = textLines.join('\n').trim();

                                if (subtitleText) {
                                    const startTime = parseTimecodeToSeconds(startTimeStr);
                                    const endTime = parseTimecodeToSeconds(endTimeStr);

                                    subtitles.push({
                                        id: `subtitle-${Date.now()}-${subtitles.length}-${Math.random().toString(36).substring(2, 5)}`,
                                        startTime: startTime,
                                        endTime: endTime,
                                        text: subtitleText
                                    });
                                }
                            }
                        }
                    });

                    console.log(`Parsed ${subtitles.length} subtitle entries.`);
                    if (subtitles.length > 0) {
                        setProjectState(prev => {
                            // Create the new state including the loaded subtitles
                            const stateWithSubtitles = {
                                ...prev,
                                subtitles: subtitles,
                                // Recalculate total duration just in case subtitles extend it (though current model doesn't do this)
                                // The calculateTotalDuration only considers clips, so this is safe.
                                totalDuration: calculateTotalDuration(prev.tracks) // Ensure duration is correct after potential clip loading
                            };

                            // Now, find a clip to select within this derived state
                            // We'll try to select the first *text* clip (even if it's now associated with a subtitle)
                            // to make the Properties Panel potentially show text options.
                            // However, since subtitle text is drawn on canvas *separately* and not as a regular clip,
                            // selecting a *regular* text clip is still the goal if one exists.
                            // Or maybe the goal is to select the *first subtitle entry* to edit its properties?
                            // Let's assume the goal is to stay on the subtitles panel and potentially edit properties *of the selected subtitle entry*.
                            // The `selectedClipId` state is currently tied to timeline clips, not subtitle entries.
                            // A new state `selectedSubtitleId` would be needed for selecting/editing individual subtitles.
                            // For now, we'll just ensure the panel is on 'subtitles' and don't change selectedClipId unless it's a regular clip.

                            // Find an existing non-subtitle text clip to keep panel focused on text properties if one exists.
                            let existingTextClipId: string | null = null;
                            for(const track of stateWithSubtitles.tracks) {
                                const textClip = track.clips.find(c => c.type === 'text' && !stateWithSubtitles.subtitles.some(sub => sub.id === c.id));
                                if(textClip) {
                                    existingTextClipId = textClip.id;
                                    break;
                                }
                            }


                            return {
                                ...stateWithSubtitles,
                                // Keep the currently selected regular clip, or select an existing text clip if available
                                selectedClipId: existingTextClipId || prev.selectedClipId // Don't automatically select a new subtitle entry as if it were a clip
                            };
                        });

                        message.success(`Successfully loaded ${subtitles.length} subtitle entries.`);
                        setSelectedMenuKey('subtitles');

                    } else {
                        message.warning("No subtitle entries found in the file.");
                        setSelectedMenuKey('subtitles');
                    }

                } catch (error) {
                    console.error("Error parsing subtitle file:", error);
                    message.error("Failed to parse subtitle file.");
                    setSelectedMenuKey('subtitles');
                } finally {
                    setEditorState('editor');
                }
            } else {
                message.error("Subtitle file is empty.");
                setEditorState('editor');
                setSelectedMenuKey('subtitles');
            }
        };
        reader.onerror = (e) => {
            console.error("Error reading subtitle file:", e);
            message.error("Failed to read subtitle file.");
            setEditorState('editor');
            setSelectedMenuKey('subtitles');
        };
        reader.readAsText(file);

    }, [parseTimecodeToSeconds, calculateTotalDuration]);

    // --- ADDED: Update Subtitle Font Family Handler ---
    const updateSubtitleFontFamily = useCallback((font: string) => {
        setProjectState(prev => ({ ...prev, subtitleFontFamily: font }));
        // Trigger redraw after state update
        drawFrame(currentTime);
    }, [currentTime, drawFrame]);
    // ----------------------------------------------------

    // --- ADDED: Update Subtitle Font Size Handler ---
    const updateSubtitleFontSize = useCallback((size: number) => {
        setProjectState(prev => ({ ...prev, subtitleFontSize: size }));
        // Trigger redraw after state update
        drawFrame(currentTime);
    }, [currentTime, drawFrame]);
    // -------------------------------------------------

    // --- ADDED: Update Subtitle Text Alignment Handler ---
    const updateSubtitleTextAlign = useCallback((align: 'left' | 'center' | 'right') => {
        setProjectState(prev => ({ ...prev, subtitleTextAlign: align }));
        // Trigger redraw after state update
        drawFrame(currentTime);
    }, [currentTime, drawFrame]);
    // -------------------------------------------------------

    // --- ADDED: Toggle Subtitle Style Handlers --- <--- ADDED HERE
    const toggleSubtitleBold = useCallback(() => {
        setProjectState(prev => ({ ...prev, isSubtitleBold: !prev.isSubtitleBold }));
        drawFrame(currentTime);
    }, [currentTime, drawFrame]);

    const toggleSubtitleItalic = useCallback(() => {
        setProjectState(prev => ({ ...prev, isSubtitleItalic: !prev.isSubtitleItalic }));
        drawFrame(currentTime);
    }, [currentTime, drawFrame]);

    const toggleSubtitleUnderlined = useCallback(() => {
        setProjectState(prev => ({ ...prev, isSubtitleUnderlined: !prev.isSubtitleUnderlined }));
        drawFrame(currentTime);
    }, [currentTime, drawFrame]);
    // -------------------------------------------------


    const draggerProps: UploadProps = useMemo(() => ({ // This now comes AFTER handleUploadSrt and new handlers
        name: 'file', multiple: true, showUploadList: false, accept: "video/*,image/*,.srt,.vtt",
        customRequest: (options: any) => {
            const { file, onSuccess, onError } = options;
            try {
                if (file.type === 'application/x-subrip' || file.type === 'text/vtt' || file.name.toLowerCase().endsWith('.srt') || file.name.toLowerCase().endsWith('.vtt')) {
                    handleUploadSrt(file as File);
                    if (onSuccess) onSuccess({ status: 'done' }, file);
                } else {
                    handleUploadFinish(file.name, file as File);
                    if (onSuccess) onSuccess({ status: 'done' }, file);
                }
            } catch (error) {
                console.error("Upload processing error:", error);
                message.error(`Error processing ${file.name}`);
                setEditorState(projectState.mediaAssets.length > 0 || projectState.subtitles.length > 0 ? 'editor' : 'initial');
                if (onError) onError(error as Error, { status: 'error' });
            }
        },
        beforeUpload: (file: File) => {
            const isVideo = file.type.startsWith('video/');
            const isImage = file.type.startsWith('image/');
            const isSubtitle = file.type === 'application/x-subrip' || file.type === 'text/vtt' || file.name.toLowerCase().endsWith('.srt') || file.name.toLowerCase().endsWith('.vtt');

            if (!isVideo && !isImage && !isSubtitle) {
                message.error(`${file.name} is not a supported video, image, or subtitle file (.srt, .vtt).`);
                return Upload.LIST_IGNORE;
            }
            setEditorState('uploading');
            setUploadProgress(0);
            return true;
        },
        onChange(info: UploadChangeParam) {
            if (info.file.status === 'error') {
                // handleUploadFinish or handleUploadSrt already shows an error message
            } else if (info.file.status === 'done') {
                // State transition handled in customRequest success or handleUploadFinish/handleUploadSrt logic
            }
        },
        onDrop: (e: React.DragEvent<HTMLDivElement>) => {
            setEditorState('uploading');
            setUploadProgress(0);
        },
    }), [handleUploadFinish, handleUploadSrt, projectState.mediaAssets.length, projectState.subtitles.length]);


    const handleSelectClip = useCallback((clipId: string | null) => {
        // Do not select subtitle-associated text clips via this handler
        const clipToSelect = projectState.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
        const isSubtitleClip = clipToSelect?.type === 'text' && projectState.subtitles.some(sub => sub.id === clipId);

        if (!isSubtitleClip && projectState.selectedClipId !== clipId) {
            setProjectState(prev => ({ ...prev, selectedClipId: clipId }));
        } else if (isSubtitleClip && projectState.selectedClipId === clipId) {
            // If a subtitle clip was somehow selected, deselect it if clicked again
            setProjectState(prev => ({ ...prev, selectedClipId: null }));
        } else if (isSubtitleClip && projectState.selectedClipId !== clipId) {
            // Prevent selecting subtitle clips in the first place
            console.log("Attempted to select subtitle clip, prevented.");
            // Optionally deselect the current clip if trying to select a subtitle clip
            // setProjectState(prev => ({ ...prev, selectedClipId: null }));
        }


    }, [projectState.selectedClipId, projectState.tracks, projectState.subtitles]); // Added dependencies


    const updateSelectedClipProperty = useCallback((
        propUpdates: Partial<Omit<Clip, 'keyframes' | 'id' | 'trackId' | 'type' | 'source' | 'duration' | 'startTime' | 'endTime' | 'thumbnailUrls' | 'originalWidth' | 'originalHeight' | 'name'>>
    ) => {
        if (!projectState.selectedClipId) return;

        // Prevent updating properties for text clips associated with subtitles
        const selectedIsSubtitleClip = selectedClip?.type === 'text' && projectState.subtitles.some(sub => sub.id === projectState.selectedClipId);
        if (selectedIsSubtitleClip) {
            console.warn("Attempted to update properties of a subtitle clip via clip handler.");
            return; // Do not proceed with update
        }

        setProjectState(prev => ({
            ...prev,
            tracks: prev.tracks.map(track => ({
                ...track,
                clips: track.clips.map(clip =>
                    clip.id === prev.selectedClipId
                        ? { ...clip, ...propUpdates }
                        : clip
                )
            }))
        }));
    }, [projectState.selectedClipId, selectedClip, projectState.subtitles]); // Added dependencies

    const updateSelectedClipText = useCallback((newText: string) => {
        if (!projectState.selectedClipId) return;

        // Prevent updating text for text clips associated with subtitles
        const selectedIsSubtitleClip = selectedClip?.type === 'text' && projectState.subtitles.some(sub => sub.id === projectState.selectedClipId);
        if (selectedIsSubtitleClip) {
            console.warn("Attempted to update text of a subtitle clip via clip handler.");
            return; // Do not proceed with update
        }

        setProjectState(prev => ({
            ...prev,
            tracks: prev.tracks.map(track => ({
                ...track,
                clips: track.clips.map(clip =>
                    (clip.id === prev.selectedClipId && clip.type === 'text')
                        ? { ...clip, source: newText }
                        : clip
                )
            }))
        }));
    }, [projectState.selectedClipId, selectedClip, projectState.subtitles]); // Added dependencies

    const addOrUpdateKeyframe = useCallback((propName: keyof Clip['keyframes']) => {
        if (!selectedClip) return;

        // Prevent adding keyframes to text clips associated with subtitles
        const selectedIsSubtitleClip = selectedClip.type === 'text' && projectState.subtitles.some(sub => sub.id === selectedClip.id);
        if (selectedIsSubtitleClip) {
            console.warn("Attempted to add keyframe to a subtitle clip.");
            return; // Do not proceed
        }

        setProjectState(prev => {
            let trackIndex = -1; let clipIndex = -1;
            for (let ti = 0; ti < prev.tracks.length; ti++) {
                const ci = prev.tracks[ti].clips.findIndex(c => c.id === selectedClip.id);
                if (ci !== -1) { trackIndex = ti; clipIndex = ci; break; }
            }
            if (trackIndex === -1 || clipIndex === -1) return prev;

            const clipToUpdate = prev.tracks[trackIndex].clips[clipIndex];
            let propKey: keyof Clip | null = null;
            if (propName === 'position') propKey = 'position';
            else if (propName === 'scale') propKey = 'scale';
            else if (propName === 'rotation') propKey = 'rotation';
            else if (propName === 'opacity') propKey = 'opacity';
            if (!propKey) return prev;

            const defaultValue = clipToUpdate[propKey];
            const currentValue = interpolateValue(clipToUpdate.keyframes?.[propName], currentTime, defaultValue);

            const newKf: Keyframe = { time: currentTime, value: currentValue };

            const existingKfs = clipToUpdate.keyframes?.[propName] || [];
            const filteredKfs = existingKfs.filter(kf => Math.abs(kf.time - currentTime) > 0.001);
            const updatedPropertyKeyframes = [...filteredKfs, newKf].sort((a, b) => a.time - b.time);

            const updatedKeyframes = { ...clipToUpdate.keyframes, [propName]: updatedPropertyKeyframes };
            const updatedClip = { ...clipToUpdate, keyframes: updatedKeyframes };

            const updatedClips = [...prev.tracks[trackIndex].clips]; updatedClips[clipIndex] = updatedClip;
            const updatedTrack = { ...prev.tracks[trackIndex], clips: updatedClips };
            const updatedTracks = [...prev.tracks]; updatedTracks[trackIndex] = updatedTrack;
            return { ...prev, tracks: updatedTracks };
        });
        message.success(`Keyframe added for ${propName}`);
    }, [selectedClip, currentTime, projectState.subtitles]); // Added subtitles dependency


    const handleDeleteClip = useCallback(() => {
        if (!projectState.selectedClipId) return;

        // Prevent deleting text clips associated with subtitles via this handler
        const clipToDelete = projectState.tracks.flatMap(t => t.clips).find(c => c.id === projectState.selectedClipId);
        const isSubtitleClip = clipToDelete?.type === 'text' && projectState.subtitles.some(sub => sub.id === projectState.selectedClipId);

        if (isSubtitleClip) {
            console.warn("Attempted to delete a subtitle clip via clip handler.");
            return; // Do not proceed
        }

        const clipName = selectedClip?.name || 'Clip';
        setProjectState(prev => {
            const updatedTracks = prev.tracks
                .map(track => ({ ...track, clips: track.clips.filter(clip => clip.id !== prev.selectedClipId) }))
                .filter(track => track.clips.length > 0 || prev.tracks.length === 1);

            if (updatedTracks.length === 0) {
                updatedTracks.push({ id: `track-${Date.now()}`, clips: [] });
            }

            const newTotalDuration = calculateTotalDuration(updatedTracks);
            const newSelectedClipId = prev.selectedClipId === prev.selectedClipId ? null : prev.selectedClipId; // Deselect the deleted clip
            return { ...prev, tracks: updatedTracks, totalDuration: newTotalDuration, selectedClipId: newSelectedClipId };
        });
        message.success(`${clipName} deleted.`);
    }, [projectState.selectedClipId, selectedClip, calculateTotalDuration, projectState.subtitles]); // Added subtitles dependency


    const handleZoomMenuClick = useCallback(({ key }: { key: string }) => {
        let newZoomLevel = previewZoomLevel;
        let newZoomMode = previewZoomMode;
        if (key === PREVIEW_ZOOM_FIT_MODE) { newZoomLevel = fitScaleFactor; newZoomMode = PREVIEW_ZOOM_FIT_MODE; }
        else if (key === PREVIEW_ZOOM_FILL_MODE) { newZoomLevel = fillScaleFactor; newZoomMode = PREVIEW_ZOOM_FILL_MODE; }
        else {
            const level = parseFloat(key);
            if (!isNaN(level) && PREVIEW_ZOOM_LEVELS.includes(level)) {
                newZoomLevel = level;
                newZoomMode = `${Math.round(newZoomLevel * 100)}%`;
            } else {
                return;
            }
        }
        setPreviewZoomLevel(newZoomLevel);
        setPreviewZoomMode(newZoomMode);
    }, [previewZoomLevel, previewZoomMode, fitScaleFactor, fillScaleFactor]);

    // --- Timeline Moveable Handlers ---
    const onTimelineDragEnd = useCallback(({ target, isDrag, lastEvent }: OnDragEnd) => {
        if (!isDrag || !lastEvent?.beforeTranslate || !projectState.selectedClipId) return;

        // Prevent dragging subtitle-associated text clips
        const clip = projectState.tracks.flatMap(t => t.clips).find(c => c.id === projectState.selectedClipId);
        const isSubtitleClip = clip?.type === 'text' && projectState.subtitles.some(sub => sub.id === projectState.selectedClipId);
        if (isSubtitleClip) {
            console.warn("Attempted to drag a subtitle clip.");
            target.style.transform = target.style.transform.replace(/translateX\([^)]+\)/, ''); // Reset position visually
            return; // Do not proceed
        }


        if (!clip) return;

        const deltaPx = lastEvent.beforeTranslate[0];
        const pxPerSec = Math.max(20, timelineZoom);
        const deltaTime = deltaPx / pxPerSec;

        const newStartTime = Math.max(0, clip.startTime + deltaTime);
        const newEndTime = newStartTime + clip.duration;

        target.style.transform = target.style.transform.replace(/translateX\([^)]+\)/, '');

        flushSync(() => {
            setProjectState(prev => {
                const updatedTracks = prev.tracks.map(track => ({
                    ...track,
                    clips: track.clips.map(c =>
                        c.id === prev.selectedClipId
                            ? { ...c, startTime: newStartTime, endTime: newEndTime }
                            : c
                    )
                }));
                const newTotalDuration = calculateTotalDuration(updatedTracks);
                return { ...prev, tracks: updatedTracks, totalDuration: newTotalDuration };
            });
        });
        moveableRef.current?.updateRect();
    }, [projectState.selectedClipId, projectState.tracks, timelineZoom, calculateTotalDuration, projectState.subtitles]); // Added subtitles dependency

    const onTimelineResize = useCallback(({ target, width, drag, direction }: OnResize) => {
        // Allow resizing only for non-subtitle text clips
        const clipId = target.id.replace('clip-', '');
        const clip = projectState.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
        const isSubtitleClip = clip?.type === 'text' && projectState.subtitles.some(sub => sub.id === clipId);

        if (isSubtitleClip) {
            console.warn("Attempted to resize a subtitle clip.");
            // Optionally reset visual state if needed
            return; // Do not proceed
        }

        target.style.width = `${Math.max(1, width)}px`;
        const yTransform = target.style.transform.match(/translateY\([^)]+\)/)?.[0] || 'translateY(-50%)';
        if (direction[0] === -1) {
            target.style.transform = `translateX(${drag.beforeTranslate[0]}px) ${yTransform}`;
        } else {
            target.style.transform = yTransform;
        }
    }, [projectState.tracks, projectState.subtitles]); // Added dependencies

    const onTimelineResizeEnd = useCallback(({ target, isDrag, lastEvent }: OnResizeEnd) => {
        if (!isDrag || !lastEvent?.drag || !projectState.selectedClipId) return;

        // Prevent resizing subtitle-associated text clips
        const clip = projectState.tracks.flatMap(t => t.clips).find(c => c.id === projectState.selectedClipId);
        const isSubtitleClip = clip?.type === 'text' && projectState.subtitles.some(sub => sub.id === projectState.selectedClipId);
        if (isSubtitleClip) {
            console.warn("Attempted to resize a subtitle clip.");
            target.style.width = ''; // Reset width visually
            const yTransform = target.style.transform.match(/translateY\([^)]+\)/)?.[0] || 'translateY(-50%)';
            target.style.transform = yTransform; // Reset transform visually
            return; // Do not proceed
        }

        if (!clip) return;

        let newStartTime = clip.startTime;
        let newDuration = clip.duration;
        const pxPerSec = Math.max(20, timelineZoom);

        if (lastEvent.direction[0] === -1) {
            const deltaPx = lastEvent.drag.translate[0];
            const timeDelta = deltaPx / pxPerSec;
            const potentialNewStart = clip.startTime + timeDelta;
            newStartTime = Math.max(0, Math.min(potentialNewStart, clip.endTime - MIN_CLIP_DURATION));
            newDuration = clip.endTime - newStartTime;
        } else if (lastEvent.direction[0] === 1) {
            const widthPx = lastEvent.width;
            newDuration = Math.max(MIN_CLIP_DURATION, widthPx / pxPerSec);
            newStartTime = clip.startTime;
        }

        const newEndTime = newStartTime + newDuration;

        target.style.width = '';
        const yTransform = target.style.transform.match(/translateY\([^)]+\)/)?.[0] || 'translateY(-50%)';
        target.style.transform = yTransform;

        flushSync(() => {
            setProjectState(prev => {
                const updatedTracks = prev.tracks.map(track => ({
                    ...track,
                    clips: track.clips.map(c =>
                        c.id === prev.selectedClipId
                            ? { ...c, startTime: newStartTime, endTime: newEndTime, duration: newDuration }
                            : c
                    )
                }));
                const newTotalDuration = calculateTotalDuration(updatedTracks);
                return { ...prev, tracks: updatedTracks, totalDuration: newTotalDuration };
            });
        });
        moveableRef.current?.updateRect();
    }, [projectState.selectedClipId, projectState.tracks, timelineZoom, calculateTotalDuration, projectState.subtitles]); // Added subtitles dependency


    // --- Preview Moveable Handlers ---
    const onPreviewDragEnd = useCallback(({ lastEvent }: OnDragEnd) => {
        // Prevent drag for subtitle text clips
        const selectedIsSubtitleClip = selectedClip?.type === 'text' && projectState.subtitles.some(sub => sub.id === selectedClip.id);
        if (!lastEvent || !selectedClip || selectedIsSubtitleClip || !previewContainerRef.current || !projectState.canvasDimensions || (!selectedClip.originalWidth && selectedClip.type !== 'text') || (!selectedClip.originalHeight && selectedClip.type !== 'text')) {
            if (selectedIsSubtitleClip) console.warn("Attempted to drag a subtitle clip.");
            return;
        }


        // Calculate current position based on state/keyframes
        const currentPos = interpolateValue(selectedClip.keyframes?.position, currentTime, selectedClip.position);

        // Get pixel translation from moveable
        const deltaX_px = lastEvent.translate[0];
        const deltaY_px = lastEvent.translate[1];

        // Get the scale factor of the preview canvas relative to its original size
        const containerRect = previewContainerRef.current.getBoundingClientRect();
        const { width: canvasWidth, height: canvasHeight } = projectState.canvasDimensions;
        const currentContainerScale = previewZoomLevel; // Use the current zoom level

        if (currentContainerScale === 0 || canvasWidth === 0 || canvasHeight === 0) {
            console.warn("Cannot calculate position delta due to zero dimensions or scale.");
            return;
        }

        // Calculate percentage delta relative to canvas dimensions
        const deltaX_perc = deltaX_px / (canvasWidth * currentContainerScale);
        const deltaY_perc = deltaY_px / (canvasHeight * currentContainerScale);

        const newPosX = currentPos.x + deltaX_perc;
        const newPosY = currentPos.y + deltaY_perc;

        // Apply update
        const newPosition = { x: newPosX, y: newPosY };
        updateSelectedClipProperty({ position: newPosition });

        // Add keyframe if property changed
        const didChange = Math.abs(newPosition.x - currentPos.x) > 0.0001 || Math.abs(newPosition.y - currentPos.y) > 0.0001; // Use a small epsilon for float comparison
        if (didChange) {
            addOrUpdateKeyframe('position');
        }
        console.log("Preview Drag End - New Position (%):", newPosition);

    }, [selectedClip, currentTime, projectState.canvasDimensions, previewZoomLevel, updateSelectedClipProperty, addOrUpdateKeyframe, projectState.subtitles]); // Added subtitles dependency


    const onPreviewResizeEnd = useCallback(({ lastEvent, target }: OnResizeEnd) => {
        // Prevent resize for subtitle text clips
        const selectedIsSubtitleClip = selectedClip?.type === 'text' && projectState.subtitles.some(sub => sub.id === selectedClip.id);
        if (!lastEvent || !selectedClip || selectedIsSubtitleClip || !previewContainerRef.current || !projectState.canvasDimensions || (!selectedClip.originalWidth && selectedClip.type !== 'text') || (!selectedClip.originalHeight && selectedClip.type !== 'text')) {
            if (selectedIsSubtitleClip) console.warn("Attempted to resize a subtitle clip.");
            return;
        }


        // Calculate current scale based on state/keyframes
        const currentScale = interpolateValue(selectedClip.keyframes?.scale, currentTime, selectedClip.scale);

        // Get new size in pixels from moveable
        const newWidth_px = lastEvent.width;
        const newHeight_px = lastEvent.height;

        // Get the scale factor of the preview canvas relative to its original size
        const { width: canvasWidth, height: canvasHeight } = projectState.canvasDimensions;
        const currentContainerScale = previewZoomLevel;

        // Use default dimensions if original dimensions are not available (like for generic text clips)
        const originalClipWidth = selectedClip.originalWidth || (selectedClip.type === 'text' ? 300 : 100); // Match drawFrame defaults
        const originalClipHeight = selectedClip.originalHeight || (selectedClip.type === 'text' ? 80 : 100); // Match drawFrame defaults


        if (currentContainerScale === 0 || originalClipWidth === 0 || originalClipHeight === 0 || canvasWidth === 0 || canvasHeight === 0) {
            console.warn("Cannot calculate scale delta due to zero dimensions or scale.");
            return;
        }

        // Calculate the new scale factor relative to the original clip dimensions
        const newScaleX = newWidth_px / (originalClipWidth * currentContainerScale);
        const newScaleY = newHeight_px / (originalClipHeight * currentContainerScale);

        // Apply update - assuming uniform scale for now based on the panel structure
        // Use the newScaleX as the primary scale value
        const newScaleValue = { x: newScaleX, y: newScaleX }; // Assuming uniform scale

        updateSelectedClipProperty({ scale: newScaleValue });

        // Add keyframe if property changed
        const didChange = Math.abs(newScaleValue.x - currentScale.x) > 0.0001 || Math.abs(newScaleValue.y - currentScale.y) > 0.0001; // Use a small epsilon
        if (didChange) {
            addOrUpdateKeyframe('scale');
        }

        console.log("Preview Resize End - New Scale:", newScaleValue);

    }, [selectedClip, currentTime, projectState.canvasDimensions, previewZoomLevel, updateSelectedClipProperty, addOrUpdateKeyframe, projectState.subtitles]); // Added subtitles dependency

    const onPreviewRotateEnd = useCallback(({ lastEvent }: OnRotateEnd) => {
        // Prevent rotate for subtitle text clips
        const selectedIsSubtitleClip = selectedClip?.type === 'text' && projectState.subtitles.some(sub => sub.id === selectedClip.id);
        if (!lastEvent || !selectedClip || selectedIsSubtitleClip) {
            if (selectedIsSubtitleClip) console.warn("Attempted to rotate a subtitle clip.");
            return;
        }

        // Moveable provides rotate in degrees
        const finalRotation = lastEvent.lastEvent?.rotate || lastEvent.rotate || 0;

        // Apply update
        updateSelectedClipProperty({ rotation: finalRotation });

        // Add keyframe if property changed
        const currentRotation = interpolateValue(selectedClip.keyframes?.rotation, currentTime, selectedClip.rotation);
        const didChange = Math.abs(finalRotation - currentRotation) > 0.0001; // Use a small epsilon
        if (didChange) {
            addOrUpdateKeyframe('rotation');
        }
        console.log("Preview Rotate End - Rotation (degrees):", finalRotation);
    }, [selectedClip, currentTime, updateSelectedClipProperty, addOrUpdateKeyframe, projectState.subtitles]); // Added subtitles dependency


    const handleStartFromScratch = useCallback(() => {
        console.log("Starting subtitles from scratch");
        message.info("Start from scratch clicked (Placeholder)");
        setEditorState('editor');
        setSelectedMenuKey('subtitles');
        // Optionally add an initial empty subtitle entry
        if (projectState.subtitles.length === 0) {
            setProjectState(prev => ({
                ...prev,
                subtitles: [{ id: `subtitle-${Date.now()}`, startTime: currentTime, endTime: currentTime + 3, text: "" }]
            }));
        }
        // If a text clip exists, select it so the panel shows text options
        // No, we want to select the *subtitle entry* to edit its text/times.
        // This requires a new state `selectedSubtitleId`. For now, we just stay on the subtitles panel.
        // Deselect any currently selected clip
        setProjectState(prev => ({
            ...prev,
            selectedClipId: null // Ensure no clip is selected when focusing subtitles
        }));


    }, [currentTime, projectState.subtitles.length]);


    // --- Exposed Values ---
    return {
        // State
        editorState,
        projectState,
        setProjectState,
        currentTime,
        timelineZoom,
        setTimelineZoom,
        selectedMenuKey,
        mobileDrawerVisible,
        previewZoomLevel,
        previewZoomMode,
        // Refs
        timelineContainerRef,
        canvasRef,
        previewContainerRef,
        moveableRef,
        previewMoveableRef,
        // Handlers
        handleMenuClick,
        showMobileDrawer,
        closeMobileDrawer,
        handlePlayPause,
        handleTimelineSeek,
        toggleMutePreview,
        handlePlaybackRateChange,
        handleCaptureSnapshot,
        handleUploadFinish, // Keep for media files
        draggerProps, // Now handles both media and subtitles
        handleSelectClip, // Modified to ignore subtitle clips
        updateSelectedClipProperty, // Modified to ignore subtitle clips
        updateSelectedClipText, // Modified to ignore subtitle clips
        addOrUpdateKeyframe, // Modified to ignore subtitle clips
        handleDeleteClip, // Modified to ignore subtitle clips
        handleAddTextClip, // Regular text clips still usable
        handleUploadSrt, // Explicitly exposed if needed elsewhere, but main entry is draggerProps
        handleStartFromScratch, // Placeholder handler for subtitles
        updateSubtitleFontFamily, // <-- EXPOSED: Handler for updating subtitle font
        updateSubtitleFontSize, // <-- EXPOSED: Handler for updating subtitle font size
        updateSubtitleTextAlign, // <--- ADDED: Handler for updating subtitle alignment
        // --- EXPOSED: Toggle Subtitle Style Handlers --- <--- ADDED HERE
        toggleSubtitleBold,
        toggleSubtitleItalic,
        toggleSubtitleUnderlined,
        // -------------------------------------------------
        onTimelineDragEnd, // Modified to ignore subtitle clips
        onTimelineResize, // Modified to ignore subtitle clips
        onTimelineResizeEnd, // Modified to ignore subtitle clips
        onPreviewDragEnd, // Modified to ignore subtitle clips
        onPreviewResizeEnd, // Modified to ignore subtitle clips
        onPreviewRotateEnd, // Modified to ignore subtitle clips
        handleZoomMenuClick,
        // Derived State & Utils
        selectedClip,
        calculateTotalDuration,
        formatTime,
        // Constants
        PLAYBACK_RATES,
        PREVIEW_ZOOM_LEVELS,
        PREVIEW_ZOOM_FIT_MODE,
        PREVIEW_ZOOM_FILL_MODE,
        THUMBNAIL_INTERVAL,
        DEFAULT_SUBTITLE_FONT_SIZE // <-- Expose default size if needed
    };
};
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
    ThumbnailInfo
} from './types'; // Assuming types.ts is in the same directory

// --- New Types ---
export interface SubtitleEntry {
    id: string; // Unique ID for react keys and potential selection
    startTime: number; // in seconds
    endTime: number; // in seconds
    text: string;
}

// --- Constants ---
const THUMBNAIL_INTERVAL = 5;
const DEFAULT_CLIP_DURATION = 5;
const PLAYBACK_RATES = [0.25, 0.5, 1.0, 1.5, 2.0];
const MIN_CLIP_DURATION = 0.1;
export const PREVIEW_ZOOM_LEVELS = [0.1, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0, 8.0, 16.0];
export const PREVIEW_ZOOM_FIT_MODE = 'fit';
export const PREVIEW_ZOOM_FILL_MODE = 'fill';

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

const interpolateValue = (kfs: Keyframe[] | undefined, time: number, defaultValue: any): any => {
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
        return { x: p.x + (n.x - p.x) * factor, y: p.y + (n.y - n.y) * factor };
    }
    return pVal;
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
    const [projectState, setProjectState] = useState<EditorProjectState & { subtitles: SubtitleEntry[] }>({ // Add subtitles to state
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

            projectState.tracks.forEach(track => {
                track.clips.forEach(clip => {
                    if (time >= clip.startTime && time < clip.endTime) {
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
                                ctx.fillStyle = 'white';
                                // Calculate font size based on scaled clip height for better text fitting
                                // Use Math.min scale to prevent disproportionate font size with extreme scaling
                                const baseFontSize = 50; // Base font size before scaling
                                const fontSize = baseFontSize * Math.min(scale.x, scale.y); // Scale font size based on the minimum scale factor
                                // Adjust for canvas height to make size relative to preview area
                                const fontSizeRelative = (fontSize / 720) * projectState.canvasDimensions.height; // Assuming 720 is a reference height

                                ctx.font = `${fontSizeRelative}px Arial`;
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';

                                // Handle multi-line text (basic splitting by newline)
                                const lines = (clip.source as string).split('\n');
                                const lineHeight = fontSizeRelative * 1.2; // 1.2 times font size for line spacing
                                const startY = drawOffsetY - (lines.length - 1) * lineHeight / 2; // Center vertically

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

            // --- Draw Subtitles (Optional, depending on where they should appear - on canvas vs UI layer) ---
            // The request implies display on the timeline and the list, not necessarily burned onto the canvas preview.
            // If needed on canvas, add logic here:
            // projectState.subtitles.forEach(subtitle => {
            //     if (time >= subtitle.startTime && time < subtitle.endTime) {
            //         // Draw subtitle text at bottom center of canvas
            //         ctx.save();
            //         ctx.fillStyle = 'white'; // Subtitle color
            //         ctx.strokeStyle = 'black'; // Outline color
            //         ctx.lineWidth = 2; // Outline width
            //         ctx.font = `${(40/720)*height}px Arial`; // Font size relative to canvas height
            //         ctx.textAlign = 'center';
            //         ctx.textBaseline = 'bottom';
            //         const textLines = subtitle.text.split('\n');
            //         const lineHeight = (40/720)*height * 1.2;
            //         const startY = height - 20 - (textLines.length - 1) * lineHeight; // Position from bottom

            //         textLines.forEach((line, index) => {
            //             const y = startY + index * lineHeight;
            //             ctx.strokeText(line.trim(), width / 2, y); // Draw outline
            //             ctx.fillText(line.trim(), width / 2, y); // Draw text
            //         });
            //         ctx.restore();
            //     }
            // });
        },
        [projectState.tracks, projectState.canvasDimensions, projectState.subtitles] // Add subtitles dependency if drawing on canvas
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
                if ((clip.type === 'video' || clip.type === 'image') && typeof clip.source === 'string' && (clip.source.startsWith('blob:') || clip.source.startsWith('http'))) {
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
                                    clips: t.clips.map(c => c.id === clip.id ? {
                                        ...c,
                                        originalWidth: img.naturalWidth,
                                        originalHeight: img.naturalHeight,
                                        thumbnailUrls: [{ time: 0, url: c.source as string }]
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

        Object.keys(mediaElementsRef.current).forEach(id => {
            if (!currentClipIds.has(id)) {
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
        generateThumbnailsForClip, calculateTotalDuration
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

        if (!targetElement || !containerElement || !moveableInstance || !selectedClip) {
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

        const baseWidth = selectedClip.originalWidth || 100;
        const baseHeight = selectedClip.originalHeight || 100;

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
        previewZoomLevel, previewContainerRef, previewMoveableRef
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
        const nextIsPlaying = !projectState.isPlaying; // Trạng thái playing tiếp theo
        let timeToStartFrom = currentTime; // Thời gian hiện tại của editor

        // Nếu đang ở cuối và nhấn play, reset về đầu
        if (currentTime >= projectState.totalDuration && projectState.totalDuration > 0 && nextIsPlaying) {
            timeToStartFrom = 0;
            setCurrentTime(0); // Reset state thời gian global
        }

        // Cập nhật trạng thái playing global
        setProjectState(prev => ({ ...prev, isPlaying: nextIsPlaying }));
        lastUpdateTimeRef.current = Date.now(); // Reset bộ đếm cho renderLoop

        // Lặp qua các track và clip để điều khiển thẻ video tương ứng
        projectState.tracks.forEach(track => {
            track.clips.forEach(clip => {
                if (clip.type === 'video') {
                    const element = mediaElementsRef.current[clip.id];
                    if (element instanceof HTMLVideoElement) {
                        // Kiểm tra xem clip này có nên active tại thời điểm bắt đầu không
                        const isActive = timeToStartFrom >= clip.startTime && timeToStartFrom < clip.endTime;

                        if (nextIsPlaying) { // --- Nếu nhấn PLAY ---
                            if (isActive && element.readyState >= element.HAVE_METADATA) {
                                // Đảm bảo playbackRate đúng
                                if (element.playbackRate !== projectState.playbackRate) {
                                    element.playbackRate = projectState.playbackRate;
                                }

                                // *** THAY ĐỔI QUAN TRỌNG: ***
                                // KHÔNG cần set element.currentTime ở đây nữa.
                                // Gọi .play() sẽ tự động resume từ vị trí video đang dừng.
                                // Nếu trước đó có seek, handleTimelineSeek đã cập nhật currentTime rồi.
                                element.play().catch(e => console.warn("Autoplay prevented:", e));

                            } else if (!element.paused) {
                                // Nếu bắt đầu play (nextIsPlaying=true) nhưng clip này KHÔNG active,
                                // đảm bảo nó bị pause (ví dụ: nếu nó đang chạy từ lần play trước đó)
                                element.pause();
                            }
                        } else { // --- Nếu nhấn PAUSE ---
                            // Chỉ cần pause video nếu nó đang chạy
                            if (!element.paused) {
                                element.pause();
                            }
                        }
                    }
                }
            });
        });

        // KHÔNG cần gọi drawFrame(timeToStartFrom) ở đây nữa,
        // vì useEffect theo dõi isPlaying và currentTime sẽ đảm nhiệm việc vẽ frame
        // và bắt đầu/dừng renderLoop.

    }, [
        // Dependencies: state và giá trị cần thiết để quyết định play/pause
        projectState.isPlaying, projectState.totalDuration, projectState.tracks,
        projectState.playbackRate, currentTime
        // Không cần drawFrame làm dependency ở đây nữa
    ]);


    const handleTimelineSeek = useCallback((time: number) => {
        const newTime = Math.max(0, Math.min(time, projectState.totalDuration || 0));
        // Use flushSync to ensure the UI (playhead position) updates immediately
        // before any potential video element seeks that might trigger UI updates themselves.
        flushSync(() => {
            setCurrentTime(newTime);
        });

        lastUpdateTimeRef.current = Date.now();

        projectState.tracks.forEach(track => {
            track.clips.forEach(clip => {
                if (clip.type === 'video') {
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
        projectState.totalDuration, projectState.tracks, projectState.isPlaying, projectState.playbackRate
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
            setEditorState(projectState.mediaAssets.length > 0 ? 'editor' : 'initial');
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
                duration: fileType === 'image' ? DEFAULT_CLIP_DURATION : 0.01,
                endTime: newClipStartTime + (fileType === 'image' ? DEFAULT_CLIP_DURATION : 0.01),
                position: { x: 0.5, y: 0.5 }, scale: { x: 1, y: 1 }, rotation: 0, opacity: 1, keyframes: {}, name: fileName,
                thumbnailUrls: fileType === 'image' ? [{ time: 0, url: objectURL }] : [],
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
                totalDuration: Math.max(prev.totalDuration, newTotalDuration)
            };
        });
        setEditorState('editor');
    }, [projectState.mediaAssets.length, projectState.tracks, calculateTotalDuration]);

    const draggerProps: UploadProps = useMemo(() => ({
        name: 'file', multiple: true, showUploadList: false, accept: "video/*,image/*",
        customRequest: (options: any) => {
            const { file, onSuccess, onError } = options;
            try {
                handleUploadFinish(file.name, file as File);
                if (onSuccess) onSuccess({ status: 'done' }, file);
            } catch (error) {
                console.error("Upload processing error:", error);
                message.error(`Error processing ${file.name}`);
                if (onError) onError(error as Error, { status: 'error' });
                setEditorState(projectState.mediaAssets.length > 0 ? 'editor' : 'initial');
            }
        },
        beforeUpload: (file: File) => {
            const isVideo = file.type.startsWith('video/');
            const isImage = file.type.startsWith('image/');
            if (!isVideo && !isImage) {
                message.error(`${file.name} is not a supported video or image file.`);
                return Upload.LIST_IGNORE;
            }
            setEditorState('uploading');
            setUploadProgress(0);
            return true;
        },
        onChange(info: UploadChangeParam) {
            if (info.file.status === 'error') {
                // handleUploadFinish already shows an error message
            } else if (info.file.status === 'done') {
                // handleUploadFinish already sets state to 'editor'
            }
        },
        onDrop: (e: React.DragEvent<HTMLDivElement>) => {
            setEditorState('uploading');
            setUploadProgress(0);
        },
    }), [handleUploadFinish, projectState.mediaAssets.length]);

    const handleSelectClip = useCallback((clipId: string | null) => {
        if (projectState.selectedClipId !== clipId) {
            setProjectState(prev => ({ ...prev, selectedClipId: clipId }));
        }
    }, [projectState.selectedClipId]);

    const updateSelectedClipProperty = useCallback((
        propUpdates: Partial<Omit<Clip, 'keyframes' | 'id' | 'trackId' | 'type' | 'source' | 'duration' | 'startTime' | 'endTime' | 'thumbnailUrls' | 'originalWidth' | 'originalHeight' | 'name'>>
    ) => {
        if (!projectState.selectedClipId) return;
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
    }, [projectState.selectedClipId]);

    const updateSelectedClipText = useCallback((newText: string) => {
        if (!projectState.selectedClipId) return;
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
    }, [projectState.selectedClipId]);

    const addOrUpdateKeyframe = useCallback((propName: keyof Clip['keyframes']) => {
        if (!selectedClip) return;
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
    }, [selectedClip, currentTime]);

    const handleDeleteClip = useCallback(() => {
        if (!projectState.selectedClipId) return;
        const clipName = selectedClip?.name || 'Clip';
        setProjectState(prev => {
            const updatedTracks = prev.tracks
                .map(track => ({ ...track, clips: track.clips.filter(clip => clip.id !== prev.selectedClipId) }))
                .filter(track => track.clips.length > 0 || prev.tracks.length === 1);

            if (updatedTracks.length === 0) {
                updatedTracks.push({ id: `track-${Date.now()}`, clips: [] });
            }

            const newTotalDuration = calculateTotalDuration(updatedTracks);
            return { ...prev, tracks: updatedTracks, totalDuration: newTotalDuration, selectedClipId: null };
        });
        message.success(`${clipName} deleted.`);
    }, [projectState.selectedClipId, selectedClip, calculateTotalDuration]);

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
        const clip = projectState.tracks.flatMap(t => t.clips).find(c => c.id === projectState.selectedClipId);
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
    }, [projectState.selectedClipId, projectState.tracks, timelineZoom, calculateTotalDuration]);

    const onTimelineResize = useCallback(({ target, width, drag, direction }: OnResize) => {
        target.style.width = `${Math.max(1, width)}px`;
        const yTransform = target.style.transform.match(/translateY\([^)]+\)/)?.[0] || 'translateY(-50%)';
        if (direction[0] === -1) {
            target.style.transform = `translateX(${drag.beforeTranslate[0]}px) ${yTransform}`;
        } else {
            target.style.transform = yTransform;
        }
    }, []);

    const onTimelineResizeEnd = useCallback(({ target, isDrag, lastEvent }: OnResizeEnd) => {
        if (!isDrag || !lastEvent?.drag || !projectState.selectedClipId) return;
        const clip = projectState.tracks.flatMap(t => t.clips).find(c => c.id === projectState.selectedClipId);
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
    }, [projectState.selectedClipId, projectState.tracks, timelineZoom, calculateTotalDuration]);

    // --- Preview Moveable Handlers ---
    const onPreviewDragEnd = useCallback(({ lastEvent }: OnDragEnd) => {
        if (!lastEvent || !selectedClip || !previewContainerRef.current || !projectState.canvasDimensions) return;
        console.log("Preview Drag End - Translate (pixels):", lastEvent.translate);
        message.info("TODO: Update position after drag (needs coordinate conversion)");
    }, [selectedClip, projectState.canvasDimensions, previewZoomLevel, updateSelectedClipProperty, addOrUpdateKeyframe]);

    const onPreviewResizeEnd = useCallback(({ lastEvent, target }: OnResizeEnd) => {
        if (!lastEvent || !selectedClip || !previewContainerRef.current || !projectState.canvasDimensions || !selectedClip.originalWidth || !selectedClip.originalHeight) return;
        console.log("Preview Resize End - Size (pixels):", { width: lastEvent.width, height: lastEvent.height });
        message.info("TODO: Update scale after resize (needs coordinate conversion)");
    }, [selectedClip, projectState.canvasDimensions, previewZoomLevel, updateSelectedClipProperty, addOrUpdateKeyframe]);

    const onPreviewRotateEnd = useCallback(({ lastEvent }: OnRotateEnd) => {
        if (!lastEvent || !selectedClip) return;
        const finalRotation = lastEvent.lastEvent?.rotate || lastEvent.rotate || 0;
        updateSelectedClipProperty({ rotation: finalRotation });
        addOrUpdateKeyframe('rotation');
        console.log("Preview Rotate End - Rotation (degrees):", finalRotation);
    }, [selectedClip, updateSelectedClipProperty, addOrUpdateKeyframe]);

    // --- Subtitles Handlers ---
    const handleUploadSrt = useCallback((file: File) => {
        console.log("Handling SRT/VTT upload:", file.name);
        message.info(`Processing subtitle file: ${file.name}`);

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (text) {
                try {
                    // Basic SRT/VTT parsing
                    const subtitles: SubtitleEntry[] = [];
                    // Regex to find subtitle blocks (number, timecode line, text)
                    const subtitleBlocks = text.split(/\r?\n\r?\n/); // Split by double newline

                    subtitleBlocks.forEach(block => {
                        const lines = block.trim().split(/\r?\n/);
                        if (lines.length >= 2) {
                            // The first line is often the sequence number, can be skipped for basic parsing
                            // The second line is the timecode
                            const timecodeLine = lines[1];
                            const textLines = lines.slice(2); // Remaining lines are text

                            const timeMatch = timecodeLine.match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/);

                            if (timeMatch && timeMatch.length === 3) {
                                const startTimeStr = timeMatch[1];
                                const endTimeStr = timeMatch[2];
                                const subtitleText = textLines.join('\n').trim(); // Join text lines

                                if (subtitleText) {
                                    const startTime = parseTimecodeToSeconds(startTimeStr);
                                    const endTime = parseTimecodeToSeconds(endTimeStr);

                                    subtitles.push({
                                        id: `subtitle-${Date.now()}-${subtitles.length}`, // Simple unique ID
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
                        setProjectState(prev => ({
                            ...prev,
                            subtitles: subtitles,
                            // Optionally seek to the start of the first subtitle
                            // currentTime: subtitles[0].startTime, // Decided against auto-seeking for now
                            // isPlaying: false, // Ensure paused after loading subtitles
                        }));
                        message.success(`Successfully loaded ${subtitles.length} subtitle entries.`);
                        // Switch to subtitles menu after successful upload
                        setSelectedMenuKey('subtitles');
                    } else {
                        // Stay on subtitles menu, but show the upload UI again
                        setSelectedMenuKey('subtitles');
                    }

                } catch (error) {
                    console.error("Error parsing subtitle file:", error);
                    message.error("Failed to parse subtitle file.");
                    // Stay on subtitles menu
                    setSelectedMenuKey('subtitles');
                } finally {
                    // Ensure editor state is 'editor' after upload attempt
                    setEditorState('editor');
                }
            }
        };
        reader.onerror = (e) => {
            console.error("Error reading subtitle file:", e);
            message.error("Failed to read subtitle file.");
            setEditorState('editor'); // Ensure editor state is 'editor'
            setSelectedMenuKey('subtitles'); // Stay on subtitles menu
        };
        reader.readAsText(file);

    }, [parseTimecodeToSeconds]); // Added dependency

    const handleStartFromScratch = useCallback(() => {
        console.log("Starting subtitles from scratch (placeholder)");
        message.info("Start from scratch clicked (Placeholder)");
        // In a real scenario, this might initialize an empty subtitle track
        // or add the first empty subtitle entry ready for typing.
        // For now, we'll just set the menu key to 'subtitles' and ensure the editor is visible.
        setEditorState('editor');
        setSelectedMenuKey('subtitles');
        // Optionally add an initial empty subtitle entry
        if (projectState.subtitles.length === 0) {
            setProjectState(prev => ({
                ...prev,
                subtitles: [{ id: `subtitle-${Date.now()}`, startTime: currentTime, endTime: currentTime + 3, text: "" }]
            }));
        }
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
        handleUploadFinish,
        draggerProps,
        handleSelectClip,
        updateSelectedClipProperty,
        updateSelectedClipText,
        addOrUpdateKeyframe,
        handleDeleteClip,
        handleAddTextClip,
        handleUploadSrt, // Now performs parsing and state update
        handleStartFromScratch, // Placeholder handler
        onTimelineDragEnd,
        onTimelineResize,
        onTimelineResizeEnd,
        onPreviewDragEnd,
        onPreviewResizeEnd,
        onPreviewRotateEnd,
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
        THUMBNAIL_INTERVAL
    };
};
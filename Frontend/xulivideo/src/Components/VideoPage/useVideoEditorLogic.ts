// src/Components/VideoPage/useVideoEditorLogic.ts

import {
    useState, useEffect, useRef, useCallback, useMemo
} from 'react';
import { message, Upload } from 'antd';
import type { UploadProps } from 'antd';
// import { flushSync } from 'react-dom'; // Not strictly needed if effects handle drawing
import Moveable from 'react-moveable';
import type { OnDragEnd, OnResize, OnResizeEnd, OnRotateEnd } from 'react-moveable';
import { useLocation } from 'react-router-dom';
import { Client, StompSubscription } from '@stomp/stompjs'; // Assuming these are used by UploadManager

// Import types, constants, utils (ensure paths are correct)
import type {
    Clip, Track, MediaAsset, EditorProjectState, Keyframe, ThumbnailInfo,
    SubtitleEntry, ClipType // SrtSegment (if used by SubtitleManager)
} from './types';
import {
    THUMBNAIL_INTERVAL, DEFAULT_CLIP_DURATION, PLAYBACK_RATES, MIN_CLIP_DURATION,
    PREVIEW_ZOOM_LEVELS, PREVIEW_ZOOM_FIT_MODE, PREVIEW_ZOOM_FILL_MODE,
    DEFAULT_SUBTITLE_FONT_SIZE, DEFAULT_SUBTITLE_TEXT_ALIGN, SUBTITLE_FILL_COLOR, SUBTITLE_BACKGROUND_COLOR
} from '../../Hooks/constants';
import {
    formatTime, parseTimecodeToSeconds, interpolateValue, getWrappedLines,
    calculateTotalDuration
} from './utils';

// Import Controllers (ensure paths are correct)
import { CanvasRenderer } from '../../Hooks/Logic/CanvasRenderer';
import { PlaybackController } from '../../Hooks/Logic/PlaybackController';
import { MediaElementManager } from '../../Hooks/Logic/MediaElementManager';
import { ClipManager } from '../../Hooks/Logic/ClipManager';
import { UploadManager } from '../../Hooks/Logic/UploadManager';
import { SubtitleManager } from '../../Hooks/Logic/SubtitleManager';
import { PreviewMoveableController } from '../../Hooks/Logic/PreviewMoveableController';
import { TimelineMoveableController } from '../../Hooks/Logic/TimelineMoveableController';
import { PreviewZoomController } from '../../Hooks/Logic/PreviewZoomController';

type GenerateThumbnailsFunc = (clipId: string, videoElement: HTMLVideoElement) => Promise<ThumbnailInfo[]>;
type MediaElementsRefValue = { [key: string]: HTMLVideoElement | HTMLImageElement };

export const useVideoEditorLogic = (publicIdFromProp: string) => {
    const location = useLocation();
    const { initialVideoUrl, publicId: routePublicId } = (location.state as { initialVideoUrl?: string, publicId?: string }) || {};
    const currentPublicId = routePublicId || publicIdFromProp;

    // --- State ---
    const [editorState, setEditorState] = useState<'initial' | 'uploading' | 'transcribing' | 'editor'>(() => initialVideoUrl ? 'editor' : 'initial');
    const [selectedMenuKey, setSelectedMenuKey] = useState('media');
    const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [timelineZoom, setTimelineZoom] = useState(50); // pixels per second

    const [projectState, setProjectState] = useState<EditorProjectState>(() => {
        if (initialVideoUrl) {
            const clipId = `clip-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            const assetId = `asset-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
            const trackId = `track-${Date.now()}`;
            const initialClip: Clip = { id: clipId, type: 'video', source: initialVideoUrl, trackId, startTime: 0, duration: 0.01, endTime: 0.01, position: { x: 0.5, y: 0.5 }, scale: { x: 1, y: 1 }, rotation: 0, opacity: 1, keyframes: {}, name: `Loaded Video`, thumbnailUrls: [], originalWidth: 0, originalHeight: 0, secureUrl: initialVideoUrl };
            const initialAsset: MediaAsset = { id: assetId, name: 'Loaded Video', file: undefined, type: 'video/mp4', objectURL: undefined, secureUrl: initialVideoUrl };
            const initialTracks: Track[] = [{ id: trackId, clips: [initialClip] }];
            return {
                projectName: `Project ${currentPublicId}`, tracks: initialTracks, mediaAssets: [initialAsset], canvasDimensions: { width: 1280, height: 720 }, totalDuration: calculateTotalDuration(initialTracks), selectedClipId: clipId, isPlaying: false, isPreviewMuted: false, playbackRate: 1.0, uploadProgress: 0, uploadingFile: null, currentUploadTaskId: null, uploadTimeRemaining: '00:00', previewZoomLevel: 1.0, previewZoomMode: PREVIEW_ZOOM_FIT_MODE, subtitles: [], subtitleFontFamily: 'Arial', subtitleFontSize: DEFAULT_SUBTITLE_FONT_SIZE, subtitleTextAlign: DEFAULT_SUBTITLE_TEXT_ALIGN, isSubtitleBold: false, isSubtitleItalic: false, isSubtitleUnderlined: false, subtitleColor: SUBTITLE_FILL_COLOR, subtitleBackgroundColor: SUBTITLE_BACKGROUND_COLOR,
            };
        }
        return {
            projectName: `New Project ${currentPublicId}`, tracks: [{ id: `track-${Date.now()}`, clips: [] }], mediaAssets: [], canvasDimensions: { width: 1280, height: 720 }, totalDuration: 0, selectedClipId: null, isPlaying: false, isPreviewMuted: false, playbackRate: 1.0, uploadProgress: 0, uploadingFile: null, currentUploadTaskId: null, uploadTimeRemaining: '00:00', previewZoomLevel: 1.0, previewZoomMode: PREVIEW_ZOOM_FIT_MODE, subtitles: [], subtitleFontFamily: 'Arial', subtitleFontSize: DEFAULT_SUBTITLE_FONT_SIZE, subtitleTextAlign: DEFAULT_SUBTITLE_TEXT_ALIGN, isSubtitleBold: false, isSubtitleItalic: false, isSubtitleUnderlined: false, subtitleColor: SUBTITLE_FILL_COLOR, subtitleBackgroundColor: SUBTITLE_BACKGROUND_COLOR,
        };
    });

    // --- Refs ---
    const timelineContainerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number | null>(null); // Holds the rAF ID
    const mediaElementsRef = useRef<MediaElementsRefValue>({});
    const moveableRef = useRef<Moveable>(null);
    const previewMoveableRef = useRef<Moveable>(null);
    const lastUpdateTimeRef = useRef<number>(Date.now()); // Initialized
    const stompClientRef = useRef<Client | null>(null);
    const stompSubscriptionRef = useRef<StompSubscription | null>(null);
    const uploadStartTimeRef = useRef<number | null>(null);

    // --- Memoized Derived State ---
    const totalDuration = useMemo(() => calculateTotalDuration(projectState.tracks), [projectState.tracks]);
    const selectedClip = useMemo(() => {
        if (!projectState.selectedClipId) return null;
        for (const track of projectState.tracks) {
            const clip = track.clips.find(c => c.id === projectState.selectedClipId);
            if (clip) return clip;
        }
        return null;
    }, [projectState.tracks, projectState.selectedClipId]);
    const selectedVideoSecureUrl = useMemo(() => {
        if (selectedClip?.type === 'video') {
            return selectedClip.secureUrl || (typeof selectedClip.source === 'string' && selectedClip.source.startsWith('http') ? selectedClip.source : null);
        }
        return null;
    }, [selectedClip]);

    // --- START: Define URLs before they are used by Controllers ---
    const uploadUrl = useMemo(() => `http://localhost:8080/api/projects/${currentPublicId}/videos`, [currentPublicId]);
    const transcriptionUrl = `http://localhost:8080/api/subtitles`;
    const websocketEndpoint = 'http://localhost:8080/ws';
    // --- END: Define URLs ---

    // --- Utility Callbacks (Thumbnail Generation - ASSUMED UNCHANGED) ---
    const generateSingleThumbnail = useCallback(
        async (videoElement: HTMLVideoElement, time: number): Promise<string | null> => {
            return new Promise((resolve) => {
                if (!videoElement || videoElement.readyState < videoElement.HAVE_METADATA || !isFinite(videoElement.duration) || !videoElement.videoWidth || !videoElement.videoHeight) {
                    resolve(null); return;
                }
                const offscreenCanvas = document.createElement('canvas');
                offscreenCanvas.width = 160; offscreenCanvas.height = 90;
                const ctx = offscreenCanvas.getContext('2d', { alpha: false });
                if (!ctx) { resolve(null); return; }

                const targetTime = Math.min(Math.max(0, time), videoElement.duration);
                const originalTime = videoElement.currentTime;
                const wasPaused = videoElement.paused;
                let seekHandlerAttached = false;

                const cleanupListeners = () => {
                    if (seekHandlerAttached) videoElement.removeEventListener('seeked', processFrame);
                    videoElement.removeEventListener('error', seekErrorHandler);
                };

                const processFrame = () => {
                    cleanupListeners();
                    if (!videoElement.parentNode || !ctx || !mediaElementsRef.current[videoElement.id] || mediaElementsRef.current[videoElement.id] !== videoElement) {
                        resolve(null); return;
                    }
                    try {
                        ctx.drawImage(videoElement, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
                        const dataUrl = offscreenCanvas.toDataURL('image/jpeg', 0.7);
                        try { if (Math.abs(videoElement.currentTime - originalTime) > 0.01) videoElement.currentTime = originalTime; } catch(e) { /* ignore */ }
                        if (!wasPaused) videoElement.play().catch(() => {});
                        resolve(dataUrl);
                    } catch (e) { console.error("Error generating thumbnail data URL:", e); resolve(null); }
                };
                const seekErrorHandler = (event: Event) => {
                    cleanupListeners(); resolve(null);
                    try { if (Math.abs(videoElement.currentTime - originalTime) > 0.01) videoElement.currentTime = originalTime; if (!wasPaused) videoElement.play().catch(() => {}); } catch (restoreError) { /* ignore */ }
                };
                videoElement.addEventListener('error', seekErrorHandler, { once: true });
                if (Math.abs(videoElement.currentTime - targetTime) > 0.1 && videoElement.seekable.length > 0 && videoElement.duration > 0) {
                    if (!wasPaused) videoElement.pause();
                    seekHandlerAttached = true;
                    videoElement.addEventListener('seeked', processFrame, { once: true });
                    videoElement.currentTime = targetTime;
                } else if (videoElement.readyState >= videoElement.HAVE_CURRENT_DATA) {
                    if (!wasPaused) videoElement.pause();
                    requestAnimationFrame(() => { if (videoElement.readyState >= videoElement.HAVE_CURRENT_DATA) processFrame(); else { cleanupListeners(); resolve(null); } });
                } else { cleanupListeners(); resolve(null); }
            });
        },
        [mediaElementsRef] // mediaElementsRef is stable
    );
    const generateThumbnailsForClip = useCallback<GenerateThumbnailsFunc>(
        async (clipId: string, videoElement: HTMLVideoElement): Promise<ThumbnailInfo[]> => {
            const duration = videoElement.duration;
            if (!duration || !isFinite(duration) || duration <= 0) return [];
            const thumbnailTimes: number[] = [0.1];
            for (let t = THUMBNAIL_INTERVAL; t < duration; t += THUMBNAIL_INTERVAL) thumbnailTimes.push(t);
            if (duration > 0.2 && !thumbnailTimes.some(t => Math.abs(t - (duration - 0.1)) < 0.01)) thumbnailTimes.push(Math.max(0.1, duration - 0.1));
            const uniqueSortedTimes = Array.from(new Set(thumbnailTimes)).sort((a,b) => a-b);
            const generatedThumbnails: ThumbnailInfo[] = [];
            for (const time of uniqueSortedTimes) {
                const currentElement = mediaElementsRef.current[clipId];
                if (!currentElement || !(currentElement instanceof HTMLVideoElement) || currentElement !== videoElement) break;
                const url = await generateSingleThumbnail(currentElement, time);
                if (url) generatedThumbnails.push({ time, url });
            }
            return generatedThumbnails;
        },
        [generateSingleThumbnail] // generateSingleThumbnail is stable due to its own dependencies
    );

    // Callback for UploadManager (ASSUMED UNCHANGED)
    const onProcessMediaFinishCallback = useCallback((file: File, secureUrl: string, originalFileName: string) => {
        const fileType: ClipType = file.type.startsWith('video') ? 'video' : 'image';
        setProjectState(prev => {
            let newClipStartTime = 0;
            prev.tracks.forEach(track => track.clips.forEach(clip => newClipStartTime = Math.max(newClipStartTime, clip.endTime)));
            const firstTrackId = prev.tracks[0]?.id || `track-${Date.now()}`;
            const targetTrackIndex = prev.tracks.findIndex(t => t.id === firstTrackId);
            const targetTrackId = targetTrackIndex !== -1 ? prev.tracks[targetTrackIndex].id : firstTrackId;
            const newClip: Clip = {
                id: `clip-${Date.now()}`, type: fileType, source: secureUrl, trackId: targetTrackId,
                startTime: newClipStartTime, duration: fileType === 'image' ? DEFAULT_CLIP_DURATION : 0.01,
                endTime: newClipStartTime + (fileType === 'image' ? DEFAULT_CLIP_DURATION : 0.01),
                position: { x: 0.5, y: 0.5 }, scale: { x: 1, y: 1 }, rotation: 0, opacity: 1, keyframes: {},
                name: originalFileName,
                thumbnailUrls: fileType === 'image' ? [{ time: 0, url: secureUrl }] : [],
                originalWidth: 0, originalHeight: 0, secureUrl: secureUrl
            };
            let updatedTracks = [...prev.tracks];
            if (targetTrackIndex === -1) updatedTracks.push({ id: targetTrackId, clips: [newClip] });
            else updatedTracks[targetTrackIndex] = { ...updatedTracks[targetTrackIndex], clips: [...updatedTracks[targetTrackIndex].clips, newClip] };

            const updatedMediaAssets = [...prev.mediaAssets];
            const existingAssetIndex = updatedMediaAssets.findIndex(asset => asset.file === file);
            if (existingAssetIndex !== -1) {
                const assetToUpdate = updatedMediaAssets[existingAssetIndex];
                if (assetToUpdate.objectURL?.startsWith('blob:')) URL.revokeObjectURL(assetToUpdate.objectURL);
                updatedMediaAssets[existingAssetIndex] = { ...assetToUpdate, secureUrl: secureUrl, objectURL: undefined, file: undefined };
            } else {
                updatedMediaAssets.push({ id: `asset-${Date.now()}`, name: originalFileName, type: file.type, secureUrl: secureUrl });
            }
            return { ...prev, mediaAssets: updatedMediaAssets, tracks: updatedTracks, totalDuration: Math.max(prev.totalDuration, calculateTotalDuration(updatedTracks)), selectedClipId: newClip.id };
        });
    }, [setProjectState]);


    // --- Instantiate Controllers (ASSUMED UNCHANGED, dependencies are refs or stable callbacks) ---
    const canvasRenderer = useMemo(() => new CanvasRenderer(canvasRef, interpolateValue), [canvasRef]); // interpolateValue is stable
    const playbackController = useMemo(() => new PlaybackController(setProjectState, setCurrentTime, mediaElementsRef, canvasRenderer.drawFrame.bind(canvasRenderer), animationFrameRef , lastUpdateTimeRef), [setProjectState, setCurrentTime, mediaElementsRef, canvasRenderer, lastUpdateTimeRef]);
    const mediaElementManager = useMemo(() => new MediaElementManager(mediaElementsRef, setProjectState, calculateTotalDuration, generateThumbnailsForClip), [mediaElementsRef, setProjectState, generateThumbnailsForClip]);
    const clipManager = useMemo(() => new ClipManager(setProjectState, calculateTotalDuration, mediaElementsRef), [setProjectState, mediaElementsRef]);
    const uploadManager = useMemo(() => new UploadManager(setProjectState, setEditorState, uploadUrl, websocketEndpoint, uploadStartTimeRef, stompClientRef, stompSubscriptionRef, onProcessMediaFinishCallback), [setProjectState, setEditorState, uploadUrl, websocketEndpoint, onProcessMediaFinishCallback, uploadStartTimeRef, stompClientRef, stompSubscriptionRef]);
    const subtitleManager = useMemo(() => new SubtitleManager(setProjectState, setEditorState, setSelectedMenuKey, canvasRenderer.drawFrame.bind(canvasRenderer), parseTimecodeToSeconds, calculateTotalDuration, transcriptionUrl), [setProjectState, setEditorState, setSelectedMenuKey, canvasRenderer, transcriptionUrl, parseTimecodeToSeconds, calculateTotalDuration]);
    const previewMoveableController = useMemo(() => new PreviewMoveableController(previewMoveableRef, previewContainerRef, clipManager.updateSelectedClipProperty.bind(clipManager), clipManager.addOrUpdateKeyframe.bind(clipManager), interpolateValue), [previewMoveableRef, previewContainerRef, clipManager]);
    const timelineMoveableController = useMemo(() => new TimelineMoveableController(moveableRef, setProjectState, calculateTotalDuration), [moveableRef, setProjectState]);
    const previewZoomController = useMemo(() => new PreviewZoomController(previewContainerRef, setProjectState), [previewContainerRef, setProjectState]);

    // --- Animation Loop Management ---
    const animationFrameCallbackRef = useRef<(() => void) | null>(null); // CORRECTED: Initialized to null

    // This effect updates the function that requestAnimationFrame will call.
    useEffect(() => {
        animationFrameCallbackRef.current = () => {
            playbackController.renderLoop(
                currentTime,
                projectState,
                editorState,
                () => {
                    if (projectState.isPlaying && editorState === 'editor' && animationFrameRef.current !== null && animationFrameCallbackRef.current) {
                        animationFrameRef.current = requestAnimationFrame(animationFrameCallbackRef.current);
                    }
                }
            );
        };
    }, [currentTime, projectState, editorState, playbackController]);

    // This effect manages starting/stopping the animation loop and drawing static frames.
    useEffect(() => {
        if (editorState === 'editor') {
            if (projectState.isPlaying) {
                if (lastUpdateTimeRef.current === null || Date.now() - lastUpdateTimeRef.current > 1000 ) {
                    lastUpdateTimeRef.current = Date.now();
                }
                if (animationFrameRef.current === null && animationFrameCallbackRef.current) { // Ensure callback is set
                    animationFrameRef.current = requestAnimationFrame(animationFrameCallbackRef.current);
                }
            } else {
                if (animationFrameRef.current !== null) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                }
                canvasRenderer.drawFrame(currentTime, projectState, mediaElementsRef.current);
            }
        } else {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            if (projectState.isPlaying) {
                setProjectState(prev => ({ ...prev, isPlaying: false }));
            }
        }
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [editorState, projectState.isPlaying, currentTime, projectState, canvasRenderer, setProjectState, playbackController]); // Added currentTime & projectState as drawFrame depends on them when paused


    // Effect for ResizeObserver (Preview Zoom - UNCHANGED from previous correct version)
    useEffect(() => {
        const container = previewContainerRef.current;
        if (!container) return;
        previewZoomController.handleContainerResize(projectState); // Call it once initially
        const observer = new ResizeObserver(() => previewZoomController.handleContainerResize(projectState));
        observer.observe(container);
        return () => { observer.unobserve(container); observer.disconnect(); };
    }, [previewContainerRef, previewZoomController, projectState.canvasDimensions, projectState.previewZoomMode, projectState.previewZoomLevel]);

    // Effect for Syncing Media Elements (UNCHANGED)
    useEffect(() => {
        mediaElementManager.syncMediaElements(projectState, mediaElementsRef.current, currentTime);
    }, [projectState, currentTime, mediaElementManager]);

    // Effect for Preview Moveable Target Update
    useEffect(() => {
        const targetElement = previewContainerRef.current?.querySelector('.moveable-target-preview') as HTMLElement;
        const containerElement = previewContainerRef.current;
        const moveableInstance = previewMoveableRef.current;
        const selectedIsSubtitleClip = selectedClip?.type === 'text' && projectState.subtitles.some(sub => sub.id === selectedClip?.id);

        if (!targetElement || !containerElement || !moveableInstance || !selectedClip || selectedIsSubtitleClip) {
            if (targetElement) targetElement.style.display = 'none';
            moveableInstance?.updateRect();
            return;
        }
        targetElement.style.display = 'block';
        const { canvasDimensions } = projectState;
        const containerRect = containerElement.getBoundingClientRect();
        const currentContainerScale = projectState.previewZoomLevel;
        if (!containerRect.width || !containerRect.height || !canvasDimensions.width || !canvasDimensions.height || currentContainerScale <= 0) { targetElement.style.display = 'none'; moveableInstance?.updateRect(); return; }
        const displayWidth = canvasDimensions.width * currentContainerScale; const displayHeight = canvasDimensions.height * currentContainerScale;
        const canvasOffsetX = (containerRect.width - displayWidth) / 2; const canvasOffsetY = (containerRect.height - displayHeight) / 2;
        const pos = interpolateValue(selectedClip.keyframes?.position, currentTime, selectedClip.position);
        const scale = interpolateValue(selectedClip.keyframes?.scale, currentTime, selectedClip.scale);
        const rotation = interpolateValue(selectedClip.keyframes?.rotation, currentTime, selectedClip.rotation ?? 0);
        const opacity = interpolateValue(selectedClip.keyframes?.opacity, currentTime, selectedClip.opacity ?? 1);
        const baseWidth = selectedClip.originalWidth || (selectedClip.type === 'text' ? 300 : 100);
        const baseHeight = selectedClip.originalHeight || (selectedClip.type === 'text' ? 80 : 100);
        if (baseWidth <= 0 || baseHeight <= 0) { targetElement.style.display = 'none'; moveableInstance?.updateRect(); return; }
        const clipOriginalCenterRelativeToOriginX = pos.x * canvasDimensions.width; const clipOriginalCenterRelativeToOriginY = pos.y * canvasDimensions.height;
        const clipOriginalTopLeftRelativeToOriginX = clipOriginalCenterRelativeToOriginX - (baseWidth * scale.x / 2); const clipOriginalTopLeftRelativeToOriginY = clipOriginalCenterRelativeToOriginY - (baseHeight * scale.y / 2);
        const clipFinalTopLeftX_InContainer = (clipOriginalTopLeftRelativeToOriginX * currentContainerScale) + canvasOffsetX; const clipFinalTopLeftY_InContainer = (clipOriginalTopLeftRelativeToOriginY * currentContainerScale) + canvasOffsetY;
        const clipScaledWidthOnCanvas = baseWidth * scale.x * currentContainerScale; const clipScaledHeightOnCanvas = baseHeight * scale.y * currentContainerScale;
        targetElement.style.width = `${clipScaledWidthOnCanvas}px`; targetElement.style.height = `${clipScaledHeightOnCanvas}px`;
        targetElement.style.left = `${clipFinalTopLeftX_InContainer}px`; targetElement.style.top = `${clipFinalTopLeftY_InContainer}px`;
        targetElement.style.opacity = `${opacity}`; targetElement.style.transform = `rotate(${rotation}deg)`;
        moveableInstance.updateRect();
    }, [selectedClip, currentTime, projectState.canvasDimensions, projectState.previewZoomLevel, projectState.subtitles, interpolateValue]); // CORRECTED: Removed projectState.keyframes

    // Main Cleanup Effect (UNCHANGED)
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            if (stompSubscriptionRef.current) stompSubscriptionRef.current.unsubscribe();
            if (stompClientRef.current?.active) stompClientRef.current.deactivate();
            stompClientRef.current = null;
            stompSubscriptionRef.current = null;
            mediaElementManager.cleanupMediaElements(mediaElementsRef.current);
            mediaElementsRef.current = {};
        };
    }, [currentPublicId, mediaElementManager]);


    // --- UI Handlers ---
    const handleMenuClick = useCallback((e: { key: string }) => setSelectedMenuKey(e.key), [setSelectedMenuKey]);
    const showMobileDrawer = useCallback(() => setMobileDrawerVisible(true), [setMobileDrawerVisible]);
    const closeMobileDrawer = useCallback(() => setMobileDrawerVisible(false), [setMobileDrawerVisible]);

    const handlePlayPause = useCallback(() => playbackController.handlePlayPause(currentTime, projectState, editorState), [playbackController, currentTime, projectState, editorState]);
    const handleTimelineSeek = useCallback((time: number) => playbackController.handleTimelineSeek(time, projectState), [playbackController, projectState]);

    const toggleMutePreview = useCallback(() => playbackController.toggleMutePreview(), [playbackController]);
    const handlePlaybackRateChange = useCallback((rate: number) => playbackController.handlePlaybackRateChange(rate), [playbackController]);
    const handleCaptureSnapshot = useCallback(() => { /* TODO */ }, []);
    const handleManualMediaUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => uploadManager.handleManualMediaUpload(event), [uploadManager]);
    const handleSelectClip = useCallback((clipId: string | null) => clipManager.handleSelectClip(clipId, projectState), [clipManager, projectState]);
    const handleAddTextClip = useCallback(() => clipManager.handleAddTextClip(currentTime, projectState), [clipManager, currentTime, projectState]);
    const handleDeleteClip = useCallback(() => clipManager.handleDeleteClip(projectState, mediaElementsRef.current), [clipManager, projectState, mediaElementsRef]);
    const updateSelectedClipProperty = useCallback((propUpdates: any) => clipManager.updateSelectedClipProperty(propUpdates, projectState), [clipManager, projectState]);
    const updateSelectedClipText = useCallback((newText: string) => clipManager.updateSelectedClipText(newText, projectState), [clipManager, projectState]);
    const addOrUpdateKeyframe = useCallback((propName: keyof NonNullable<Clip['keyframes']>) => clipManager.addOrUpdateKeyframe(propName, currentTime, selectedClip, projectState), [clipManager, currentTime, selectedClip, projectState]);

    const handleUploadSrt = useCallback((file: File) => subtitleManager.handleUploadSrt(file, projectState), [subtitleManager, projectState]);
    const handleStartFromScratch = useCallback(() => subtitleManager.handleStartFromScratch(selectedClip, selectedVideoSecureUrl, currentTime, projectState), [subtitleManager, selectedClip, selectedVideoSecureUrl, currentTime, projectState]);
    const updateSubtitleFontFamily = useCallback((font: string) => subtitleManager.updateSubtitleFontFamily(font, currentTime, projectState, mediaElementsRef.current), [subtitleManager, currentTime, projectState, mediaElementsRef]);
    const updateSubtitleFontSize = useCallback((size: number) => subtitleManager.updateSubtitleFontSize(size, currentTime, projectState, mediaElementsRef.current), [subtitleManager, currentTime, projectState, mediaElementsRef]);
    const updateSubtitleTextAlign = useCallback((align: 'left' | 'center' | 'right') => subtitleManager.updateSubtitleTextAlign(align, currentTime, projectState, mediaElementsRef.current), [subtitleManager, currentTime, projectState, mediaElementsRef]);
    const toggleSubtitleBold = useCallback(() => subtitleManager.toggleSubtitleBold(currentTime, projectState, mediaElementsRef.current), [subtitleManager, currentTime, projectState, mediaElementsRef]);
    const toggleSubtitleItalic = useCallback(() => subtitleManager.toggleSubtitleItalic(currentTime, projectState, mediaElementsRef.current), [subtitleManager, currentTime, projectState, mediaElementsRef]);
    const toggleSubtitleUnderlined = useCallback(() => subtitleManager.toggleSubtitleUnderlined(currentTime, projectState, mediaElementsRef.current), [subtitleManager, currentTime, projectState, mediaElementsRef]);
    const updateSubtitleColor = useCallback((color: string) => subtitleManager.updateSubtitleColor(color, currentTime, projectState, mediaElementsRef.current), [subtitleManager, currentTime, projectState, mediaElementsRef]);
    const updateSubtitleBackgroundColor = useCallback((color: string) => subtitleManager.updateSubtitleBackgroundColor(color, currentTime, projectState, mediaElementsRef.current), [subtitleManager, currentTime, projectState, mediaElementsRef]);

    const draggerProps: UploadProps = useMemo(() => ({
        name: 'file', multiple: false, accept: '.srt,.vtt', showUploadList: false,
        customRequest: (options: any) => { /* TODO */ },
        beforeUpload: (file: File) => { /* TODO */ return true; },
    }), []);

    const onTimelineDragEnd = useCallback((e: OnDragEnd) => timelineMoveableController.onTimelineDragEnd(e, selectedClip, projectState, timelineZoom), [timelineMoveableController, selectedClip, projectState, timelineZoom]);
    const onTimelineResize = useCallback((e: OnResize) => timelineMoveableController.onTimelineResize(e, projectState), [timelineMoveableController, projectState]);
    const onTimelineResizeEnd = useCallback((e: OnResizeEnd) => timelineMoveableController.onTimelineResizeEnd(e, selectedClip, projectState, timelineZoom), [timelineMoveableController, selectedClip, projectState, timelineZoom]);
    const onPreviewDragEnd = useCallback((e: OnDragEnd) => previewMoveableController.onPreviewDragEnd(e, selectedClip, currentTime, projectState), [previewMoveableController, selectedClip, currentTime, projectState]);
    const onPreviewResizeEnd = useCallback((e: OnResizeEnd) => previewMoveableController.onPreviewResizeEnd(e, selectedClip, currentTime, projectState), [previewMoveableController, selectedClip, currentTime, projectState]);
    const onPreviewRotateEnd = useCallback((e: OnRotateEnd) => previewMoveableController.onPreviewRotateEnd(e, selectedClip, currentTime, projectState), [previewMoveableController, selectedClip, currentTime, projectState]);
    const handleZoomMenuClick = useCallback(({ key }: { key: string }) => previewZoomController.handleZoomMenuClick({ key }, projectState), [previewZoomController, projectState]);

    // --- Exposed Values ---
    return {
        editorState, setEditorState, projectState, setProjectState, currentTime, timelineZoom, setTimelineZoom,
        selectedMenuKey, mobileDrawerVisible, uploadProgress: projectState.uploadProgress,
        uploadingFile: projectState.uploadingFile, currentUploadTaskId: projectState.currentUploadTaskId,
        uploadTimeRemaining: projectState.uploadTimeRemaining, previewZoomLevel: projectState.previewZoomLevel,
        previewZoomMode: projectState.previewZoomMode, timelineContainerRef, canvasRef, previewContainerRef,
        moveableRef, previewMoveableRef, handleMenuClick, showMobileDrawer, closeMobileDrawer, handlePlayPause,
        handleTimelineSeek, toggleMutePreview, handlePlaybackRateChange, handleCaptureSnapshot, draggerProps,
        handleManualMediaUpload, handleSelectClip, updateSelectedClipProperty, updateSelectedClipText,
        addOrUpdateKeyframe, handleDeleteClip, handleAddTextClip, handleUploadSrt, handleStartFromScratch,
        updateSubtitleFontFamily, updateSubtitleFontSize, updateSubtitleTextAlign, toggleSubtitleBold,
        toggleSubtitleItalic, toggleSubtitleUnderlined, updateSubtitleColor, updateSubtitleBackgroundColor,
        onTimelineDragEnd, onTimelineResize, onTimelineResizeEnd, onPreviewDragEnd, onPreviewResizeEnd,
        onPreviewRotateEnd, handleZoomMenuClick, selectedClip, selectedVideoSecureUrl, totalDuration, formatTime,
        interpolateValue, PLAYBACK_RATES, PREVIEW_ZOOM_LEVELS, PREVIEW_ZOOM_FIT_MODE, PREVIEW_ZOOM_FILL_MODE,
        THUMBNAIL_INTERVAL, DEFAULT_SUBTITLE_FONT_SIZE,
    };
};
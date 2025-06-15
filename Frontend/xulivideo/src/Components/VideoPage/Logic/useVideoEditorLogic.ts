// src/Hooks/useVideoEditorLogic.ts

import {
    useState, useEffect, useRef, useCallback, useMemo, SetStateAction, Dispatch
} from 'react';
import { message, Upload } from 'antd';
import type { UploadProps } from 'antd';
import Moveable from 'react-moveable';
import type { OnDragEnd, OnResize, OnResizeEnd, OnRotateEnd } from 'react-moveable';
import { useLocation } from 'react-router-dom';
import {Client, IMessage, StompSubscription} from '@stomp/stompjs';
import SockJS from "sockjs-client";

// --- FFmpeg ---
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
// --- End FFmpeg ---

// Import types, constants, utils
import type {
    Clip, Track, MediaAsset, EditorProjectState, Keyframe, ThumbnailInfo,
    SubtitleEntry, ClipType, EditorStatus, VideoClip // Đảm bảo VideoClip cũng được import
} from '../../VideoPage/types'; // Adjust path if needed
import { // Path here is relative to your project structure, ensure it's correct
    THUMBNAIL_INTERVAL, DEFAULT_CLIP_DURATION, PLAYBACK_RATES, MIN_CLIP_DURATION,
    PREVIEW_ZOOM_LEVELS, PREVIEW_ZOOM_FIT_MODE, PREVIEW_ZOOM_FILL_MODE,
    DEFAULT_SUBTITLE_FONT_SIZE, DEFAULT_SUBTITLE_TEXT_ALIGN, SUBTITLE_FILL_COLOR, SUBTITLE_BACKGROUND_COLOR
} from '../../../Hooks/constants'; // Adjust path if needed (was '../../../Hooks/constants', now corrected based on common project structure)
import { // Path here is relative to your project structure, ensure it's correct
    formatTime, parseTimecodeToSeconds, interpolateValue, getWrappedLines,
    calculateTotalDuration
} from '../utils'; // Adjust path if needed (was '../utils', now corrected based on common project structure)

// Import Controllers (paths adjusted to reflect common project structure)
import { CanvasRenderer } from '../../../Hooks/Logic/CanvasRenderer';
import { PlaybackController } from '../../../Hooks/Logic/PlaybackController';
import { MediaElementManager } from '../../../Hooks/Logic/MediaElementManager';
import { ClipManager } from '../../../Hooks/Logic/ClipManager';
import { UploadManager } from '../../../Hooks/Logic/UploadManager';
import { SubtitleManager, TranscriptionOptions } from '../../../Hooks/Logic/SubtitleManager';
import { PreviewMoveableController } from '../../../Hooks/Logic/PreviewMoveableController';
import { TimelineMoveableController } from '../../../Hooks/Logic/TimelineMoveableController';
import { PreviewZoomController } from '../../../Hooks/Logic/PreviewZoomController';

// NEW: Import the new hook
import { useApiSubtitleBurning } from '../../../Hooks/Logic/useApiSubtitleBurning'; // ADJUST THIS PATH if needed


type GenerateThumbnailsFunc = (clipId: string, videoElement: HTMLVideoElement) => Promise<ThumbnailInfo[]>;
type MediaElementsRefValue = { [key: string]: HTMLVideoElement | HTMLImageElement };
type FFmpegProgressCallback = ({ progress, time }: { progress: number; time?: number }) => void;


// --- FFmpeg Configuration ---
const FFMPEG_CORE_PATH = '/ffmpeg-core/ffmpeg-core.js';
// --- End FFmpeg Configuration ---


export const useVideoEditorLogic = (publicIdFromProp: string) => {
    const location = useLocation();
    const { initialVideoUrl, publicId: routePublicId } = (location.state as { initialVideoUrl?: string, publicId?: string }) || {};
    const currentPublicId = routePublicId || publicIdFromProp;

    const ffmpegRef = useRef<FFmpeg | null>(null);
    const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
    const [isBurningSubtitles, setIsBurningSubtitles] = useState(false); // For client-side FFmpeg burning
    const [burningProgress, setBurningProgress] = useState(0); // For client-side FFmpeg burning
    const ffmpegProgressCallbackRef = useRef<FFmpegProgressCallback | null>(null);

    const [isDesaturating, setIsDesaturating] = useState(false);
    const [desaturationProgress, setDesaturationProgress] = useState(0);
    const desaturationProgressCallbackRef = useRef<FFmpegProgressCallback | null>(null);

    const [isExtractingAudio, setIsExtractingAudio] = useState(false);
    const [audioExtractionProgress, setAudioExtractionProgress] = useState(0);
    const audioExtractionProgressCallbackRef = useRef<FFmpegProgressCallback | null>(null);

    const [uploadedSrtFileContent, setUploadedSrtFileContent] = useState<string | null>(null);

    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcriptionProgress, setTranscriptionProgress] = useState(0);
    const targetTranscriptionProgressRef = useRef(0);
    const animationFrameProgressRef = useRef<number | null>(null);
    const [transcribingFileName, setTranscribingFileName] = useState<string | null>(null);
    const isTranscribingRef = useRef(isTranscribing);
    const pendingSubtitlesRef = useRef<SubtitleEntry[] | null>(null);

    useEffect(() => {
        isTranscribingRef.current = isTranscribing;
    }, [isTranscribing]);


    const [editorState, setEditorState] = useState<EditorStatus>(() => initialVideoUrl ? 'editor' : 'initial');
    const [selectedMenuKey, setSelectedMenuKey] = useState('media');
    const [currentTime, setCurrentTime] = useState(0);
    const [timelineZoom, setTimelineZoom] = useState(50);
    const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);


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
                areSubtitlesVisibleOnCanvas: true, // THÊM DÒNG NÀY (mặc định hiển thị)
            };
        }
        return {
            projectName: `New Project ${currentPublicId}`, tracks: [{ id: `track-${Date.now()}`, clips: [] }], mediaAssets: [], canvasDimensions: { width: 1280, height: 720 }, totalDuration: 0, selectedClipId: null, isPlaying: false, isPreviewMuted: false, playbackRate: 1.0, uploadProgress: 0, uploadingFile: null, currentUploadTaskId: null, uploadTimeRemaining: '00:00', previewZoomLevel: 1.0, previewZoomMode: PREVIEW_ZOOM_FIT_MODE, subtitles: [], subtitleFontFamily: 'Arial', subtitleFontSize: DEFAULT_SUBTITLE_FONT_SIZE, subtitleTextAlign: DEFAULT_SUBTITLE_TEXT_ALIGN, isSubtitleBold: false, isSubtitleItalic: false, isSubtitleUnderlined: false, subtitleColor: SUBTITLE_FILL_COLOR, subtitleBackgroundColor: SUBTITLE_BACKGROUND_COLOR,
            areSubtitlesVisibleOnCanvas: true, // THÊM DÒNG NÀY (mặc định hiển thị)
        };
    });

    // NEW: Ref để luôn giữ projectState mới nhất
    const projectStateRef = useRef<EditorProjectState>(projectState);
    useEffect(() => {
        projectStateRef.current = projectState;
    }, [projectState]);

    const timelineContainerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const mediaElementsRef = useRef<MediaElementsRefValue>({});
    const moveableRef = useRef<Moveable>(null);
    const previewMoveableRef = useRef<Moveable>(null);
    const lastUpdateTimeRef = useRef<number>(Date.now());
    const stompClientRef = useRef<Client | null>(null); // For general transcription/upload
    const stompSubscriptionRef = useRef<StompSubscription | null>(null); // For general transcription/upload
    const uploadStartTimeRef = useRef<number | null>(null);

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
        const firstVideoAsset = projectState.mediaAssets.find(asset => asset.type.startsWith('video/') && asset.secureUrl);
        return firstVideoAsset?.secureUrl || null;
    }, [selectedClip, projectState.mediaAssets]);

    const uploadUrl = useMemo(() => `http://localhost:8080/api/projects/${currentPublicId}/videos`, [currentPublicId]);
    const transcriptionUrl = `http://localhost:8080/api/subtitles`;
    // Changed addSubtitleApiUrl to reflect the actual endpoint structure
    const addSubtitleApiUrl = `http://localhost:8080/test/${currentPublicId}/subtitles`;

    const websocketEndpoint = 'http://localhost:8080/ws';

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
                const seekErrorHandler = (_event: Event) => {
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
        [mediaElementsRef]
    );
    const handleMergeSubtitles = useCallback((firstSubtitleId: string) => {
        setProjectState(prev => {
            const currentSubtitles = [...prev.subtitles];
            const firstIndex = currentSubtitles.findIndex(sub => sub.id === firstSubtitleId);

            if (firstIndex === -1) {
                console.warn("Cannot merge: First subtitle not found.");
                return prev;
            }

            if (firstIndex >= currentSubtitles.length - 1) {
                console.warn("Cannot merge: No subsequent subtitle to merge with.");
                return prev;
            }

            const firstSub = currentSubtitles[firstIndex];
            const secondSub = currentSubtitles[firstIndex + 1];

            const mergedSubtitle: SubtitleEntry = {
                id: firstSub.id,
                text: `${firstSub.text} ${secondSub.text}`.trim(),
                startTime: firstSub.startTime,
                endTime: secondSub.endTime,
            };

            const updatedSubtitles = [
                ...currentSubtitles.slice(0, firstIndex),
                mergedSubtitle,
                ...currentSubtitles.slice(firstIndex + 2)
            ];

            message.success("Subtitles merged successfully.");
            return {
                ...prev,
                subtitles: updatedSubtitles,
            };
        });
    }, [setProjectState]);


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
        [generateSingleThumbnail, mediaElementsRef]
    );
    const onProcessMediaFinishCallback = useCallback(
        (file: File, secureUrl: string, originalFileName: string) => {
            console.log(`Video uploaded and processed. Secure URL: ${secureUrl}`);
            console.log(`Associated Project Public ID for this video: ${currentPublicId}`);

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
        }, [setProjectState, currentPublicId]
    );

    const animateTranscriptionProgress = useCallback(() => {
        if (transcriptionProgress < targetTranscriptionProgressRef.current) {
            setTranscriptionProgress(prev => {
                const step = 1;
                const nextProgress = Math.min(prev + step, targetTranscriptionProgressRef.current);

                if (nextProgress >= targetTranscriptionProgressRef.current) {
                    if (animationFrameProgressRef.current) {
                        cancelAnimationFrame(animationFrameProgressRef.current);
                        animationFrameProgressRef.current = null;
                    }
                    if (targetTranscriptionProgressRef.current >= 100) {
                        setIsTranscribing(false);
                        if (pendingSubtitlesRef.current) {
                            const finalSubtitles = pendingSubtitlesRef.current;
                            setProjectState(prev => ({
                                ...prev,
                                subtitles: finalSubtitles,
                                totalDuration: calculateTotalDuration(prev.tracks),
                                selectedClipId: null,
                                areSubtitlesVisibleOnCanvas: true, // Hiển thị lại phụ đề khi transcribe xong
                            }));
                            if (finalSubtitles.length > 0) {
                                message.success(`Subtitles loaded: ${finalSubtitles.length} entries.`);
                            } else {
                                message.info("Processing complete, no subtitle entries to display.");
                            }
                            pendingSubtitlesRef.current = null;
                        }
                        setTimeout(() => {
                            if (targetTranscriptionProgressRef.current >= 100 && !isTranscribingRef.current) {
                                setTranscribingFileName(null);
                            }
                        }, 3000);
                    }
                    return targetTranscriptionProgressRef.current;
                }
                return nextProgress;
            });
            if (animationFrameProgressRef.current !== null || (transcriptionProgress < targetTranscriptionProgressRef.current && targetTranscriptionProgressRef.current > transcriptionProgress)) {
                animationFrameProgressRef.current = requestAnimationFrame(animateTranscriptionProgress);
            }
        } else {
            setTranscriptionProgress(targetTranscriptionProgressRef.current);
            if (animationFrameProgressRef.current) {
                cancelAnimationFrame(animationFrameProgressRef.current);
                animationFrameProgressRef.current = null;
            }
            if (targetTranscriptionProgressRef.current >= 100) {
                setIsTranscribing(false);
                if (pendingSubtitlesRef.current) {
                    const finalSubtitles = pendingSubtitlesRef.current;
                    setProjectState(prev => ({
                        ...prev,
                        subtitles: finalSubtitles,
                        totalDuration: calculateTotalDuration(prev.tracks),
                        selectedClipId: null,
                        areSubtitlesVisibleOnCanvas: true, // Hiển thị lại phụ đề khi transcribe xong
                    }));
                    if (finalSubtitles.length > 0) {
                        message.success(`Subtitles loaded: ${finalSubtitles.length} entries.`);
                    } else {
                        message.info("Processing complete, no subtitle entries to display.");
                    }
                    pendingSubtitlesRef.current = null;
                }
                setTimeout(() => {
                    if (targetTranscriptionProgressRef.current >= 100 && !isTranscribingRef.current) {
                        setTranscribingFileName(null);
                    }
                }, 3000);
            }
        }
    }, [transcriptionProgress, isTranscribingRef, setIsTranscribing, setTranscribingFileName, setTranscriptionProgress, setProjectState]);


    const handleTranscriptionProgress = useCallback((progress: number, fileName?: string, subtitles?: SubtitleEntry[]) => {
        const previousTarget = targetTranscriptionProgressRef.current;
        targetTranscriptionProgressRef.current = progress;
        pendingSubtitlesRef.current = null;

        if (fileName && (progress >= 0 && progress < 100)) {
            if (!transcribingFileName) setTranscribingFileName(fileName);
        }

        if (progress >= 0 && !isTranscribing && progress < 100) {
            setIsTranscribing(true);
            setProjectState(prev => ({ ...prev, subtitles: [], areSubtitlesVisibleOnCanvas: true })); // Đảm bảo hiển thị phụ đề khi bắt đầu transcribe
        }

        if (progress < 0) {
            setIsTranscribing(false);
            setTranscriptionProgress(0);
            if (animationFrameProgressRef.current) {
                cancelAnimationFrame(animationFrameProgressRef.current);
                animationFrameProgressRef.current = null;
            }
            targetTranscriptionProgressRef.current = 0;
            pendingSubtitlesRef.current = null;
            setProjectState(prev => ({ ...prev, subtitles: [], areSubtitlesVisibleOnCanvas: true })); // Đảm bảo hiển thị nếu lỗi
            setTimeout(() => {
                setTranscribingFileName(null);
            }, 3000);
            return;
        }

        if (progress >= 100 && subtitles) {
            pendingSubtitlesRef.current = subtitles;
        } else if (progress >= 100 && !subtitles && !pendingSubtitlesRef.current) {
            pendingSubtitlesRef.current = [];
        }

        if (animationFrameProgressRef.current === null && transcriptionProgress < targetTranscriptionProgressRef.current) {
            animationFrameProgressRef.current = requestAnimationFrame(animateTranscriptionProgress);
        } else if (transcriptionProgress >= previousTarget && progress > previousTarget) {
            if (animationFrameProgressRef.current === null) {
                animationFrameProgressRef.current = requestAnimationFrame(animateTranscriptionProgress);
            }
        } else if (transcriptionProgress >= targetTranscriptionProgressRef.current && progress < 100) {
            setTranscriptionProgress(targetTranscriptionProgressRef.current);
            if (animationFrameProgressRef.current) {
                cancelAnimationFrame(animationFrameProgressRef.current);
                animationFrameProgressRef.current = null;
            }
        }

    }, [isTranscribing, animateTranscriptionProgress, transcriptionProgress, transcribingFileName, setProjectState, setTranscriptionProgress, setIsTranscribing, setTranscribingFileName]);


    const canvasRenderer = useMemo(() => new CanvasRenderer(canvasRef, interpolateValue), [canvasRef]);
    const playbackController = useMemo(() => new PlaybackController(setProjectState, setCurrentTime, mediaElementsRef, canvasRenderer.drawFrame.bind(canvasRenderer), animationFrameRef , lastUpdateTimeRef), [setProjectState, setCurrentTime, mediaElementsRef, canvasRenderer, lastUpdateTimeRef]);

    const mediaElementManager = useMemo(() => new MediaElementManager(mediaElementsRef, setProjectState, calculateTotalDuration, generateThumbnailsForClip), [mediaElementsRef, setProjectState, calculateTotalDuration, generateThumbnailsForClip]);
    const clipManager = useMemo(() => new ClipManager(setProjectState, calculateTotalDuration, mediaElementsRef), [setProjectState, mediaElementsRef]);
    const uploadManager = useMemo(() => new UploadManager(setProjectState, setEditorState, uploadUrl, websocketEndpoint, uploadStartTimeRef, stompClientRef, stompSubscriptionRef, onProcessMediaFinishCallback), [setProjectState, setEditorState, uploadUrl, websocketEndpoint, onProcessMediaFinishCallback, uploadStartTimeRef, stompClientRef, stompSubscriptionRef]);

    const subtitleManager = useMemo(() => new SubtitleManager(
        setProjectState,
        setEditorState,
        setSelectedMenuKey,
        canvasRenderer.drawFrame.bind(canvasRenderer),
        parseTimecodeToSeconds,
        calculateTotalDuration,
        transcriptionUrl,
        handleTranscriptionProgress,
        websocketEndpoint,
        stompClientRef,
        stompSubscriptionRef
    ), [
        setProjectState, setEditorState, setSelectedMenuKey, canvasRenderer,
        transcriptionUrl, parseTimecodeToSeconds, calculateTotalDuration,
        handleTranscriptionProgress, websocketEndpoint, stompClientRef, stompSubscriptionRef
    ]);

    const previewMoveableController = useMemo(() => new PreviewMoveableController(previewMoveableRef, previewContainerRef, clipManager.updateSelectedClipProperty.bind(clipManager), clipManager.addOrUpdateKeyframe.bind(clipManager), interpolateValue), [previewMoveableRef, previewContainerRef, clipManager]);
    const timelineMoveableController = useMemo(() => new TimelineMoveableController(moveableRef, setProjectState, calculateTotalDuration), [moveableRef, setProjectState]);
    const previewZoomController = useMemo(() => new PreviewZoomController(previewContainerRef, setProjectState), [previewContainerRef, setProjectState]);

    // NEW: Use the new hook here
    const { isApiBurningSubtitles, apiBurningProgress, callAddSubtitleApi } = useApiSubtitleBurning({
        currentPublicId,
        projectState, // Pass current projectState
        subtitleManager, // Pass subtitleManager to generate ASS content
        websocketEndpoint,
        addSubtitleApiUrl,
        setProjectState, // Pass projectState setter to update with new video URL
        selectedVideoSecureUrl, // Pass the currently active video URL for update logic
    });


    const loadFFmpeg = useCallback(async () => {
        if (ffmpegRef.current && ffmpegRef.current.loaded) {
            setFfmpegLoaded(true);
            return;
        }
        try {
            message.info('Loading FFmpeg library...');
            const ffmpegInstance = new FFmpeg();
            await ffmpegInstance.load({ coreURL: FFMPEG_CORE_PATH });
            ffmpegRef.current = ffmpegInstance;
            setFfmpegLoaded(true);
            message.success('FFmpeg library loaded successfully.');
        } catch (error) {
            console.error('Failed to load FFmpeg:', error);
            message.error(`Failed to load FFmpeg. Export/Processing features might not work. Error: ${error instanceof Error ? error.message : String(error)}`);
            setFfmpegLoaded(false);
        }
    }, []);

    useEffect(() => { loadFFmpeg(); }, [loadFFmpeg]);

    const animationFrameCallbackRef = useRef<(() => void) | null>(null);

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

    useEffect(() => {
        if (editorState === 'editor') {
            if (projectState.isPlaying) {
                if (lastUpdateTimeRef.current === null || Date.now() - lastUpdateTimeRef.current > 1000 ) {
                    lastUpdateTimeRef.current = Date.now();
                }
                if (animationFrameRef.current === null && animationFrameCallbackRef.current) {
                    animationFrameRef.current = requestAnimationFrame(animationFrameCallbackRef.current);
                }
            } else {
                if (animationFrameRef.current !== null) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                }
                if (canvasRef.current && canvasRef.current.getContext('2d')) {
                    canvasRenderer.drawFrame(currentTime, projectState, mediaElementsRef.current);
                }
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
    }, [editorState, projectState.isPlaying, currentTime, projectState, canvasRenderer, setProjectState, playbackController]);

    useEffect(() => {
        const container = previewContainerRef.current;
        if (!container) return;
        previewZoomController.handleContainerResize(projectState);
        const observer = new ResizeObserver(() => previewZoomController.handleContainerResize(projectState));
        observer.observe(container);
        return () => { observer.unobserve(container); observer.disconnect(); };
    }, [previewContainerRef, previewZoomController, projectState]);

    useEffect(() => {
        mediaElementManager.syncMediaElements(projectState, mediaElementsRef.current, currentTime);
    }, [projectState, currentTime, mediaElementManager]);

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
    }, [selectedClip, currentTime, projectState.canvasDimensions, projectState.previewZoomLevel, projectState.subtitles, interpolateValue]);

    useEffect(() => {
        return () => {
            if (animationFrameRef.current) { cancelAnimationFrame(animationFrameRef.current); animationFrameRef.current = null; }
            if (animationFrameProgressRef.current) { cancelAnimationFrame(animationFrameProgressRef.current); animationFrameProgressRef.current = null; }
            // General STOMP cleanup (for transcription/upload) - these are NOT moved
            if (stompSubscriptionRef.current) stompSubscriptionRef.current.unsubscribe();
            if (stompClientRef.current?.active) stompClientRef.current.deactivate().catch(e => console.warn("Error deactivating STOMP on cleanup:", e));
            stompClientRef.current = null; stompSubscriptionRef.current = null;
            // API-specific STOMP cleanup - now handled by useApiSubtitleBurning hook.
            // Do NOT add apiStompClientRef/apiStompSubscriptionRef cleanup here.
            mediaElementManager.cleanupMediaElements(mediaElementsRef.current); mediaElementsRef.current = {};
            if (ffmpegRef.current && ffmpegRef.current.loaded) {
                try { if (typeof ffmpegRef.current.terminate === 'function') { ffmpegRef.current.terminate(); } }
                catch (e) { console.warn("Error terminating ffmpeg instance on cleanup", e); }
                ffmpegRef.current = null;
            }
        };
    }, [currentPublicId, mediaElementManager]); // currentPublicId added for effect cleanup dependencies for media elements

    const handleMenuClick = useCallback((e: { key: string }) => setSelectedMenuKey(e.key), []);
    const showMobileDrawer = useCallback(() => setMobileDrawerVisible(true), []);
    const closeMobileDrawer = useCallback(() => setMobileDrawerVisible(false), []);
    const handlePlayPause = useCallback(() => playbackController.handlePlayPause(currentTime, projectState, editorState), [playbackController, currentTime, projectState, editorState]);
    const handleTimelineSeek = useCallback((time: number) => playbackController.handleTimelineSeek(time, projectState), [playbackController, projectState]);
    const toggleMutePreview = useCallback(() => playbackController.toggleMutePreview(), [playbackController]);
    const handlePlaybackRateChange = useCallback((rate: number) => playbackController.handlePlaybackRateChange(rate, projectState), [playbackController, projectState]);
    const handleCaptureSnapshot = useCallback(() => { console.log("Snapshot placeholder") }, []);
    const handleManualMediaUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => uploadManager.handleManualMediaUpload(event), [uploadManager]);
    const handleSelectClip = useCallback((clipId: string | null) => clipManager.handleSelectClip(clipId, projectState), [clipManager, projectState]);
    const handleAddTextClip = useCallback(() => clipManager.handleAddTextClip(currentTime, projectState), [clipManager, currentTime, projectState]);
    const handleDeleteClip = useCallback(() => clipManager.handleDeleteClip(projectState, mediaElementsRef.current), [clipManager, projectState, mediaElementsRef]);
    const updateSelectedClipProperty = useCallback((propUpdates: any) => clipManager.updateSelectedClipProperty(propUpdates, projectState), [clipManager, projectState]);
    const updateSelectedClipText = useCallback((newText: string) => clipManager.updateSelectedClipText(newText, projectState), [clipManager, projectState]);
    const addOrUpdateKeyframe = useCallback((propName: keyof NonNullable<Clip['keyframes']>) => clipManager.addOrUpdateKeyframe(propName, currentTime, selectedClip, projectState), [clipManager, currentTime, selectedClip, projectState]);

    const handleUploadSrt = useCallback(async (file: File) => {
        try {
            const fileContent = await file.text();
            setUploadedSrtFileContent(fileContent);
            message.success(`${file.name} content ready. Processing...`);
            setProjectState(prev => ({ ...prev, subtitles: [], areSubtitlesVisibleOnCanvas: true })); // Đảm bảo hiển thị khi tải SRT
            setTranscriptionProgress(0);
            handleTranscriptionProgress(0, `Parsing ${file.name}`);
            subtitleManager.handleUploadSrt(file, projectState);
        } catch (error) {
            console.error("Error reading SRT file content:", error);
            message.error("Could not read SRT file content.");
            setUploadedSrtFileContent(null);
            handleTranscriptionProgress(-1, `Error parsing ${file.name}`);
            throw error;
        }
    }, [subtitleManager, projectState, setUploadedSrtFileContent, handleTranscriptionProgress, setProjectState, setTranscriptionProgress]);

    const handleStartFromScratch = useCallback(
        (options: TranscriptionOptions) => {
            if (!selectedClip || !selectedVideoSecureUrl) {
                message.error("Please select a video clip from the timeline first to start transcription.");
                handleTranscriptionProgress(-1);
                return;
            }
            const fileName = selectedClip.name || 'Selected Video';
            setProjectState(prev => ({ ...prev, subtitles: [], areSubtitlesVisibleOnCanvas: true })); // Đảm bảo hiển thị khi bắt đầu transcribe
            setTranscriptionProgress(0);
            handleTranscriptionProgress(0, fileName);
            handleTranscriptionProgress(50, fileName); // Example intermediate progress

            subtitleManager.handleStartFromScratch(
                selectedClip,
                selectedVideoSecureUrl,
                currentTime,
                projectState,
                options
            );
        },
        [subtitleManager, selectedClip, selectedVideoSecureUrl, currentTime, projectState, handleTranscriptionProgress, setProjectState, setTranscriptionProgress]
    );

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
        customRequest: (options: any) => {
            if (options.file) {
                handleUploadSrt(options.file as File)
                    .then(() => { options.onSuccess?.({}, new XMLHttpRequest()); })
                    .catch((err) => { options.onError?.(err instanceof Error ? err : new Error("SRT processing failed")); });
            } else { options.onError?.(new Error("No file provided")); }
        },
        beforeUpload: (file: File) => {
            const isSrtOrVtt = file.name.endsWith('.srt') || file.name.endsWith('.vtt');
            if (!isSrtOrVtt) { message.error(`${file.name} is not an SRT or VTT file`); }
            return isSrtOrVtt || Upload.LIST_IGNORE;
        },
    }), [handleUploadSrt]);

    const onTimelineDragEnd = useCallback((e: OnDragEnd) => timelineMoveableController.onTimelineDragEnd(e, selectedClip, projectState, timelineZoom), [timelineMoveableController, selectedClip, projectState, timelineZoom]);
    const onTimelineResize = useCallback((e: OnResize) => timelineMoveableController.onTimelineResize(e, projectState), [timelineMoveableController, projectState]);
    const onTimelineResizeEnd = useCallback((e: OnResizeEnd) => timelineMoveableController.onTimelineResizeEnd(e, selectedClip, projectState, timelineZoom), [timelineMoveableController, selectedClip, projectState, timelineZoom]);
    const onPreviewDragEnd = useCallback((e: OnDragEnd) => previewMoveableController.onPreviewDragEnd(e, selectedClip, currentTime, projectState), [previewMoveableController, selectedClip, currentTime, projectState]);
    const onPreviewResizeEnd = useCallback((e: OnResizeEnd) => previewMoveableController.onPreviewResizeEnd(e, selectedClip, currentTime, projectState), [previewMoveableController, selectedClip, currentTime, projectState]);
    const onPreviewRotateEnd = useCallback((e: OnRotateEnd) => previewMoveableController.onPreviewRotateEnd(e, selectedClip, currentTime, projectState), [previewMoveableController, selectedClip, currentTime, projectState]);
    const handleZoomMenuClick = useCallback(({ key }: { key: string }) => previewZoomController.handleZoomMenuClick({ key }, projectState), [previewZoomController, projectState]);

    // MODIFIED: Sử dụng projectStateRef.current để lấy state mới nhất
    const handleGenerateAndLogAssContent = useCallback(() => {
        const assContent = subtitleManager.generateAssContent(projectStateRef.current); // Lấy state từ ref
        console.log("--- Generated ASS Subtitle Content (for logging/debugging) ---");
        console.log(assContent);
        message.success("ASS content generated and logged to console.");
        return assContent;
    }, [subtitleManager]); // Không còn phụ thuộc vào projectState trực tiếp

    const handleBurnSubtitlesWithFFmpeg = useCallback(async () => {
        if (!ffmpegLoaded || !ffmpegRef.current) {
            message.error("FFmpeg is not loaded. Cannot burn subtitles.");
            if (!ffmpegLoaded) loadFFmpeg();
            return;
        }
        if (isBurningSubtitles) {
            message.warning("Subtitle burning is already in progress.");
            return;
        }
        const videoUrlToProcess = selectedVideoSecureUrl;
        if (!videoUrlToProcess) {
            message.error("No video selected or available to process for subtitle burning.");
            return;
        }
        let subtitleFileContent = uploadedSrtFileContent;
        let subtitleFileName = 'input.srt';
        if (!subtitleFileContent && projectStateRef.current.subtitles.length > 0) { // SỬ DỤNG projectStateRef.current
            try {
                subtitleFileContent = subtitleManager.generateAssContent(projectStateRef.current); // SỬ DỤNG projectStateRef.current
                subtitleFileName = 'input.ass';
                message.info("No SRT uploaded, using current subtitles as ASS for burning.");
            } catch (genError) {
                console.error("Error generating ASS for burning:", genError);
                message.error("Failed to generate subtitles for burning. Please upload an SRT/VTT or ensure subtitles are present.");
                return;
            }
        }
        if (!subtitleFileContent) {
            message.error("No subtitle content available (SRT/ASS). Please add subtitles or upload a file.");
            return;
        }
        setIsBurningSubtitles(true);
        setBurningProgress(0);
        message.info(`Starting subtitle burning process with ${subtitleFileName}...`);
        const ffmpeg = ffmpegRef.current;
        const inputVideoName = 'inputVideo.mp4';
        const outputVideoName = 'output_with_subs.mp4';

        const currentProgressCallback: FFmpegProgressCallback = ({ progress }) => {
            setBurningProgress(Math.round(progress * 100));
        };
        ffmpegProgressCallbackRef.current = currentProgressCallback;

        try {
            message.info(`Fetching video from: ${videoUrlToProcess}`);
            await ffmpeg.writeFile(inputVideoName, await fetchFile(videoUrlToProcess));
            message.info("Video downloaded and prepared for FFmpeg.");

            if(ffmpegProgressCallbackRef.current) {
                ffmpeg.on('progress', ffmpegProgressCallbackRef.current);
            }

            message.info(`Running FFmpeg command to burn ${subtitleFileName} subtitles...`);
            await ffmpeg.exec([
                '-i', inputVideoName,
                // The FFmpeg command for burning ASS is specifically different for .ass vs .srt.
                // Your backend uses `ass=` for .ass files, so this client-side ffmpeg should reflect that.
                // For simplicity, I'm keeping a generic `subtitles=` filter.
                // For direct ASS burning with custom styles, `ass=` is better as in your backend.
                '-vf', `subtitles=filename=${subtitleFileName}:force_style=${subtitleFileName.endsWith('.ass') ? 'PrimaryColour=&H00FFFFFF,BorderStyle=3,OutlineColour=&H00000000' : ''}`,
                '-c:v', 'libx264', '-crf', '23', '-preset', 'medium', '-c:a', 'copy',
                outputVideoName
            ]);
            message.success(`FFmpeg processing complete. Subtitles burned from ${subtitleFileName}.`);
            const data = await ffmpeg.readFile(outputVideoName);
            const videoBlob = new Blob([data], { type: 'video/mp4' });
            const downloadUrl = URL.createObjectURL(videoBlob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `video_with_subtitles_${projectStateRef.current.projectName.replace(/\s+/g, '_') || 'export'}.mp4`; // SỬ DỤNG projectStateRef.current
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
            message.success(`Output video with ${subtitleFileName} subtitles downloaded.`);
            await ffmpeg.deleteFile(inputVideoName);
            await ffmpeg.deleteFile(subtitleFileName);
            await ffmpeg.deleteFile(outputVideoName);
        } catch (error) {
            console.error(`Error during ${subtitleFileName} subtitle burning:`, error);
            message.error(`Error burning ${subtitleFileName} subtitles: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsBurningSubtitles(false);
            setBurningProgress(0);
            if (ffmpegProgressCallbackRef.current && ffmpegRef.current) {
                ffmpegRef.current.off('progress', ffmpegProgressCallbackRef.current);
                ffmpegProgressCallbackRef.current = null;
            }
        }
    }, [
        ffmpegLoaded, isBurningSubtitles, selectedVideoSecureUrl, loadFFmpeg,
        uploadedSrtFileContent, subtitleManager // projectState.projectName removed, as we use projectStateRef.current
    ]);

    const handleDesaturateVideoSegment = useCallback(async (
        videoUrlToProcess: string,
        startTime: number, // in seconds
        endTime: number    // in seconds
    ) => {
        if (!ffmpegLoaded || !ffmpegRef.current) {
            message.error("FFmpeg is not loaded. Cannot process video.");
            if (!ffmpegLoaded) loadFFmpeg(); // Attempt to load if not already
            return;
        }
        if (isDesaturating) {
            message.warning("Video desaturation is already in progress.");
            return;
        }
        if (!videoUrlToProcess) {
            message.error("No video URL provided for desaturation.");
            return;
        }
        if (typeof startTime !== 'number' || typeof endTime !== 'number' || startTime < 0 || endTime <= startTime) {
            message.error("Invalid start or end time for desaturation. End time must be greater than start time.");
            return;
        }

        setIsDesaturating(true);
        setDesaturationProgress(0);
        message.info('Starting video desaturation and trimming process...');

        const ffmpeg = ffmpegRef.current;
        const inputFileName = `input_segment_${Date.now()}.mp4`;
        const outputFileName = `output_desaturated_${Date.now()}.mp4`;

        const currentProgressCallback: FFmpegProgressCallback = ({ progress }) => {
            setDesaturationProgress(Math.round(progress * 100));
        };
        desaturationProgressCallbackRef.current = currentProgressCallback;

        try {
            message.info(`Fetching video from: ${videoUrlToProcess}`);
            await ffmpeg.writeFile(inputFileName, await fetchFile(videoUrlToProcess));
            message.info("Video downloaded and prepared for FFmpeg.");

            if (desaturationProgressCallbackRef.current) {
                ffmpeg.on('progress', desaturationProgressCallbackRef.current);
            }

            const formattedStartTime = formatTime(startTime, true); // HH:MM:SS.mmm
            const formattedEndTime = formatTime(endTime, true);     // HH:MM:SS.mmm

            message.info(`Running FFmpeg command to trim from ${formattedStartTime} to ${formattedEndTime} and desaturate...`);
            await ffmpeg.exec([
                '-i', inputFileName,
                '-ss', formattedStartTime,
                '-to', formattedEndTime,
                '-vf', 'hue=s=0',         // Filter to remove color (set saturation to 0)
                '-c:v', 'libx264',        // Video codec
                '-crf', '23',             // Constant Rate Factor (quality)
                '-preset', 'medium',      // Encoding speed vs. compression
                '-c:a', 'copy',           // Copy audio stream without re-encoding
                outputFileName
            ]);
            message.success('FFmpeg processing complete. Video trimmed and desaturated.');

            const data = await ffmpeg.readFile(outputFileName);
            const videoBlob = new Blob([data], { type: 'video/mp4' });
            const downloadUrl = URL.createObjectURL(videoBlob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `desaturated_video_${projectStateRef.current.projectName.replace(/\s+/g, '_') || 'export'}_${Date.now()}.mp4`; // SỬ DỤNG projectStateRef.current
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
            message.success('Desaturated video downloaded.');

            await ffmpeg.deleteFile(inputFileName);
            await ffmpeg.deleteFile(outputFileName);

        } catch (error) {
            console.error('Error during video desaturation:', error);
            message.error(`Error during desaturation: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsDesaturating(false);
            setDesaturationProgress(0);
            if (desaturationProgressCallbackRef.current && ffmpegRef.current) {
                ffmpeg.off('progress', desaturationProgressCallbackRef.current);
                desaturationProgressCallbackRef.current = null;
            }
        }
    }, [
        ffmpegLoaded, isDesaturating, loadFFmpeg,
    ]);

    const handleExtractAudio = useCallback(async (videoUrlToProcess: string) => {
        if (!ffmpegLoaded || !ffmpegRef.current) {
            message.error("FFmpeg is not loaded. Cannot extract audio.");
            if (!ffmpegLoaded) loadFFmpeg();
            return;
        }
        if (isExtractingAudio) {
            message.warning("Audio extraction is already in progress.");
            return;
        }
        if (!videoUrlToProcess) {
            message.error("No video URL provided for audio extraction.");
            return;
        }

        setIsExtractingAudio(true);
        setAudioExtractionProgress(0);
        message.info('Starting audio extraction process...');

        const ffmpeg = ffmpegRef.current;
        const inputFileName = `input_video_audio_extract_${Date.now()}.mp4`;
        const outputFileName = `extracted_audio_${Date.now()}.mp3`;

        const currentProgressCallback: FFmpegProgressCallback = ({ progress }) => {
            setAudioExtractionProgress(Math.round(progress * 100));
        };
        audioExtractionProgressCallbackRef.current = currentProgressCallback;

        try {
            message.info(`Fetching video from: ${videoUrlToProcess}`);
            await ffmpeg.writeFile(inputFileName, await fetchFile(videoUrlToProcess));
            message.info("Video downloaded and prepared for FFmpeg.");

            if (audioExtractionProgressCallbackRef.current) {
                ffmpeg.on('progress', audioExtractionProgressCallbackRef.current);
            }

            message.info('Running FFmpeg command to extract audio as MP3...');
            await ffmpeg.exec([
                '-i', inputFileName,
                '-vn',
                '-c:a', 'libmp3lame',
                '-q:a', '2',
                outputFileName
            ]);
            message.success('FFmpeg processing complete. Audio extracted.');

            const data = await ffmpeg.readFile(outputFileName);
            const audioBlob = new Blob([data], { type: 'audio/mpeg' });
            const downloadUrl = URL.createObjectURL(audioBlob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            const baseName = videoUrlToProcess.substring(videoUrlToProcess.lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "");
            a.download = `${baseName}_audio.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
            message.success('Extracted MP3 audio downloaded.');

            await ffmpeg.deleteFile(inputFileName);
            await ffmpeg.deleteFile(outputFileName);

        } catch (error) {
            console.error('Error during audio extraction:', error);
            message.error(`Error extracting audio: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsExtractingAudio(false);
            setAudioExtractionProgress(0);
            if (audioExtractionProgressCallbackRef.current && ffmpegRef.current) {
                ffmpeg.off('progress', audioExtractionProgressCallbackRef.current);
                audioExtractionProgressCallbackRef.current = null;
            }
        }
    }, [
        ffmpegLoaded, isExtractingAudio, loadFFmpeg,
    ]);

    // NEW FUNCTION: Public handler to call the API subtitle burning process
    const handleBurnSubtitlesViaApi = useCallback(async () => {
        if (!selectedVideoSecureUrl) {
            message.error("No video selected or available to burn subtitles to via API.");
            return;
        }
        await callAddSubtitleApi();
    }, [callAddSubtitleApi, selectedVideoSecureUrl]);

    // NEW FUNCTION: Toggle subtitle visibility on canvas
    const toggleSubtitlesVisibility = useCallback(() => {
        setProjectState(prev => ({
            ...prev,
            areSubtitlesVisibleOnCanvas: !prev.areSubtitlesVisibleOnCanvas
        }));
    }, [setProjectState]);

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
        isTranscribing,
        transcriptionProgress,
        transcribingFileName,
        ffmpegRef,
        mediaElementsRef,
        ffmpegLoaded,
        loadFFmpeg,
        isBurningSubtitles, // This is for client-side FFmpeg burning
        burningProgress, // This is for client-side FFmpeg burning
        handleGenerateAndLogAssContent,
        handleBurnSubtitlesWithFFmpeg, // This is for client-side FFmpeg burning
        handleMergeSubtitles,
        isDesaturating,
        setIsDesaturating,
        setDesaturationProgress,
        desaturationProgress,
        handleDesaturateVideoSegment,
        isExtractingAudio,
        audioExtractionProgress,
        handleExtractAudio,
        // EXPORT NEW STATES AND FUNCTION FROM THE NEW HOOK
        isApiBurningSubtitles, // For API-based subtitle burning
        apiBurningProgress,    // For API-based subtitle burning
        handleBurnSubtitlesViaApi, // New function to trigger API-based burning
        toggleSubtitlesVisibility, // EXPORT THE NEW TOGGLE FUNCTION
        areSubtitlesVisibleOnCanvas: projectState.areSubtitlesVisibleOnCanvas, // EXPORT CURRENT VISIBILITY STATE
    }
};
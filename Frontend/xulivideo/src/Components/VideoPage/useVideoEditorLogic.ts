import {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo
} from 'react';
import { message, Upload } from 'antd'; // <--- Import Upload component
import type { UploadProps, UploadFile } from 'antd';
import type { UploadChangeParam } from 'antd/es/upload'; // <--- Correct path for type
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

// --- Constants ---
const THUMBNAIL_INTERVAL = 5;
const DEFAULT_CLIP_DURATION = 5;
const PLAYBACK_RATES = [0.25, 0.5, 1.0, 1.5, 2.0];
const MIN_CLIP_DURATION = 0.1;
// <--- FIXED: Ensure PREVIEW_ZOOM_LEVELS is exported
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

const interpolateValue = (kfs: Keyframe[] | undefined, time: number, defaultValue: any): any => {
    if (!kfs || kfs.length === 0) return defaultValue;
    // Sắp xếp keyframes để đảm bảo thứ tự đúng (an toàn hơn)
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
    if (timeDiff === 0) return prevKf.value; // Tránh chia cho 0
    const factor = (time - prevKf.time) / timeDiff;
    const pVal = prevKf.value; const nVal = nextKf.value;
    // Nội suy cho số
    if (typeof pVal === 'number' && typeof nVal === 'number') {
        return pVal + (nVal - pVal) * factor;
    }
    // Nội suy cho đối tượng có x, y (ví dụ: position, scale)
    else if (
        typeof pVal === 'object' && typeof nVal === 'object' &&
        pVal !== null && nVal !== null &&
        'x' in pVal && 'y' in pVal && 'x' in nVal && 'y' in nVal
    ) {
        const p = pVal as { x: number, y: number }; const n = nVal as { x: number, y: number };
        return { x: p.x + (n.x - p.x) * factor, y: p.y + (n.y - p.y) * factor };
    }
    // Mặc định trả về giá trị trước đó nếu không thể nội suy (ví dụ: string)
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
    const [uploadProgress, setUploadProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [timelineZoom, setTimelineZoom] = useState(50); // Default zoom level (pixels per second)
    const [projectState, setProjectState] = useState<EditorProjectState>({
        projectName: "New Video",
        tracks: [{ id: `track-${Date.now()}`, clips: [] }], // Initialize with one track
        mediaAssets: [],
        canvasDimensions: { width: 1280, height: 720 }, // Default canvas size (16:9)
        totalDuration: 0,
        selectedClipId: null,
        isPlaying: false,
        isPreviewMuted: false,
        playbackRate: 1.0,
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
    // Tính toán clip đang được chọn dựa trên state, tránh tính toán lại không cần thiết
    const selectedClip = useMemo(() => {
        if (!projectState.selectedClipId) return null;
        for (const track of projectState.tracks) {
            const clip = track.clips.find(c => c.id === projectState.selectedClipId);
            if (clip) return clip;
        }
        return null;
    }, [projectState.tracks, projectState.selectedClipId]); // Dependencies

    // --- Utility Functions ---
    // Tính toán tổng thời lượng của project dựa trên clip có thời gian kết thúc muộn nhất
    const calculateTotalDuration = useCallback((tracks: Track[]): number => {
        let maxEndTime = 0;
        tracks.forEach(track => {
            track.clips.forEach(clip => {
                maxEndTime = Math.max(maxEndTime, clip.endTime);
            });
        });
        return Math.max(0, maxEndTime); // Đảm bảo không âm
    }, []); // Không có dependencies, là hàm tiện ích thuần túy

    // --- Thumbnail Generation ---
    // Tạo một thumbnail đơn lẻ tại một thời điểm cụ thể từ video element
    const generateSingleThumbnail = useCallback(
        async (videoElement: HTMLVideoElement, time: number): Promise<string | null> => {
            return new Promise((resolve) => {
                // Kiểm tra điều kiện cần thiết của video element
                if (!videoElement || videoElement.readyState < videoElement.HAVE_METADATA || !isFinite(videoElement.duration)) {
                    if (!videoElement) console.warn("Video element missing for thumbnail generation");
                    else if (videoElement.readyState < videoElement.HAVE_METADATA) console.warn("Video metadata not ready for thumbnail");
                    else if (!isFinite(videoElement.duration)) console.warn("Video duration invalid for thumbnail");
                    resolve(null);
                    return;
                }
                // Kiểm tra kích thước video hợp lệ
                if (!videoElement.videoWidth || !videoElement.videoHeight) {
                    console.warn("Video dimensions not available for thumbnail generation");
                    resolve(null);
                    return;
                }

                const offscreenCanvas = document.createElement('canvas');
                // Kích thước thumbnail cố định nhỏ để tiết kiệm tài nguyên
                offscreenCanvas.width = 160;
                offscreenCanvas.height = 90;
                const ctx = offscreenCanvas.getContext('2d', { alpha: false }); // Không cần alpha
                if (!ctx) { console.error("Failed to get 2D context for thumbnail"); resolve(null); return; }

                const targetTime = Math.min(Math.max(0, time), videoElement.duration); // Clamp time
                const originalTime = videoElement.currentTime;
                const wasPaused = videoElement.paused;
                let seekHandlerAttached = false;

                // Hàm dọn dẹp listener
                const cleanupListeners = () => {
                    if (seekHandlerAttached) {
                        videoElement.removeEventListener('seeked', processFrame);
                        seekHandlerAttached = false;
                    }
                    videoElement.removeEventListener('error', seekErrorHandler);
                };

                // Hàm xử lý khi video đã seek đến đúng frame
                const processFrame = () => {
                    cleanupListeners();
                    // Kiểm tra lại element và context trước khi vẽ
                    if (!videoElement.parentNode || !ctx) {
                        console.warn("Video element removed or context lost before thumbnail generation finished.");
                        resolve(null); return;
                    }
                    try {
                        // Vẽ frame lên canvas ẩn
                        ctx.drawImage(videoElement, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
                        // Chuyển thành data URL (JPEG để tiết kiệm dung lượng)
                        const dataUrl = offscreenCanvas.toDataURL('image/jpeg', 0.7); // Chất lượng 70%

                        // Khôi phục trạng thái video (nếu cần seek và nếu đang phát)
                        if (Math.abs(videoElement.currentTime - originalTime) > 0.01) {
                            try { videoElement.currentTime = originalTime; } catch(e) { /* ignore potential errors */ }
                        }
                        if (!wasPaused) { videoElement.play().catch(() => {}); /* Ignore play error */ }
                        resolve(dataUrl); // Trả về URL thumbnail
                    } catch (e) { console.error("Error generating thumbnail data URL:", e); resolve(null); }
                };

                // Hàm xử lý lỗi trong quá trình seek/load
                const seekErrorHandler = (event: Event) => {
                    console.error("Error during video seek/load for thumbnail:", event);
                    cleanupListeners(); resolve(null); // Trả về null khi lỗi
                    // Cố gắng khôi phục trạng thái video
                    try {
                        if (Math.abs(videoElement.currentTime - originalTime) > 0.01) videoElement.currentTime = originalTime;
                        if (!wasPaused) videoElement.play().catch(() => {});
                    } catch (restoreError) { console.warn("Error restoring video state after thumbnail error:", restoreError); }
                };

                videoElement.addEventListener('error', seekErrorHandler, { once: true });

                // Nếu cần seek đến thời gian mong muốn
                if (Math.abs(videoElement.currentTime - targetTime) > 0.1 && videoElement.seekable.length > 0) {
                    if (!wasPaused) videoElement.pause(); // Tạm dừng nếu đang phát
                    seekHandlerAttached = true;
                    videoElement.addEventListener('seeked', processFrame, { once: true }); // Chờ sự kiện seeked
                    videoElement.currentTime = targetTime; // Thực hiện seek
                }
                // Nếu đã ở đúng thời gian hoặc có thể vẽ ngay
                else if (videoElement.readyState >= videoElement.HAVE_CURRENT_DATA) {
                    if (!wasPaused) videoElement.pause(); // Tạm dừng nếu đang phát
                    requestAnimationFrame(() => { // Chờ frame tiếp theo để đảm bảo DOM cập nhật
                        if (videoElement.readyState >= videoElement.HAVE_CURRENT_DATA) {
                            processFrame(); // Vẽ frame
                        } else {
                            // Trạng thái video thay đổi bất ngờ
                            console.warn("Video state changed before drawing frame for thumbnail");
                            cleanupListeners(); resolve(null);
                        }
                    });
                }
                // Nếu video chưa sẵn sàng
                else {
                    console.warn("Video not ready to generate thumbnail for time:", time, "State:", videoElement.readyState);
                    cleanupListeners(); resolve(null);
                }
            });
        },
        [] // Hook này không phụ thuộc state/props khác
    );

    // Tạo nhiều thumbnails cho một clip video
    const generateThumbnailsForClip = useCallback(
        async (clipId: string, videoElement: HTMLVideoElement): Promise<ThumbnailInfo[]> => {
            const duration = videoElement.duration;
            if (!duration || !isFinite(duration) || duration <= 0) return []; // Kiểm tra duration hợp lệ
            const thumbnailTimes: number[] = [0.1]; // Bắt đầu gần frame đầu tiên
            // Tạo mảng các mốc thời gian cần tạo thumbnail
            for (let t = THUMBNAIL_INTERVAL; t < duration; t += THUMBNAIL_INTERVAL) {
                thumbnailTimes.push(t);
            }
            const generatedThumbnails: ThumbnailInfo[] = [];
            // Lặp qua các mốc thời gian và tạo thumbnail
            for (const time of thumbnailTimes) {
                // Kiểm tra xem video element còn tồn tại không trước mỗi lần tạo
                const currentElement = mediaElementsRef.current[clipId];
                if (!currentElement || !(currentElement instanceof HTMLVideoElement)) {
                    console.warn(`Video element for ${clipId} missing during thumbnail generation loop.`);
                    break; // Dừng nếu element không còn
                }
                // Gọi hàm tạo thumbnail đơn lẻ
                const url = await generateSingleThumbnail(currentElement, time);
                if (url) {
                    generatedThumbnails.push({ time, url }); // Thêm vào kết quả nếu thành công
                }
                // Có thể thêm delay nhỏ ở đây nếu cần để giảm tải CPU
                // await new Promise(resolve => setTimeout(resolve, 50));
            }
            return generatedThumbnails; // Trả về mảng các thumbnail info
        },
        [generateSingleThumbnail] // Phụ thuộc vào hàm tạo thumbnail đơn lẻ
    );

    // --- Canvas Drawing Function ---
    // Hàm vẽ nội dung (video, ảnh, text) lên canvas tại một thời điểm cụ thể
    const drawFrame = useCallback(
        (time: number) => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx || !projectState) return; // Thoát nếu canvas hoặc context chưa sẵn sàng

            const { width, height } = projectState.canvasDimensions;
            // Đảm bảo kích thước canvas khớp với state
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width; canvas.height = height;
            }

            // Xóa canvas hoặc vẽ nền đen
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);

            // Lặp qua các track và clip để vẽ
            projectState.tracks.forEach(track => {
                track.clips.forEach(clip => {
                    // Chỉ vẽ clip nếu nó active tại thời điểm `time`
                    if (time >= clip.startTime && time < clip.endTime) {
                        // Nội suy các thuộc tính dựa trên keyframes (nếu có) hoặc dùng giá trị gốc
                        const pos = interpolateValue(clip.keyframes?.position, time, clip.position);
                        const scale = interpolateValue(clip.keyframes?.scale, time, clip.scale);
                        const rotation = interpolateValue(clip.keyframes?.rotation, time, clip.rotation);
                        const opacity = interpolateValue(clip.keyframes?.opacity, time, clip.opacity ?? 1); // Mặc định opacity là 1

                        // Tính toán tọa độ vẽ (dựa trên tâm)
                        const drawX = pos.x * width;
                        const drawY = pos.y * height;

                        ctx.save(); // Lưu trạng thái context hiện tại
                        ctx.globalAlpha = opacity; // Áp dụng độ mờ
                        ctx.translate(drawX, drawY); // Di chuyển gốc tọa độ đến vị trí vẽ
                        ctx.rotate(rotation * Math.PI / 180); // Áp dụng xoay (đổi sang radian)

                        const element = mediaElementsRef.current[clip.id]; // Lấy media element tương ứng
                        // Xác định kích thước gốc của element
                        let elementWidth = clip.originalWidth || (clip.type === 'text' ? 300 : 100); // Kích thước mặc định
                        let elementHeight = clip.originalHeight || (clip.type === 'text' ? 80 : 100);
                        // Lấy kích thước thực tế nếu là video/image đã load
                        if (element instanceof HTMLVideoElement && element.videoWidth) { elementWidth = element.videoWidth; elementHeight = element.videoHeight; }
                        else if (element instanceof HTMLImageElement && element.naturalWidth) { elementWidth = element.naturalWidth; elementHeight = element.naturalHeight; }

                        // Tính kích thước vẽ cuối cùng dựa trên scale
                        const drawWidth = elementWidth * scale.x;
                        const drawHeight = elementHeight * scale.y;
                        // Tính offset để vẽ từ tâm
                        const drawOffsetX = -drawWidth / 2;
                        const drawOffsetY = -drawHeight / 2;

                        try {
                            // Vẽ Video Frame
                            if (clip.type === 'video' && element instanceof HTMLVideoElement && element.readyState >= element.HAVE_CURRENT_DATA) {
                                ctx.drawImage(element, drawOffsetX, drawOffsetY, drawWidth, drawHeight);
                            }
                            // Vẽ Image
                            else if (clip.type === 'image' && element instanceof HTMLImageElement && element.complete) {
                                ctx.drawImage(element, drawOffsetX, drawOffsetY, drawWidth, drawHeight);
                            }
                            // Vẽ Text
                            else if (clip.type === 'text') {
                                ctx.fillStyle = 'white'; // Màu chữ mặc định
                                const fontSize = 40 * Math.min(scale.x, scale.y); // Scale font size (chọn scale nhỏ hơn)
                                ctx.font = `${fontSize}px Arial`; // Font mặc định
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillText(clip.source as string, 0, 0); // Vẽ tại gốc tọa độ đã translate
                            }
                        } catch (e) {
                            console.error("Canvas draw error for clip:", clip.id, e); // Log lỗi nếu vẽ thất bại
                        }
                        ctx.restore(); // Khôi phục trạng thái context trước đó
                    }
                });
            });
        },
        [projectState.tracks, projectState.canvasDimensions] // Phụ thuộc tracks và kích thước canvas
    );


    // --- Effects ---
    // Effect tính toán tỷ lệ zoom "Fit" và "Fill" và cập nhật zoom level nếu cần
    useEffect(() => {
        const calculateScales = () => {
            if (!previewContainerRef.current || !projectState.canvasDimensions.width || !projectState.canvasDimensions.height) return { fit: 1.0, fill: 1.0 }; // Default
            const containerRect = previewContainerRef.current.getBoundingClientRect();
            const { width: canvasWidth, height: canvasHeight } = projectState.canvasDimensions;
            const { width: containerWidth, height: containerHeight } = containerRect;
            if (!containerWidth || !containerHeight || !canvasWidth || !canvasHeight) return { fit: 1.0, fill: 1.0 }; // Avoid division by zero
            const scaleX = containerWidth / canvasWidth; const scaleY = containerHeight / canvasHeight;
            return { fit: Math.min(scaleX, scaleY), fill: Math.max(scaleX, scaleY) }; // 'contain' and 'cover' scales
        };

        const updateScales = () => {
            const { fit, fill } = calculateScales();
            setFitScaleFactor(fit); setFillScaleFactor(fill);
            // Nếu đang ở mode fit/fill, cập nhật zoom level thực tế
            if (previewZoomMode === PREVIEW_ZOOM_FIT_MODE) setPreviewZoomLevel(fit);
            else if (previewZoomMode === PREVIEW_ZOOM_FILL_MODE) setPreviewZoomLevel(fill);
        };

        updateScales(); // Tính toán lần đầu

        // Theo dõi thay đổi kích thước container để tính lại scale
        const container = previewContainerRef.current;
        const observer = new ResizeObserver(updateScales);
        if(container) observer.observe(container);

        // Dọn dẹp observer khi component unmount hoặc dependencies thay đổi
        return () => { if(container) observer.unobserve(container); };
    }, [projectState.canvasDimensions, previewZoomMode]); // Dependencies

    // Effect dọn dẹp tài nguyên khi component unmount
    useEffect(() => {
        return () => {
            // Hủy animation frame nếu đang chạy
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            // Dừng, xóa src và loại bỏ các thẻ video/image khỏi DOM và ref
            Object.values(mediaElementsRef.current).forEach(el => { if (el instanceof HTMLVideoElement) { el.pause(); el.removeAttribute('src'); el.load(); } el.remove(); });
            mediaElementsRef.current = {}; // Reset ref
            // Thu hồi Object URL đã tạo cho media assets
            projectState.mediaAssets.forEach(asset => { if (asset.objectURL) URL.revokeObjectURL(asset.objectURL); });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Chạy một lần duy nhất khi unmount (disable eslint vì mảng dependency trống là cố ý)

    // Effect áp dụng trạng thái Mute và Playback Rate cho các video elements hiện có
    useEffect(() => {
        Object.values(mediaElementsRef.current).forEach(element => {
            if (element instanceof HTMLVideoElement) {
                element.muted = projectState.isPreviewMuted;
                // Chỉ thay đổi playbackRate nếu khác để tránh gián đoạn không cần thiết
                if (element.playbackRate !== projectState.playbackRate) {
                    element.playbackRate = projectState.playbackRate;
                }
            }
        });
    }, [projectState.isPreviewMuted, projectState.playbackRate]); // Chạy lại khi mute hoặc rate thay đổi

    // Effect quản lý việc tạo, cập nhật metadata và tạo thumbnails cho media elements
    useEffect(() => {
        const currentClipIds = new Set(projectState.tracks.flatMap(t => t.clips.map(c => c.id))); // Lấy ID của các clip hiện tại

        projectState.tracks.forEach(track => {
            track.clips.forEach(clip => {
                // Chỉ xử lý video/image có source là URL (blob hoặc http/s)
                if ((clip.type === 'video' || clip.type === 'image') && typeof clip.source === 'string' && (clip.source.startsWith('blob:') || clip.source.startsWith('http'))) {
                    const existingElement = mediaElementsRef.current[clip.id];

                    // --- Create Video Element ---
                    // Nếu là video và chưa có element hoặc element không đúng loại
                    if (clip.type === 'video' && (!existingElement || !(existingElement instanceof HTMLVideoElement))) {
                        const video = document.createElement('video');
                        video.muted = projectState.isPreviewMuted; // Set mute ban đầu
                        video.playbackRate = projectState.playbackRate; // Set rate ban đầu
                        video.preload = 'metadata'; // Chỉ tải metadata ban đầu
                        video.crossOrigin = 'anonymous'; // Cần thiết để vẽ lên canvas nếu nguồn khác origin
                        video.src = clip.source;
                        // Style để ẩn video khỏi layout nhưng vẫn load được
                        video.style.cssText = `position: absolute; opacity: 0; pointer-events: none; width: 1px; height: 1px; top: -10px; left: -10px; overflow: hidden;`;

                        // --- Xử lý khi metadata đã load ---
                        video.onloadedmetadata = async () => {
                            // Kiểm tra xem clip/element còn tồn tại trong state không khi callback chạy
                            if (!mediaElementsRef.current[clip.id] || !currentClipIds.has(clip.id)) return;

                            const actualDuration = video.duration;
                            const videoWidth = video.videoWidth;
                            const videoHeight = video.videoHeight;

                            // Kiểm tra xem có cần cập nhật metadata hoặc tạo thumbnail không
                            const needsMetaUpdate = (!clip.originalWidth || !clip.originalHeight || (clip.duration !== actualDuration && !isNaN(actualDuration) && actualDuration > 0));
                            const needsThumbnails = (!clip.thumbnailUrls || clip.thumbnailUrls.length === 0) && clip.type === 'video'; // Chỉ tạo cho video

                            if (needsMetaUpdate || needsThumbnails) {
                                let thumbnails = clip.thumbnailUrls; // Giữ thumbnail cũ nếu không cần tạo mới
                                // Chỉ tạo thumbnail nếu cần, có kích thước, và duration hợp lệ
                                if (needsThumbnails && videoWidth > 0 && videoHeight > 0 && isFinite(actualDuration) && actualDuration > 0) {
                                    try {
                                        thumbnails = await generateThumbnailsForClip(clip.id, video); // Gọi hàm tạo thumbnails
                                    } catch (thumbError) {
                                        console.error(`Thumbnail generation failed for ${clip.id}`, thumbError);
                                        thumbnails = []; // Đặt là mảng rỗng nếu lỗi
                                    }
                                } else if (needsThumbnails) {
                                    thumbnails = []; // Đặt là mảng rỗng nếu không đủ điều kiện tạo
                                }

                                // Cập nhật state một cách immutable
                                setProjectState(prev => {
                                    let durationChanged = false;
                                    const updatedTracks = prev.tracks.map(t => ({
                                        ...t,
                                        clips: t.clips.map(c => {
                                            if (c.id === clip.id) {
                                                // Tính duration mới nếu cần
                                                const newDuration = (needsMetaUpdate && !isNaN(actualDuration) && actualDuration > 0) ? actualDuration : c.duration;
                                                durationChanged = durationChanged || (c.duration !== newDuration); // Check if duration actually changed
                                                const newEndTime = c.startTime + newDuration; // Tính lại endTime
                                                // Trả về clip đã cập nhật
                                                return {
                                                    ...c,
                                                    originalWidth: videoWidth || c.originalWidth || 0, // Lấy kích thước mới hoặc giữ cũ
                                                    originalHeight: videoHeight || c.originalHeight || 0,
                                                    duration: newDuration,
                                                    endTime: newEndTime,
                                                    thumbnailUrls: thumbnails ?? c.thumbnailUrls // Cập nhật thumbnails (nếu có)
                                                };
                                            }
                                            return c; // Giữ nguyên các clip khác
                                        })
                                    }));
                                    // Tính lại tổng duration chỉ khi có clip thay đổi duration
                                    const newTotalDuration = durationChanged ? calculateTotalDuration(updatedTracks) : prev.totalDuration;
                                    return { ...prev, tracks: updatedTracks, totalDuration: newTotalDuration };
                                });
                            }
                            // Sau khi metadata load, cho phép trình duyệt tải thêm dữ liệu video
                            if (video.preload !== 'auto') video.preload = 'auto';
                        };

                        // --- Xử lý khi video load lỗi ---
                        video.onerror = (e) => {
                            console.error(`Error loading video: ${clip.name || clip.id}`, clip.source, e);
                            message.error(`Failed to load video: ${clip.name || clip.id}`);
                            // Xóa clip bị lỗi khỏi state
                            setProjectState(prev => {
                                const updatedTracks = prev.tracks
                                    .map(t => ({ ...t, clips: t.clips.filter(c => c.id !== clip.id) }))
                                    .filter(track => track.clips.length > 0 || prev.tracks.length === 1); // Giữ lại ít nhất 1 track nếu track cuối bị rỗng
                                if (updatedTracks.length === 0) { // Nếu không còn track nào, tạo lại track rỗng
                                    updatedTracks.push({ id: `track-${Date.now()}`, clips: [] });
                                }
                                const newTotalDuration = calculateTotalDuration(updatedTracks);
                                // Bỏ chọn clip nếu clip bị xóa đang được chọn
                                const newSelectedClipId = prev.selectedClipId === clip.id ? null : prev.selectedClipId;
                                return { ...prev, tracks: updatedTracks, totalDuration: newTotalDuration, selectedClipId: newSelectedClipId };
                            });
                            // Xóa element khỏi ref và DOM
                            if (mediaElementsRef.current[clip.id]) {
                                mediaElementsRef.current[clip.id]?.remove();
                                delete mediaElementsRef.current[clip.id];
                            }
                        };

                        // Thêm video vào body để nó bắt đầu load
                        document.body.appendChild(video);
                        mediaElementsRef.current[clip.id] = video; // Lưu ref
                    }
                        // --- Create Image Element ---
                    // Nếu là image và chưa có element hoặc element không đúng loại
                    else if (clip.type === 'image' && (!existingElement || !(existingElement instanceof HTMLImageElement))) {
                        const img = new Image();
                        img.crossOrigin = 'anonymous'; // Cần thiết để vẽ lên canvas
                        img.src = clip.source;

                        // --- Xử lý khi ảnh load thành công ---
                        img.onload = () => {
                            // Kiểm tra xem clip/element còn tồn tại không
                            if (!currentClipIds.has(clip.id) || !mediaElementsRef.current[clip.id]) return;
                            // Cập nhật state với kích thước gốc và thumbnail (là chính ảnh đó)
                            setProjectState(prev => ({
                                ...prev,
                                tracks: prev.tracks.map(t => ({
                                    ...t,
                                    clips: t.clips.map(c => c.id === clip.id ? {
                                        ...c,
                                        originalWidth: img.naturalWidth,
                                        originalHeight: img.naturalHeight,
                                        thumbnailUrls: [{ time: 0, url: c.source as string }] // Dùng chính source làm thumbnail
                                    } : c)
                                }))
                            }));
                            // Ref đã được lưu ở dưới
                        };

                        // --- Xử lý khi ảnh load lỗi ---
                        img.onerror = () => {
                            console.error(`Error loading image: ${clip.name || clip.id}`, clip.source);
                            message.error(`Failed to load image: ${clip.name || clip.id}`);
                            // Xóa clip bị lỗi khỏi state
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
                            // Xóa ref (không cần remove khỏi DOM vì Image không cần append)
                            delete mediaElementsRef.current[clip.id];
                        };
                        // Lưu ref ngay lập tức (Image không cần append vào DOM để load)
                        mediaElementsRef.current[clip.id] = img;
                    }
                }
            });
        });

        // Dọn dẹp các elements không còn được sử dụng trong state
        Object.keys(mediaElementsRef.current).forEach(id => {
            if (!currentClipIds.has(id)) {
                const element = mediaElementsRef.current[id];
                if (element) {
                    // Dừng video và giải phóng tài nguyên
                    if (element instanceof HTMLVideoElement) { element.pause(); element.removeAttribute('src'); element.load(); }
                    element.remove(); // Xóa khỏi DOM (nếu đã append)
                }
                delete mediaElementsRef.current[id]; // Xóa khỏi ref
            }
        });
    }, [
        // Dependencies: Chạy lại khi tracks, mute, rate thay đổi hoặc các hàm tiện ích thay đổi
        projectState.tracks, projectState.isPreviewMuted, projectState.playbackRate,
        generateThumbnailsForClip, calculateTotalDuration
    ]);


    // --- Animation Loop ---
    // Hàm thực hiện vòng lặp render, cập nhật thời gian và vẽ frame
    const renderLoop = useCallback(() => {
        const now = Date.now();
        // Tính thời gian trôi qua kể từ lần cập nhật cuối, điều chỉnh theo tốc độ phát
        const deltaTime = projectState.isPlaying
            ? ((now - lastUpdateTimeRef.current) / 1000) * projectState.playbackRate
            : 0;
        let newTime = currentTime;

        // Nếu đang phát và có thời gian trôi qua
        if (projectState.isPlaying && deltaTime > 0) {
            newTime = Math.min(projectState.totalDuration, currentTime + deltaTime); // Giới hạn bởi tổng duration
            newTime = Math.max(0, newTime); // Đảm bảo không âm

            // Chỉ cập nhật state nếu thời gian thực sự thay đổi
            if (newTime !== currentTime) {
                setCurrentTime(newTime);
            }

            // Tự động dừng khi đến cuối video
            if (newTime >= projectState.totalDuration && projectState.totalDuration > 0 && projectState.isPlaying) {
                setProjectState(prev => ({ ...prev, isPlaying: false })); // Cập nhật state isPlaying
                setCurrentTime(projectState.totalDuration); // Đặt thời gian về cuối
                // Dừng tất cả các video elements
                Object.values(mediaElementsRef.current).forEach(el => {
                    if (el instanceof HTMLVideoElement && !el.paused) {
                        el.pause();
                    }
                });
                // Không gọi requestAnimationFrame nữa khi dừng ở đây
                animationFrameRef.current = null;
                drawFrame(projectState.totalDuration); // Vẽ frame cuối cùng
                return; // Kết thúc vòng lặp sớm
            }
        }
        lastUpdateTimeRef.current = now; // Cập nhật mốc thời gian cuối
        drawFrame(newTime); // Vẽ frame cho thời gian hiện tại (hoặc mới tính được)

        // Tiếp tục vòng lặp nếu vẫn đang phát và đang ở trạng thái editor
        if (projectState.isPlaying && editorState === 'editor') {
            animationFrameRef.current = requestAnimationFrame(renderLoop);
        } else {
            // Dừng vòng lặp nếu không còn playing hoặc không ở editor state
            animationFrameRef.current = null;
        }
    }, [
        // Dependencies của renderLoop
        projectState.isPlaying, projectState.totalDuration, projectState.playbackRate,
        currentTime, drawFrame, editorState
    ]);

    // Effect quản lý việc bắt đầu và dừng vòng lặp animation (renderLoop)
    useEffect(() => {
        if (editorState === 'editor') {
            // Vẽ frame hiện tại khi vào editor hoặc khi currentTime thay đổi lúc đang pause
            // Điều này đảm bảo canvas luôn cập nhật khi seek lúc đang pause
            drawFrame(currentTime);

            if (projectState.isPlaying && !animationFrameRef.current) {
                // Bắt đầu vòng lặp nếu đang playing và chưa có loop nào chạy
                console.log("Starting animation loop");
                lastUpdateTimeRef.current = Date.now(); // Reset timer
                animationFrameRef.current = requestAnimationFrame(renderLoop);
            } else if (!projectState.isPlaying && animationFrameRef.current) {
                // Dừng vòng lặp nếu chuyển sang paused và đang có loop chạy
                console.log("Stopping animation loop (paused)");
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        } else { // Nếu không ở trạng thái editor
            if (animationFrameRef.current) {
                // Dừng vòng lặp nếu đang chạy
                console.log("Stopping animation loop (leaving editor)");
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            // Đảm bảo dừng phát nếu rời editor khi đang phát
            if (projectState.isPlaying) {
                setProjectState(prev => ({ ...prev, isPlaying: false }));
                Object.values(mediaElementsRef.current).forEach(el => {
                    if (el instanceof HTMLVideoElement && !el.paused) {
                        el.pause();
                    }
                });
            }
        }

        // Hàm cleanup: Dừng animation frame khi effect bị hủy hoặc chạy lại
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [editorState, projectState.isPlaying, renderLoop, drawFrame, currentTime]); // Dependencies

    // Effect cập nhật vị trí/kích thước của Moveable trong khu vực Preview
    useEffect(() => {
        const targetElement = previewContainerRef.current?.querySelector('.moveable-target-preview') as HTMLElement;
        const containerElement = previewContainerRef.current;
        const moveableInstance = previewMoveableRef.current;

        // Nếu thiếu yếu tố cần thiết hoặc không có clip nào được chọn, ẩn Moveable
        if (!targetElement || !containerElement || !moveableInstance || !selectedClip) {
            if (targetElement) targetElement.style.display = 'none'; // Ẩn target div
            moveableInstance?.updateRect(); // Cập nhật Moveable để nó biết target đã ẩn
            return;
        }

        const { canvasDimensions } = projectState;
        const containerRect = containerElement.getBoundingClientRect();
        const currentContainerScale = previewZoomLevel; // Tỷ lệ zoom hiện tại của preview

        // Tính toán offset để căn giữa canvas đã scale trong container
        const displayWidth = canvasDimensions.width * currentContainerScale;
        const displayHeight = canvasDimensions.height * currentContainerScale;
        const offsetX = (containerRect.width - displayWidth) / 2;
        const offsetY = (containerRect.height - displayHeight) / 2;

        // Lấy giá trị nội suy của clip tại currentTime
        const pos = interpolateValue(selectedClip.keyframes?.position, currentTime, selectedClip.position);
        const scale = interpolateValue(selectedClip.keyframes?.scale, currentTime, selectedClip.scale);
        const rotation = interpolateValue(selectedClip.keyframes?.rotation, currentTime, selectedClip.rotation);

        // Kích thước gốc của clip
        const baseWidth = selectedClip.originalWidth || 100;
        const baseHeight = selectedClip.originalHeight || 100;

        // Tính toán kích thước và vị trí của target Moveable trong không gian container
        // 1. Kích thước target trên canvas đã scale theo clip scale và preview zoom
        const targetWidthCanvasScaled = baseWidth * scale.x * currentContainerScale;
        const targetHeightCanvasScaled = baseHeight * scale.y * currentContainerScale;
        // 2. Vị trí top-left target trên canvas đã scale
        const targetXCanvasScaled = (pos.x * canvasDimensions.width - (baseWidth * scale.x / 2)) * currentContainerScale;
        const targetYCanvasScaled = (pos.y * canvasDimensions.height - (baseHeight * scale.y / 2)) * currentContainerScale;
        // 3. Vị trí cuối cùng trong container (cộng thêm offset căn giữa)
        const finalX = targetXCanvasScaled + offsetX;
        const finalY = targetYCanvasScaled + offsetY;

        // Áp dụng style cho target div
        targetElement.style.width = `${targetWidthCanvasScaled}px`;
        targetElement.style.height = `${targetHeightCanvasScaled}px`;
        targetElement.style.transform = `translate(${finalX}px, ${finalY}px) rotate(${rotation}deg)`;
        targetElement.style.display = 'block'; // Hiển thị target

        moveableInstance.updateRect(); // Cập nhật Moveable để khớp với target div
    }, [
        // Dependencies: Chạy lại khi clip chọn, thời gian, kích thước canvas, zoom thay đổi
        selectedClip, currentTime, projectState.canvasDimensions,
        previewZoomLevel, previewContainerRef, previewMoveableRef // Refs cũng là dependencies
    ]);


    // --- UI Handlers ---
    // Xử lý click menu chính
    const handleMenuClick = useCallback((e: { key: string }) => {
        setSelectedMenuKey(e.key);
        // Đóng drawer trên mobile khi chọn menu
        // if (screens.xs) closeMobileDrawer(); // `screens` cần được truyền vào từ component
    }, []); // Có thể thêm dependency nếu cần đóng drawer

    // Mở drawer trên mobile
    const showMobileDrawer = useCallback(() => {
        setMobileDrawerVisible(true);
    }, []);

    // Đóng drawer trên mobile
    const closeMobileDrawer = useCallback(() => {
        setMobileDrawerVisible(false);
    }, []);

    // --- HÀM ĐÃ SỬA ---
    // Xử lý Play/Pause
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


    // Xử lý việc seek trên timeline
    const handleTimelineSeek = useCallback((time: number) => {
        // Giới hạn thời gian seek trong khoảng hợp lệ của project
        const newTime = Math.max(0, Math.min(time, projectState.totalDuration || 0));
        setCurrentTime(newTime); // Cập nhật state thời gian global
        lastUpdateTimeRef.current = Date.now(); // Reset bộ đếm thời gian

        // Cập nhật thời gian nội bộ của các thẻ video
        projectState.tracks.forEach(track => {
            track.clips.forEach(clip => {
                if (clip.type === 'video') {
                    const element = mediaElementsRef.current[clip.id];
                    // Chỉ xử lý nếu video đã load metadata
                    if (element instanceof HTMLVideoElement && element.readyState >= element.HAVE_METADATA) {
                        // Tính thời gian tương đối bên trong clip
                        const clipTime = Math.max(0, newTime - clip.startTime);
                        // Kiểm tra xem clip có active tại thời điểm seek không
                        const isActive = newTime >= clip.startTime && newTime < clip.endTime;

                        // Luôn cập nhật currentTime của video nếu nó có liên quan
                        // (active hoặc đang play global) để đảm bảo frame đúng khi vẽ
                        if (isActive || projectState.isPlaying) {
                            // Chỉ set currentTime nếu nằm trong khoảng duration của video
                            if (clipTime >= 0 && clipTime <= element.duration + 0.1) { // Thêm khoảng đệm nhỏ
                                // Chỉ cập nhật nếu chênh lệch đủ lớn để tránh giật
                                if(Math.abs(element.currentTime - clipTime) > 0.1) {
                                    try {
                                        element.currentTime = clipTime;
                                        // console.log(`Seeked ${clip.id} to ${clipTime}`);
                                    } catch(e) {
                                        console.warn(`Error setting currentTime for ${clip.id} during seek:`, e)
                                    }
                                }
                            }
                        }

                        // Quản lý trạng thái play/pause của video dựa trên trạng thái global
                        if (projectState.isPlaying) { // Nếu editor đang play
                            if (isActive && element.paused) {
                                // Nếu clip active và đang pause -> play nó
                                element.play().catch(e=>console.warn("Seek play prevented", e));
                            } else if (!isActive && !element.paused) {
                                // Nếu clip không active và đang play -> pause nó
                                element.pause();
                            }
                        } else { // Nếu editor đang pause global
                            // Đảm bảo tất cả video đều pause
                            if (!element.paused) {
                                element.pause();
                            }
                        }
                    }
                }
            });
        });
        // Việc vẽ lại frame sẽ được xử lý bởi useEffect lắng nghe `currentTime` thay đổi.
    }, [
        projectState.totalDuration, projectState.tracks, projectState.isPlaying, projectState.playbackRate
    ]);

    // Bật/tắt mute preview
    const toggleMutePreview = useCallback(() => {
        setProjectState(prev => ({ ...prev, isPreviewMuted: !prev.isPreviewMuted }));
        // useEffect lắng nghe isPreviewMuted sẽ cập nhật các video elements
    }, []); // Không có dependencies

    // Thay đổi tốc độ phát
    const handlePlaybackRateChange = useCallback((rate: number) => {
        if (PLAYBACK_RATES.includes(rate)) { // Chỉ chấp nhận các giá trị hợp lệ
            setProjectState(prev => ({ ...prev, playbackRate: rate }));
            // useEffect lắng nghe playbackRate sẽ cập nhật các video elements
        }
    }, []); // Không có dependencies

    // Chụp ảnh snapshot từ canvas
    const handleCaptureSnapshot = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) { message.error("Preview canvas not available."); return; }
        try {
            drawFrame(currentTime); // Đảm bảo frame hiện tại được vẽ trước khi chụp
            const dataUrl = canvas.toDataURL('image/png'); // Lấy data URL
            // Tạo link tạm để download
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `snapshot_${projectState.projectName}_${formatTime(currentTime)}.png`; // Tên file download
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            message.success(`Snapshot captured at ${formatTime(currentTime)}`);
        } catch (error) {
            console.error("Failed to capture snapshot:", error);
            // Xử lý lỗi CORS nếu có
            if (error instanceof DOMException && error.name === 'SecurityError') message.error("Failed to capture snapshot: Canvas may be tainted by cross-origin resources.");
            else message.error("Failed to capture snapshot.");
        }
    }, [currentTime, drawFrame, projectState.projectName]); // Dependencies

    // Thêm clip text mới
    const handleAddTextClip = useCallback(() => {
        setProjectState(prev => {
            const targetTrackId = prev.tracks[0]?.id || `track-${Date.now()}`; // Lấy track đầu tiên hoặc tạo ID mới
            const newClipStartTime = currentTime; // Bắt đầu tại thời gian hiện tại
            // Tạo đối tượng clip text mới
            const newTextClip: Clip = {
                id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, type: 'text', source: "Text", // Nội dung mặc định
                trackId: targetTrackId, startTime: newClipStartTime, endTime: newClipStartTime + DEFAULT_CLIP_DURATION,
                duration: DEFAULT_CLIP_DURATION, position: { x: 0.5, y: 0.5 }, scale: { x: 1, y: 1 }, // Vị trí, scale mặc định
                rotation: 0, opacity: 1, keyframes: {}, name: "Text" // Tên mặc định
            };
            let updatedTracks = [...prev.tracks];
            const trackIndex = updatedTracks.findIndex(t => t.id === targetTrackId);
            // Thêm vào track hoặc tạo track mới nếu chưa có
            if (trackIndex === -1) { updatedTracks.push({ id: targetTrackId, clips: [newTextClip] }); }
            else { updatedTracks[trackIndex] = { ...updatedTracks[trackIndex], clips: [...updatedTracks[trackIndex].clips, newTextClip] }; }
            const newTotalDuration = calculateTotalDuration(updatedTracks); // Tính lại tổng duration
            // Cập nhật state và tự động chọn clip mới
            return { ...prev, tracks: updatedTracks, totalDuration: newTotalDuration, selectedClipId: newTextClip.id };
        });
        message.success("Text clip added");
    }, [currentTime, calculateTotalDuration]); // Dependencies

    // --- Asset & Clip Management ---
    // Xử lý sau khi file được upload thành công (thông qua customRequest)
    const handleUploadFinish = useCallback((fileName: string, file: File) => {
        message.success(`${fileName} uploaded successfully!`);
        const objectURL = URL.createObjectURL(file); // Tạo URL tạm thời cho file
        // Tạo đối tượng asset mới
        const newAsset: MediaAsset = { id: `asset-${Date.now()}`, name: fileName, file, type: file.type, objectURL };
        // Xác định loại file (video/image)
        const fileType = file.type.startsWith('video') ? 'video' : (file.type.startsWith('image') ? 'image' : 'unknown');
        if (fileType === 'unknown') {
            message.error("Unsupported file type."); URL.revokeObjectURL(objectURL); // Thu hồi URL nếu file không hợp lệ
            // Quay lại state 'initial' nếu chưa có asset nào
            setEditorState(projectState.mediaAssets.length > 0 ? 'editor' : 'initial');
            return;
        }

        // Tính toán thời gian bắt đầu cho clip mới (sau clip cuối cùng của track đầu tiên)
        let newClipStartTime = 0;
        const firstTrack = projectState.tracks[0];
        if (firstTrack && firstTrack.clips.length > 0) {
            newClipStartTime = Math.max(0, ...firstTrack.clips.map(c => c.endTime));
        }

        // Cập nhật state: thêm asset mới và clip mới
        setProjectState(prev => {
            const targetTrackId = prev.tracks[0]?.id || `track-${Date.now()}`; // Track đầu tiên
            // Tạo đối tượng clip mới
            const newClip: Clip = {
                id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, type: fileType, source: objectURL,
                trackId: targetTrackId, startTime: newClipStartTime,
                // Duration mặc định cho ảnh, duration rất nhỏ cho video (sẽ được cập nhật khi metadata load)
                duration: fileType === 'image' ? DEFAULT_CLIP_DURATION : 0.01,
                endTime: newClipStartTime + (fileType === 'image' ? DEFAULT_CLIP_DURATION : 0.01),
                position: { x: 0.5, y: 0.5 }, scale: { x: 1, y: 1 }, rotation: 0, opacity: 1, keyframes: {}, name: fileName,
                // Thumbnail cho ảnh là chính nó, video sẽ được tạo sau
                thumbnailUrls: fileType === 'image' ? [{ time: 0, url: objectURL }] : [],
            };
            let updatedTracks = [...prev.tracks];
            const trackIndex = updatedTracks.findIndex(t => t.id === targetTrackId);
            // Thêm clip vào track
            if (trackIndex === -1) { updatedTracks.push({ id: targetTrackId, clips: [newClip] }); }
            else { updatedTracks[trackIndex] = { ...updatedTracks[trackIndex], clips: [...updatedTracks[trackIndex].clips, newClip] }; }
            const newTotalDuration = calculateTotalDuration(updatedTracks); // Tính lại tổng duration
            // Cập nhật state
            return {
                ...prev,
                mediaAssets: [...prev.mediaAssets, newAsset], // Thêm asset
                tracks: updatedTracks, // Cập nhật tracks
                totalDuration: Math.max(prev.totalDuration, newTotalDuration) // Cập nhật duration (lấy max)
            };
        });
        setEditorState('editor'); // Chuyển sang trạng thái editor
    }, [projectState.mediaAssets.length, projectState.tracks, calculateTotalDuration]); // Dependencies

    // Props cho Ant Design Dragger component
    const draggerProps: UploadProps = useMemo(() => ({
        name: 'file', multiple: true, showUploadList: false, accept: "video/*,image/*", // Chỉ chấp nhận video/image
        // Xử lý upload hoàn toàn ở client-side
        customRequest: (options: any) => {
            const { file, onSuccess, onError } = options;
            try {
                // Gọi hàm xử lý file của chúng ta
                handleUploadFinish(file.name, file as File);
                // Báo thành công cho Antd Upload
                if (onSuccess) onSuccess({ status: 'done' }, file);
            } catch (error) {
                console.error("Upload processing error:", error);
                message.error(`Error processing ${file.name}`);
                // Báo lỗi cho Antd Upload
                if (onError) onError(error as Error, { status: 'error' });
                // Reset state nếu cần
                setEditorState(projectState.mediaAssets.length > 0 ? 'editor' : 'initial');
            }
        },
        // Kiểm tra file trước khi upload
        beforeUpload: (file: File) => {
            const isVideo = file.type.startsWith('video/');
            const isImage = file.type.startsWith('image/');
            if (!isVideo && !isImage) {
                message.error(`${file.name} is not a supported video or image file.`);
                return Upload.LIST_IGNORE; // Bỏ qua file không hợp lệ
            }
            setEditorState('uploading'); // Chuyển sang trạng thái uploading
            setUploadProgress(0); // Reset progress (nếu dùng)
            return true; // Cho phép upload (customRequest sẽ xử lý)
        },
        // Xử lý thay đổi trạng thái upload (chủ yếu để set lại editorState)
        onChange(info: UploadChangeParam) { // Use imported type
            if (info.file.status === 'error') {
                console.log(`${info.file.name} upload state changed to error.`);
                // Có thể cần set lại editorState ở đây nếu customRequest không xử lý hết
            } else if (info.file.status === 'done') {
                // Đảm bảo chuyển sang editor state sau khi upload xong
                setEditorState('editor');
            }
        },
        // Xử lý khi drop file vào Dragger
        onDrop: (e: React.DragEvent<HTMLDivElement>) => {
            setEditorState('uploading'); // Chuyển sang trạng thái uploading
            setUploadProgress(0);
        },
    }), [handleUploadFinish, projectState.mediaAssets.length]); // Dependencies

    // Chọn một clip trên timeline
    const handleSelectClip = useCallback((clipId: string | null) => {
        // Chỉ cập nhật state nếu clipId thay đổi
        if (projectState.selectedClipId !== clipId) {
            setProjectState(prev => ({ ...prev, selectedClipId: clipId }));
        }
    }, [projectState.selectedClipId]); // Dependency

    // Cập nhật các thuộc tính đơn giản của clip đang chọn (không phải keyframe)
    // Ví dụ: position, scale, rotation, opacity gốc
    const updateSelectedClipProperty = useCallback((
        // Chỉ cho phép cập nhật các thuộc tính có thể thay đổi trực tiếp
        propUpdates: Partial<Omit<Clip, 'keyframes' | 'id' | 'trackId' | 'type' | 'source' | 'duration' | 'startTime' | 'endTime' | 'thumbnailUrls' | 'originalWidth' | 'originalHeight' | 'name'>>
    ) => {
        if (!projectState.selectedClipId) return; // Thoát nếu không có clip nào được chọn
        setProjectState(prev => ({
            ...prev,
            tracks: prev.tracks.map(track => ({
                ...track,
                clips: track.clips.map(clip =>
                    clip.id === prev.selectedClipId
                        ? { ...clip, ...propUpdates } // Áp dụng các cập nhật
                        : clip
                )
            }))
        }));
        // Việc vẽ lại frame sẽ được effect xử lý do projectState.tracks thay đổi
    }, [projectState.selectedClipId]); // Dependency

    // Cập nhật nội dung text của clip đang chọn
    const updateSelectedClipText = useCallback((newText: string) => {
        if (!projectState.selectedClipId) return;
        setProjectState(prev => ({
            ...prev,
            tracks: prev.tracks.map(track => ({
                ...track,
                clips: track.clips.map(clip =>
                    (clip.id === prev.selectedClipId && clip.type === 'text') // Chỉ cập nhật nếu đúng clip và là loại text
                        ? { ...clip, source: newText } // Cập nhật source (nội dung text)
                        : clip
                )
            }))
        }));
        // Việc vẽ lại frame sẽ được effect xử lý
    }, [projectState.selectedClipId]); // Dependency

    // Thêm hoặc cập nhật keyframe cho một thuộc tính tại thời gian hiện tại
    const addOrUpdateKeyframe = useCallback((propName: keyof Clip['keyframes']) => {
        if (!selectedClip) return; // Sử dụng selectedClip đã memoized
        setProjectState(prev => {
            // Tìm track và clip index để cập nhật immutable
            let trackIndex = -1; let clipIndex = -1;
            for (let ti = 0; ti < prev.tracks.length; ti++) {
                const ci = prev.tracks[ti].clips.findIndex(c => c.id === selectedClip.id);
                if (ci !== -1) { trackIndex = ti; clipIndex = ci; break; }
            }
            if (trackIndex === -1 || clipIndex === -1) return prev; // Không tìm thấy clip (lỗi logic?)

            const clipToUpdate = prev.tracks[trackIndex].clips[clipIndex];
            // Xác định key của thuộc tính gốc trên clip (ví dụ: 'position', 'scale')
            let propKey: keyof Clip | null = null;
            if (propName === 'position') propKey = 'position';
            else if (propName === 'scale') propKey = 'scale';
            else if (propName === 'rotation') propKey = 'rotation';
            else if (propName === 'opacity') propKey = 'opacity';
            if (!propKey) return prev; // Thuộc tính không hỗ trợ keyframe

            // Lấy giá trị gốc của thuộc tính
            const defaultValue = clipToUpdate[propKey];
            // Nội suy giá trị *hiện tại* của thuộc tính tại currentTime để lưu vào keyframe
            const currentValue = interpolateValue(clipToUpdate.keyframes?.[propName], currentTime, defaultValue);

            // Tạo keyframe mới
            const newKf: Keyframe = { time: currentTime, value: currentValue };

            // Lấy danh sách keyframe hiện có của thuộc tính này
            const existingKfs = clipToUpdate.keyframes?.[propName] || [];
            // Lọc bỏ keyframe cũ tại cùng thời điểm (hoặc gần giống)
            const filteredKfs = existingKfs.filter(kf => Math.abs(kf.time - currentTime) > 0.001);
            // Thêm keyframe mới và sắp xếp lại theo thời gian
            const updatedPropertyKeyframes = [...filteredKfs, newKf].sort((a, b) => a.time - b.time);

            // Tạo đối tượng keyframes mới cho clip
            const updatedKeyframes = { ...clipToUpdate.keyframes, [propName]: updatedPropertyKeyframes };
            // Tạo đối tượng clip mới với keyframes đã cập nhật
            const updatedClip = { ...clipToUpdate, keyframes: updatedKeyframes };

            // Cập nhật state một cách immutable
            const updatedClips = [...prev.tracks[trackIndex].clips]; updatedClips[clipIndex] = updatedClip;
            const updatedTrack = { ...prev.tracks[trackIndex], clips: updatedClips };
            const updatedTracks = [...prev.tracks]; updatedTracks[trackIndex] = updatedTrack;
            return { ...prev, tracks: updatedTracks };
        });
        message.success(`Keyframe added for ${propName}`);
        // Việc vẽ lại frame sẽ được effect xử lý
    }, [selectedClip, currentTime]); // Dependencies

    // Xóa clip đang được chọn
    const handleDeleteClip = useCallback(() => {
        if (!projectState.selectedClipId) return;
        const clipName = selectedClip?.name || 'Clip'; // Lấy tên clip để hiển thị message
        setProjectState(prev => {
            // Lọc bỏ clip đã chọn khỏi tất cả các track
            const updatedTracks = prev.tracks
                .map(track => ({ ...track, clips: track.clips.filter(clip => clip.id !== prev.selectedClipId) }))
                // Lọc bỏ các track rỗng, trừ khi chỉ còn 1 track
                .filter(track => track.clips.length > 0 || prev.tracks.length === 1);

            // Nếu không còn track nào, tạo lại một track rỗng
            if (updatedTracks.length === 0) {
                updatedTracks.push({ id: `track-${Date.now()}`, clips: [] });
            }

            const newTotalDuration = calculateTotalDuration(updatedTracks); // Tính lại tổng duration
            // Cập nhật state và bỏ chọn clip
            return { ...prev, tracks: updatedTracks, totalDuration: newTotalDuration, selectedClipId: null };
        });
        message.success(`${clipName} deleted.`);
    }, [projectState.selectedClipId, selectedClip, calculateTotalDuration]); // Dependencies

    // Xử lý click menu zoom trong preview
    const handleZoomMenuClick = useCallback(({ key }: { key: string }) => {
        let newZoomLevel = previewZoomLevel;
        let newZoomMode = previewZoomMode;
        if (key === PREVIEW_ZOOM_FIT_MODE) { newZoomLevel = fitScaleFactor; newZoomMode = PREVIEW_ZOOM_FIT_MODE; }
        else if (key === PREVIEW_ZOOM_FILL_MODE) { newZoomLevel = fillScaleFactor; newZoomMode = PREVIEW_ZOOM_FILL_MODE; }
        else {
            // Xử lý các mức zoom cố định
            const level = parseFloat(key);
            // Chỉ cập nhật nếu là số hợp lệ và có trong danh sách mức zoom
            if (!isNaN(level) && PREVIEW_ZOOM_LEVELS.includes(level)) {
                newZoomLevel = level;
                newZoomMode = `${Math.round(newZoomLevel * 100)}%`; // Hiển thị dạng %
            } else {
                // Phím không hợp lệ (ví dụ: zoomIn/zoomOut chưa implement trực tiếp ở đây)
                return;
            }
        }
        setPreviewZoomLevel(newZoomLevel);
        setPreviewZoomMode(newZoomMode);
    }, [previewZoomLevel, previewZoomMode, fitScaleFactor, fillScaleFactor]); // Dependencies

    // --- Timeline Moveable Handlers ---
    // Xử lý kết thúc kéo thả clip trên timeline
    const onTimelineDragEnd = useCallback(({ target, isDrag, lastEvent }: OnDragEnd) => {
        if (!isDrag || !lastEvent?.beforeTranslate || !projectState.selectedClipId) return; // Thoát nếu không phải drag hợp lệ
        // Tìm clip đang được kéo
        const clip = projectState.tracks.flatMap(t => t.clips).find(c => c.id === projectState.selectedClipId);
        if (!clip) return;

        const deltaPx = lastEvent.beforeTranslate[0]; // Độ dịch chuyển theo pixel
        const pxPerSec = Math.max(20, timelineZoom); // Pixel trên giây hiện tại
        const deltaTime = deltaPx / pxPerSec; // Độ thay đổi thời gian

        const newStartTime = Math.max(0, clip.startTime + deltaTime); // Thời gian bắt đầu mới (không âm)
        const newEndTime = newStartTime + clip.duration; // Thời gian kết thúc mới

        // Reset transform tạm thời áp dụng trong lúc kéo
        target.style.transform = target.style.transform.replace(/translateX\([^)]+\)/, ''); // Chỉ xóa translateX

        // Sử dụng flushSync để cập nhật DOM đồng bộ trước khi Moveable tính toán lại
        flushSync(() => {
            setProjectState(prev => {
                const updatedTracks = prev.tracks.map(track => ({
                    ...track,
                    clips: track.clips.map(c =>
                        c.id === prev.selectedClipId
                            ? { ...c, startTime: newStartTime, endTime: newEndTime } // Cập nhật clip
                            : c
                    )
                }));
                const newTotalDuration = calculateTotalDuration(updatedTracks); // Tính lại tổng duration
                return { ...prev, tracks: updatedTracks, totalDuration: newTotalDuration };
            });
        });
        moveableRef.current?.updateRect(); // Yêu cầu Moveable cập nhật lại kích thước/vị trí
    }, [projectState.selectedClipId, projectState.tracks, timelineZoom, calculateTotalDuration]);

    // Xử lý trong khi resize clip trên timeline (chỉ cập nhật giao diện)
    const onTimelineResize = useCallback(({ target, width, drag, direction }: OnResize) => {
        // Cập nhật chiều rộng trực quan
        target.style.width = `${Math.max(1, width)}px`; // Đảm bảo chiều rộng tối thiểu
        // Lấy transform Y hiện tại (nếu có, ví dụ translateY(-50%))
        const yTransform = target.style.transform.match(/translateY\([^)]+\)/)?.[0] || 'translateY(-50%)'; // Mặc định là căn giữa Y
        // Nếu kéo handle bên trái, áp dụng cả translate X
        if (direction[0] === -1) { // Kéo handle 'w' (West/Left)
            target.style.transform = `translateX(${drag.beforeTranslate[0]}px) ${yTransform}`;
        } else { // Kéo handle 'e' (East/Right) hoặc khác
            target.style.transform = yTransform; // Chỉ giữ lại transform Y
        }
    }, []);

    // Xử lý kết thúc resize clip trên timeline
    const onTimelineResizeEnd = useCallback(({ target, isDrag, lastEvent }: OnResizeEnd) => {
        if (!isDrag || !lastEvent?.drag || !projectState.selectedClipId) return; // Thoát nếu không phải resize hợp lệ
        // Tìm clip đang resize
        const clip = projectState.tracks.flatMap(t => t.clips).find(c => c.id === projectState.selectedClipId);
        if (!clip) return;

        let newStartTime = clip.startTime;
        let newDuration = clip.duration;
        const pxPerSec = Math.max(20, timelineZoom); // Pixel trên giây

        // Tính toán dựa trên handle nào được kéo
        if (lastEvent.direction[0] === -1) { // Resize từ bên trái ('w')
            const deltaPx = lastEvent.drag.translate[0]; // Thay đổi vị trí pixel
            // const widthPx = lastEvent.width; // Chiều rộng cuối cùng pixel
            const timeDelta = deltaPx / pxPerSec; // Thay đổi thời gian
            const potentialNewStart = clip.startTime + timeDelta; // Thời gian bắt đầu tiềm năng
            // Giới hạn thời gian bắt đầu mới: không âm và không vượt quá (thời gian kết thúc cũ - duration tối thiểu)
            newStartTime = Math.max(0, Math.min(potentialNewStart, clip.endTime - MIN_CLIP_DURATION));
            newDuration = clip.endTime - newStartTime; // Tính lại duration dựa trên start mới và end cũ
        } else if (lastEvent.direction[0] === 1) { // Resize từ bên phải ('e')
            const widthPx = lastEvent.width; // Chiều rộng cuối cùng pixel
            newDuration = Math.max(MIN_CLIP_DURATION, widthPx / pxPerSec); // Duration mới (không nhỏ hơn min)
            newStartTime = clip.startTime; // Start time không đổi khi resize phải
        }

        const newEndTime = newStartTime + newDuration; // Tính lại end time

        // Reset style tạm thời
        target.style.width = '';
        const yTransform = target.style.transform.match(/translateY\([^)]+\)/)?.[0] || 'translateY(-50%)'; // Giữ lại Y transform
        target.style.transform = yTransform;

        // Cập nhật state đồng bộ
        flushSync(() => {
            setProjectState(prev => {
                const updatedTracks = prev.tracks.map(track => ({
                    ...track,
                    clips: track.clips.map(c =>
                        c.id === prev.selectedClipId
                            ? { ...c, startTime: newStartTime, endTime: newEndTime, duration: newDuration } // Cập nhật clip
                            : c
                    )
                }));
                const newTotalDuration = calculateTotalDuration(updatedTracks); // Tính lại tổng duration
                return { ...prev, tracks: updatedTracks, totalDuration: newTotalDuration };
            });
        });
        moveableRef.current?.updateRect(); // Cập nhật Moveable
    }, [projectState.selectedClipId, projectState.tracks, timelineZoom, calculateTotalDuration]);

    // --- Preview Moveable Handlers ---
    // (Cần implement chuyển đổi tọa độ để hoạt động chính xác)
    // Kết thúc kéo thả trên Preview
    const onPreviewDragEnd = useCallback(({ lastEvent }: OnDragEnd) => {
        if (!lastEvent || !selectedClip || !previewContainerRef.current || !projectState.canvasDimensions) return;
        // TODO: Chuyển đổi lastEvent.translate (pixel trong container) sang tọa độ chuẩn hóa (0-1) trên canvas
        // const newPosition = convertContainerPxToCanvasNormalized(...);
        // updateSelectedClipProperty({ position: newPosition });
        // addOrUpdateKeyframe('position');
        console.log("Preview Drag End - Translate (pixels):", lastEvent.translate);
        message.info("TODO: Update position after drag (needs coordinate conversion)");
    }, [selectedClip, projectState.canvasDimensions, previewZoomLevel, updateSelectedClipProperty, addOrUpdateKeyframe]); // Dependencies

    // Kết thúc resize trên Preview
    const onPreviewResizeEnd = useCallback(({ lastEvent, target }: OnResizeEnd) => {
        if (!lastEvent || !selectedClip || !previewContainerRef.current || !projectState.canvasDimensions || !selectedClip.originalWidth || !selectedClip.originalHeight) return;
        // TODO: Chuyển đổi lastEvent.width, lastEvent.height (pixel trong container) sang tỷ lệ scale (multiplier) so với kích thước gốc
        // const newScale = convertContainerPxToClipScale(...);
        // updateSelectedClipProperty({ scale: newScale });
        // addOrUpdateKeyframe('scale');
        console.log("Preview Resize End - Size (pixels):", { width: lastEvent.width, height: lastEvent.height });
        message.info("TODO: Update scale after resize (needs coordinate conversion)");
    }, [selectedClip, projectState.canvasDimensions, previewZoomLevel, updateSelectedClipProperty, addOrUpdateKeyframe]); // Dependencies

    // Kết thúc xoay trên Preview
    const onPreviewRotateEnd = useCallback(({ lastEvent }: OnRotateEnd) => {
        if (!lastEvent || !selectedClip) return;
        // Rotation đơn giản hơn, chỉ cần lấy giá trị cuối cùng
        const finalRotation = lastEvent.lastEvent?.rotate || lastEvent.rotate || 0;
        updateSelectedClipProperty({ rotation: finalRotation }); // Cập nhật thuộc tính gốc
        addOrUpdateKeyframe('rotation'); // Thêm keyframe tại thời điểm hiện tại
        console.log("Preview Rotate End - Rotation (degrees):", finalRotation);
    }, [selectedClip, updateSelectedClipProperty, addOrUpdateKeyframe]); // Dependencies

    // --- Exposed Values ---
    // Trả về tất cả state, refs, và handlers cần thiết cho UI component sử dụng
    return {
        // State
        editorState,
        projectState,
        setProjectState, // Cho phép component cha set state trực tiếp (cẩn thận khi sử dụng)
        currentTime,
        timelineZoom,
        setTimelineZoom,
        selectedMenuKey,
        mobileDrawerVisible,
        previewZoomLevel,
        previewZoomMode,
        // Refs (cho phép component cha truy cập DOM elements nếu cần)
        timelineContainerRef,
        canvasRef,
        previewContainerRef,
        moveableRef,
        previewMoveableRef,
        // Handlers (các hàm xử lý sự kiện UI)
        handleMenuClick,
        showMobileDrawer,
        closeMobileDrawer,
        handlePlayPause,
        handleTimelineSeek,
        toggleMutePreview,
        handlePlaybackRateChange,
        handleCaptureSnapshot,
        handleUploadFinish,
        draggerProps, // Props cho Upload component
        handleSelectClip,
        updateSelectedClipProperty,
        updateSelectedClipText,
        addOrUpdateKeyframe,
        handleDeleteClip,
        handleAddTextClip,
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
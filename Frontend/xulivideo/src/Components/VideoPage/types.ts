// --- types.ts content (corrected) ---
export interface ThumbnailInfo {
    time: number;
    url: string;
}

export interface Keyframe {
    time: number;
    // Note: value type can be expanded based on needs (e.g., color string, boolean)
    value: number | { x: number; y: number } | string | any;
}
export type SubtitleTextAlign = 'left' | 'center' | 'right';
// Define allowed clip types explicitly
export type ClipType = 'video' | 'image' | 'text';

export interface Clip {
    id: string;
    type: ClipType; // Use the defined type
    source: string | File; // Source could be a blob URL, http URL (secureUrl), or the original File object
    trackId: string; // The ID of the track this clip belongs to
    startTime: number; // Start time of the clip on the timeline (in seconds)
    endTime: number; // End time of the clip on the timeline (in seconds)
    duration: number; // Duration of the clip on the timeline (in seconds) - Note: for video, this might be updated after metadata loads
    // Properties for visual transformation on the canvas
    position: { x: number; y: number }; // Normalized position {0-1} relative to canvas center
    scale: { x: number; y: number };   // Scale factor relative to original size
    rotation: number;                  // Rotation in degrees
    opacity: number;                   // Opacity {0-1}
    // Keyframes for animating properties over time
    keyframes: {
        position?: Keyframe[];
        scale?: Keyframe[];
        rotation?: Keyframe[];
        opacity?: Keyframe[];
        // Add other properties here as needed for animation
    };
    originalWidth?: number;  // Original dimensions of the media (video/image)
    originalHeight?: number; // Used for scaling calculations
    name?: string;           // Display name for the clip (e.g., filename)
    thumbnailUrls?: ThumbnailInfo[]; // URLs of generated thumbnails for the timeline
    secureUrl?: string; // It's redundant here if source is the secureUrl, but keeping it doesn't hurt and might be used elsewhere. The primary source of truth after upload is `source`.

    // --- ADDED: Properties for text clips (non-subtitles) ---
    color?: string;       // Text color (e.g., '#FFFFFF' or 'rgba(...)')
    fontSize?: number;    // Font size (e.g., 50)
    fontFamily?: string;  // Font family (e.g., 'Arial')
    // -----------------------------------------------------
}

export interface Track {
    id: string;
    clips: Clip[];
    // Add track-specific properties here if needed (e.g., name, mute state, lock state)
}

export interface SrtSegment {
    start: string; // e.g., "00:00:00,000"
    end: string;   // e.g., "00:00:12,000"
    text: string;
}

export interface MediaAsset {
    id: string;
    name: string;
    file?: File; // <<< MADE OPTIONAL TO HANDLE LOADING FROM URL
    type: string; // MIME type (e.g., 'video/mp4', 'image/png')
    objectURL?: string; // <<< ĐẢM BẢO THUỘC TÍNH objectURL CÓ Ở ĐÂY (for local blob URLs before upload/processing)
    secureUrl?: string; // <<< ĐẢM BẢO THUỘC TÍNH secureUrl CÓ Ở ĐÂY (for the permanent backend URL)
}

// --- New Type for Subtitle Entries ---
export interface SubtitleEntry {
    id: string;       // Unique ID for react keys and selection/editing
    startTime: number; // Start time of the subtitle (in seconds)
    endTime: number;   // End time of the subtitle (in seconds)
    text: string;      // The subtitle text
}


// --- Updated Editor Project State ---
export interface EditorProjectState {
    projectName: string;
    tracks: Track[];
    mediaAssets: MediaAsset[];
    canvasDimensions: { width: number; height: number };
    totalDuration: number; // Total duration of the project (usually based on the last clip's end time)
    selectedClipId: string | null; // ID of the currently selected clip
    isPlaying: boolean;
    isPreviewMuted: boolean;
    playbackRate: number;

    // --- Upload State (ADDED) ---
    // State variables to track the status of a manual upload process
    uploadProgress: number; // Progress percentage (0-100)
    uploadingFile: File | string | null;  // Đổi kiểu ở đây, cho phép nhận cả File và string (File during HTTP upload, string for status messages like "Transcribing")

    currentUploadTaskId: string | null; // Task ID from the backend for tracking progress via WS
    uploadTimeRemaining?: string; // <<< CẬP NHẬT STATE cho thời gian còn lại

    // ----------------------------

    // --- Preview Zoom State ---
    previewZoomLevel: number; // Current numerical zoom level
    previewZoomMode: string;  // Current zoom mode ('fit', 'fill', or percentage string)

    // --- Subtitle State ---
    subtitles: SubtitleEntry[]; // Array of subtitle entries
    subtitleFontFamily: string; // Global font family for subtitles
    subtitleFontSize: number;   // Global font size for subtitles (in pixels at 720p canvas height)
    subtitleTextAlign: 'left' | 'center' | 'right'; // <--- ADDED: Global text alignment for subtitles

    // --- ADDED: Global Subtitle Text Styles ---
    isSubtitleBold: boolean;
    isSubtitleItalic: boolean;
    isSubtitleUnderlined: boolean;
    subtitleColor: string; // <--- ADDED: Global text color for subtitles (hex string)
    subtitleBackgroundColor: string; // <--- ADDED: Global background color for subtitles (hex or rgba string)


    // Note: The editorState property was previously part of this interface in some examples,
    // but in the latest useVideoEditorLogic provided, editorState is a separate useState.
    // Based on the latest code structure, editorState is NOT be in EditorProjectState.
    // If it was intended to be part of projectState, the hook would need modification.
    // Sticking to the structure implied by the hook code: editorState is separate.
    // The MediaPanelProps still receives editorState separately, which confirms this.
}


// Type for the return value of the logic hook
// This uses ReturnType to infer the exact shape returned by useVideoEditorLogic
// Ensure the path is correct relative to this types file
// Assuming useVideoEditorLogic.ts is in the same directory
export type VideoEditorLogic = ReturnType<typeof import('./useVideoEditorLogic').useVideoEditorLogic>;
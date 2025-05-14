export interface ThumbnailInfo {
    time: number;
    url: string;
}

export interface Keyframe {
    time: number;
    // Note: value type can be expanded based on needs (e.g., color string, boolean)
    value: number | { x: number; y: number } | string | any;
}

// Define allowed clip types explicitly
export type ClipType = 'video' | 'image' | 'text';

export interface Clip {
    id: string;
    type: ClipType; // Use the defined type
    source: string | File; // Source could be a blob URL, http URL, or the original File object
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
}

export interface Track {
    id: string;
    clips: Clip[];
    // Add track-specific properties here if needed (e.g., name, mute state, lock state)
}

export interface MediaAsset {
    id: string;
    name: string;
    file: File; // Store the original file object
    type: string; // MIME type (e.g., 'video/mp4', 'image/png')
    objectURL?: string; // Temporary URL for accessing the file in the browser
    // Add other asset metadata here if needed (e.g., duration, dimensions, upload date)
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
    // --- Added Subtitle State ---
    subtitles: SubtitleEntry[]; // Array of subtitle entries
}


// Type for the return value of the logic hook
// This uses ReturnType to infer the exact shape returned by useVideoEditorLogic
// Ensure the path is correct relative to this types file
export type VideoEditorLogic = ReturnType<typeof import('./useVideoEditorLogic').useVideoEditorLogic>;
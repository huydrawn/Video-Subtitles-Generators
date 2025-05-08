export interface ThumbnailInfo {
    time: number;
    url: string;
}

export interface Keyframe {
    time: number;
    value: number | { x: number; y: number } | string | any;
}

// Define allowed clip types explicitly
export type ClipType = 'video' | 'image' | 'text'; // Removed 'audio' for now based on error

export interface Clip {
    id: string;
    type: ClipType;
    source: string | File;
    trackId: string;
    startTime: number;
    endTime: number;
    duration: number;
    position: { x: number; y: number };
    scale: { x: number; y: number };
    rotation: number;
       opacity?: number; // Make opacity optional
    keyframes: {
        position?: Keyframe[];
        scale?: Keyframe[];
        rotation?: Keyframe[];
        opacity?: Keyframe[];
    };
    originalWidth?: number;
    originalHeight?: number;
    name?: string;
    thumbnailUrls?: ThumbnailInfo[];
}

export interface Track {
    id: string;
    clips: Clip[];
}

export interface MediaAsset {
    id: string;
    name: string;
    file: File;
    type: string;
    objectURL?: string;
}

export interface EditorProjectState {
    projectName: string;
    tracks: Track[];
    mediaAssets: MediaAsset[];
    canvasDimensions: { width: number; height: number };
    totalDuration: number;
    selectedClipId: string | null;
    isPlaying: boolean;
    isPreviewMuted: boolean;
    playbackRate: number;
}

// Type for the return value of the logic hook
// Ensure the path is correct relative to this types file
export type VideoEditorLogic = ReturnType<typeof import('./useVideoEditorLogic').useVideoEditorLogic>;
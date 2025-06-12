// --- types.ts content (corrected and enhanced) ---
export interface ThumbnailInfo {
    time: number;
    url: string;
}

export interface Keyframe {
    time: number;
    value: number | { x: number; y: number } | string | any;
}
export type SubtitleTextAlign = 'left' | 'center' | 'right';
export type ClipType = 'video' | 'image' | 'text' | 'audio'; // Add 'audio'

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
    opacity: number;
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
    secureUrl?: string;
    color?: string;
    fontSize?: number;
    fontFamily?: string;
}

export interface Track {
    id: string;
    clips: Clip[];
}

export interface SrtSegment {
    start: string;
    end: string;
    text: string;
}

export interface MediaAsset {
    id: string;
    name: string;
    file?: File;
    type: string;
    objectURL?: string;
    secureUrl?: string;
}

export interface SubtitleEntry {
    id: string;
    startTime: number;
    endTime: number;
    text: string;
}

// --- NEW: Unified Editor Status Type ---
export type EditorStatus =
    | 'initial'
    | 'uploading'
    | 'transcribing'
    | 'processing_video' // This was the key missing piece for PlaybackController
    | 'editor';
// --- End: Unified Editor Status Type ---

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
    uploadProgress: number;
    uploadingFile: File | string | null;
    currentUploadTaskId: string | null;
    uploadTimeRemaining?: string;
    previewZoomLevel: number;
    previewZoomMode: string;
    subtitles: SubtitleEntry[];
    subtitleFontFamily: string;
    subtitleFontSize: number;
    subtitleTextAlign: SubtitleTextAlign; // Corrected to use the defined type
    isSubtitleBold: boolean;
    isSubtitleItalic: boolean;
    isSubtitleUnderlined: boolean;
    subtitleColor: string;
    subtitleBackgroundColor: string;
    processingProgress?: number;
}

// For useVideoEditorLogic.ts, SubtitleManager.ts, UploadManager.ts,
// they will use this EditorStatus type for their setEditorState dispatch.
// Example: setEditorState: Dispatch<SetStateAction<EditorStatus>>;

// For PlaybackController.ts, its methods should accept EditorStatus.
// Example (in PlaybackController):
// public renderLoop = (..., editorState: EditorStatus, ...): void => { ... }
// public handlePlayPause = (..., editorState: EditorStatus): void => { ... }


// Type for the return value of the logic hook
// This will also need to reflect that setEditorState uses EditorStatus
// And editorState itself is of type EditorStatus
export type VideoEditorLogic = Omit<
    ReturnType<typeof import('./Logic/useVideoEditorLogic').useVideoEditorLogic>,
    'editorState' | 'setEditorState'
> & {
    editorState: EditorStatus;
    setEditorState: React.Dispatch<React.SetStateAction<EditorStatus>>;
};
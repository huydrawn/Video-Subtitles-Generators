// src/Hooks/constants.ts

export const THUMBNAIL_INTERVAL = 5;
export const DEFAULT_CLIP_DURATION = 5;
export const PLAYBACK_RATES = [0.25, 0.5, 1.0, 1.5, 2.0];
export const MIN_CLIP_DURATION = 0.1;
export const PREVIEW_ZOOM_LEVELS = [0.1, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0, 8.0, 16.0];
export const PREVIEW_ZOOM_FIT_MODE = 'fit';
export const PREVIEW_ZOOM_FILL_MODE = 'fill';

// Subtitle Constants
// These constants are now mostly for styling, not for positioning/sizing calculations,
// as position/size are now calculated dynamically based on canvas dimensions.
export const SUBTITLE_LINE_HEIGHT_MULTIPLIER = 1.2;
export const SUBTITLE_OUTLINE_WIDTH = 2;
export const SUBTITLE_FILL_COLOR = '#FFFFFF';
export const SUBTITLE_OUTLINE_COLOR = '#000000';
export const SUBTITLE_BACKGROUND_COLOR = 'rgba(0, 0, 0, 0.7)';
export const DEFAULT_SUBTITLE_FONT_SIZE = 30; // Still used as a default for UI, but rendered font size is dynamic
export const DEFAULT_SUBTITLE_TEXT_ALIGN = 'center';
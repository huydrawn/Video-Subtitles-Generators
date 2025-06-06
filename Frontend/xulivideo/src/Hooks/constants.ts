// file: ../constants.ts (hoặc đường dẫn tương ứng)

export const THUMBNAIL_INTERVAL = 5;
export const DEFAULT_CLIP_DURATION = 5;
export const PLAYBACK_RATES = [0.25, 0.5, 1.0, 1.5, 2.0];
export const MIN_CLIP_DURATION = 0.1;
export const PREVIEW_ZOOM_LEVELS = [0.1, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0, 8.0, 16.0];
export const PREVIEW_ZOOM_FIT_MODE = 'fit';
export const PREVIEW_ZOOM_FILL_MODE = 'fill';

// Subtitle Constants
export const SUBTITLE_MAX_WIDTH_PX = 700; // Có thể vẫn giữ lại nếu cần ở đâu đó
export const SUBTITLE_BOTTOM_MARGIN_PX = 140; // Có thể vẫn giữ lại

// --- THÊM CÁC HẰNG SỐ TỶ LỆ PHẦN TRĂM ---
export const SUBTITLE_MAX_WIDTH_PERCENTAGE = 0.9; // ví dụ: 90% chiều rộng canvas
export const SUBTITLE_BOTTOM_MARGIN_PERCENTAGE = 0.08; // ví dụ: 8% chiều cao canvas từ dưới lên
// --- KẾT THÚC THÊM ---

export const SUBTITLE_LINE_HEIGHT_MULTIPLIER = 1.2;
export const SUBTITLE_OUTLINE_WIDTH = 2; // Có thể bạn sẽ muốn làm cái này động dựa trên font size
export const SUBTITLE_FILL_COLOR = '#FFFFFF';
export const SUBTITLE_OUTLINE_COLOR = '#000000';
export const SUBTITLE_BACKGROUND_COLOR = 'rgba(0, 0, 0, 0.7)';
export const DEFAULT_SUBTITLE_FONT_SIZE = 30;
export const DEFAULT_SUBTITLE_TEXT_ALIGN = 'center';
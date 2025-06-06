// src/Components/VideoPage/utils.ts

import type {Keyframe, Track} from './types'; // Assuming types are imported

/**
 * Formats time in seconds to a string.
 * If `includeHoursAndPad` is true, format is HH:MM:SS.mmm.
 * Otherwise, format is MM:SS.mmm (where MM can be > 59).
 * @param seconds - The time in seconds.
 * @param includeHoursAndPad - Optional. If true, includes hours and pads all components. Defaults to false.
 * @returns The formatted time string.
 */
export const formatTime = (seconds: number, includeHoursAndPad: boolean = false): string => {
    if (isNaN(seconds) || seconds < 0) {
        return includeHoursAndPad ? '00:00:00.000' : '00:00.000';
    }

    const totalMs = Math.floor(seconds * 1000);
    const ms = String(totalMs % 1000).padStart(3, '0');
    const totalSecValue = Math.floor(totalMs / 1000); // Renamed to avoid conflict with 'seconds' param

    if (includeHoursAndPad) {
        const hrs = String(Math.floor(totalSecValue / 3600)).padStart(2, '0');
        const mins = String(Math.floor((totalSecValue % 3600) / 60)).padStart(2, '0');
        const secs = String(totalSecValue % 60).padStart(2, '0');
        return `${hrs}:${mins}:${secs}.${ms}`;
    } else {
        // Original logic: total minutes, seconds, milliseconds
        const mins = String(Math.floor(totalSecValue / 60)).padStart(2, '0'); // Total minutes
        const secs = String(totalSecValue % 60).padStart(2, '0'); // Seconds part of minute
        return `${mins}:${secs}.${ms}`;
    }
};

export const parseTimecodeToSeconds = (timecode: string): number => {
    const parts = timecode.replace(',', '.').split(':');
    if (parts.length !== 3) { // Standard SRT/VTT hh:mm:ss.mss
        // Attempt to parse ASS H:MM:SS.ss
        if (parts.length === 3 && parts[2].includes('.')) { // H:MM:SS.ss
            const hours = parseInt(parts[0], 10) || 0;
            const minutes = parseInt(parts[1], 10) || 0;
            const secondsParts = parts[2].split('.');
            const seconds = parseInt(secondsParts[0], 10) || 0;
            const centiseconds = parseInt(secondsParts[1], 10) || 0; // ASS uses centiseconds
            return hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
        }
        return 0;
    }
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const secondsParts = parts[2].split('.');
    const seconds = parseInt(secondsParts[0], 10) || 0;
    const milliseconds = parseInt(secondsParts[1]?.[0] + secondsParts[1]?.[1] + secondsParts[1]?.[2], 10) || 0;
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
};

export const interpolateValue = (kfs: Keyframe[] | undefined, time: number, defaultValue: any): any => {
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
    if (typeof pVal === 'number' && typeof nVal === 'number') return pVal + (nVal - pVal) * factor;
    if (typeof pVal === 'object' && typeof nVal === 'object' && pVal !== null && nVal !== null && 'x' in pVal && 'y' in pVal && 'x' in nVal && 'y' in nVal) {
        const p = pVal as { x: number, y: number }; const n = nVal as { x: number, y: number };
        return { x: p.x + (n.x - p.x) * factor, y: p.y + (n.y - p.y) * factor };
    }
    return pVal; // For non-interpolatable types, return previous keyframe's value
};

export const getWrappedLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const lines: string[] = [];
    if (!text) return lines;
    const segments = text.split('\n'); // Respect existing newlines
    segments.forEach(segment => {
        const words = segment.split(' ');
        let currentLine = '';
        words.forEach((word, index) => {
            if (index === 0) { currentLine = word; }
            else {
                const testLine = currentLine + ' ' + word;
                if (ctx.measureText(testLine).width > maxWidth && currentLine !== '') { // Ensure currentLine is not empty before pushing
                    lines.push(currentLine);
                    currentLine = word;
                }
                else { currentLine = testLine; }
            }
        });
        if (currentLine !== '') lines.push(currentLine);
    });
    return lines;
};

export const calculateTotalDuration = (tracks: Track[]): number => {
    let maxEndTime = 0;
    tracks.forEach(track => track.clips.forEach(clip => maxEndTime = Math.max(maxEndTime, clip.endTime)));
    return Math.max(0, maxEndTime);
};

// --- NEW HELPER FUNCTIONS FOR ASS EXPORT ---

// Helper function to format seconds to H:MM:SS.ss for ASS
export const formatTimeToAss = (totalSeconds: number): string => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return '0:00:00.00';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const centiseconds = Math.floor(Math.round((totalSeconds - Math.floor(totalSeconds)) * 100)); // Round to nearest centisecond

    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
};

// Helper function to convert CSS color (hex, rgb, rgba) to ASS &HAABBGGRR format
export const convertColorToAss = (cssColor: string): string => {
    // Create a temporary canvas to normalize the color string
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '&H00FFFFFF'; // Default to white opaque if canvas context fails

    ctx.fillStyle = cssColor;
    // Forcing redraw and getting color data is more robust for all css color formats
    ctx.fillRect(0,0,1,1);
    const imageData = ctx.getImageData(0,0,1,1).data;
    const r = imageData[0];
    const g = imageData[1];
    const b = imageData[2];
    const a_css_255 = imageData[3]; // CSS Alpha (0-255 range)

    const a_css_decimal = a_css_255 / 255; // CSS alpha (0 transparent, 1 opaque)

    // ASS Alpha (AA): 00 (opaque) to FF (transparent)
    const assAlpha = Math.round((1 - a_css_decimal) * 255);
    const assAlphaHex = assAlpha.toString(16).padStart(2, '0').toUpperCase();
    const blueHex = b.toString(16).padStart(2, '0').toUpperCase();
    const greenHex = g.toString(16).padStart(2, '0').toUpperCase();
    const redHex = r.toString(16).padStart(2, '0').toUpperCase();

    return `&H${assAlphaHex}${blueHex}${greenHex}${redHex}`;
};

// Helper function to get ASS alignment code (Numpad layout for bottom alignment)
export const getAssAlignment = (textAlign: 'left' | 'center' | 'right'): number => {
    switch (textAlign) {
        case 'left': return 1;   // Bottom-left
        case 'center': return 2; // Bottom-center
        case 'right': return 3;  // Bottom-right
        default: return 2;       // Default to bottom-center
    }
};
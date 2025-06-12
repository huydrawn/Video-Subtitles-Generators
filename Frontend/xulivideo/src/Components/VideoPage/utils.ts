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
export const getKapwingTimelineLabelInterval = (
    totalDurationSeconds: number,
    currentPxPerSec: number // Current pixels per second based on zoom
): number => {
    if (totalDurationSeconds < 0) totalDurationSeconds = 0; // Handle negative duration gracefully

    let kapwingIntervals: number[]; // Allowed intervals for this duration, smallest to largest
    let kapwingDefaultInterval: number; // The "Mặc định" or "Phổ biến" interval from Kapwing's logic

    // Determine Kapwing's suggested range and default based on total video duration
    if (totalDurationSeconds < 30) {
        // Kapwing: < 30 giây: 1–2 giây. Mặc định thường là 2s. Zoom cao có thể 1s.
        kapwingIntervals = [1, 2];
        kapwingDefaultInterval = 2;
    } else if (totalDurationSeconds <= 60) { // 30 giây – 1 phút
        // Kapwing: 2–5 giây. Tùy zoom, phổ biến là 5s.
        kapwingIntervals = [2, 3, 4, 5];
        kapwingDefaultInterval = 5;
    } else if (totalDurationSeconds <= 180) { // 1 – 3 phút (e.g., 180s)
        // Kapwing: 10 – 20 giây. Mặc định thường là 18s. (Example: 143s video -> 18s mốc)
        kapwingIntervals = [10, 12, 15, 18, 20];
        kapwingDefaultInterval = 18;
    } else { // > 3 phút
        // Kapwing: 30 giây – 2 phút (120s). Mốc càng thưa nếu không zoom. (Example: 6 min video -> 1 min mốc)
        kapwingIntervals = [30, 45, 60, 90, 120];

        const targetMarkersForDefault = (6 + 12) / 2; // Aim for ~9 markers
        let closestToTargetDefault = kapwingIntervals[0];
        if (totalDurationSeconds > 0) { // Avoid division by zero if duration is 0
            let minDiffForDefault = Infinity;
            for (const iv of kapwingIntervals) {
                if (iv <= 0) continue;
                const currentMarkers = totalDurationSeconds / iv;
                const diff = Math.abs(currentMarkers - targetMarkersForDefault);
                if (diff < minDiffForDefault) {
                    minDiffForDefault = diff;
                    closestToTargetDefault = iv;
                } else if (diff === minDiffForDefault && iv < closestToTargetDefault) {
                    closestToTargetDefault = iv;
                }
            }
        }
        kapwingDefaultInterval = closestToTargetDefault;
    }

    // --- Adjust interval choice based on zoom (currentPxPerSec) ---
    let targetMinTotalMarkers: number, targetMaxTotalMarkers: number;
    if (totalDurationSeconds < 30) { targetMinTotalMarkers = 10; targetMaxTotalMarkers = 30; }
    else if (totalDurationSeconds <= 60) { targetMinTotalMarkers = 8; targetMaxTotalMarkers = 20; }
    else if (totalDurationSeconds <= 180) { targetMinTotalMarkers = 7; targetMaxTotalMarkers = 18; }
    else { targetMinTotalMarkers = 5; targetMaxTotalMarkers = 12; }

    let chosenInterval = kapwingDefaultInterval;
    const idealPxPerSecondForDefault = 50; // Reference "normal" zoom level (e.g., 1s = 50px)
    let idealIntervalIndex = kapwingIntervals.indexOf(kapwingDefaultInterval);
    if (idealIntervalIndex === -1) idealIntervalIndex = Math.floor(kapwingIntervals.length / 2);

    if (currentPxPerSec > idealPxPerSecondForDefault * 1.8 && idealIntervalIndex > 0) {
        idealIntervalIndex--;
        if (totalDurationSeconds < 30 && currentPxPerSec > 100 && kapwingIntervals[0] === 1) {
            idealIntervalIndex = 0; // Kapwing: <30s, zoom cao có thể 1s.
        }
    } else if (currentPxPerSec < idealPxPerSecondForDefault * 0.6 && idealIntervalIndex < kapwingIntervals.length - 1) {
        idealIntervalIndex++;
    }

    chosenInterval = kapwingIntervals[idealIntervalIndex] || kapwingDefaultInterval;

    // Refine choice to ensure the total number of markers is within Kapwing's guidelines for the *entire video*
    if (totalDurationSeconds > 0 && chosenInterval > 0) { // Avoid division by zero
        const currentTotalMarkersWithZoomChoice = totalDurationSeconds / chosenInterval;

        if (currentTotalMarkersWithZoomChoice < targetMinTotalMarkers && chosenInterval !== kapwingIntervals[0]) {
            for (let i = idealIntervalIndex - 1; i >= 0; i--) {
                const smallerInterval = kapwingIntervals[i];
                if (smallerInterval <= 0) continue;
                if (totalDurationSeconds / smallerInterval >= targetMinTotalMarkers || i === 0) {
                    if (totalDurationSeconds / smallerInterval <= targetMaxTotalMarkers || totalDurationSeconds / smallerInterval < targetMinTotalMarkers) {
                        chosenInterval = smallerInterval;
                        break;
                    }
                }
            }
        } else if (currentTotalMarkersWithZoomChoice > targetMaxTotalMarkers && chosenInterval !== kapwingIntervals[kapwingIntervals.length -1]) {
            for (let i = idealIntervalIndex + 1; i < kapwingIntervals.length; i++) {
                const largerInterval = kapwingIntervals[i];
                if (largerInterval <= 0) continue;
                if (totalDurationSeconds / largerInterval <= targetMaxTotalMarkers || i === kapwingIntervals.length -1 ) {
                    if (totalDurationSeconds / largerInterval >= targetMinTotalMarkers || totalDurationSeconds / largerInterval > targetMaxTotalMarkers) {
                        chosenInterval = largerInterval;
                        break;
                    }
                }
            }
        }
    }

    if (totalDurationSeconds === 0) return 1; // Default for zero duration
    if (chosenInterval <= 0) chosenInterval = kapwingIntervals.find(iv => iv > 0) || 1; // Ensure positive

    // Ensure interval is not excessively large for very short videos if auto-calculation leads to it
    if (totalDurationSeconds > 0 && chosenInterval > totalDurationSeconds && kapwingIntervals.length > 0) {
        let feasibleInterval = [...kapwingIntervals].reverse().find(iv => iv > 0 && iv <= totalDurationSeconds);
        chosenInterval = feasibleInterval || Math.max(1, totalDurationSeconds); // Pick largest valid or duration itself (min 1s)
    }
    // If total duration is small, e.g., 0.5s, and smallest interval is 1s, use totalDuration.
    if (totalDurationSeconds > 0 && totalDurationSeconds < chosenInterval) {
        chosenInterval = totalDurationSeconds;
    }

    return Math.max(0.1, chosenInterval); // Ensure a minimum practical interval
};

export const formatRulerTimeForDynamicLabels = (totalSeconds: number): string => {
    if (totalSeconds < 0) totalSeconds = 0; // Ensure non-negative
    const ss = Math.floor(totalSeconds % 60);
    const mm = Math.floor(totalSeconds / 60) % 60;
    const hh = Math.floor(totalSeconds / 3600);
    const pad = (num: number) => (num < 10 ? '0' : '') + num;

    if (hh > 0) {
        return `${hh}:${pad(mm)}:${pad(ss)}`; // e.g., 1:00:18
    }
    if (mm > 0) {
        return `${mm}:${pad(ss)}`; // e.g., 1:12, 1:30
    }
    if (totalSeconds === 0) { // Specifically for the "0" mark
        return "0";
    }
    // For seconds only, e.g., :18, :36, :54
    return `:${pad(ss)}`;
};
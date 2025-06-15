// src/Components/VideoPage/utils.ts

import type { Keyframe, Track } from './types'; // Assuming types are imported
import { SubtitleTextAlign } from './types'; // Import SubtitleTextAlign type

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
        const mins = String(Math.floor(totalSecValue / 60)).padStart(2, '0');
        const secs = String(totalSecValue % 60).padStart(2, '0');
        return `${mins}:${secs}.${ms}`;
    }
};

export const parseTimecodeToSeconds = (timecode: string): number => {
    const parts = timecode.replace(',', '.').split(':');
    if (parts.length !== 3) {
        // Handle cases like "MM:SS.mmm" by prepending "00:"
        if (parts.length === 2 && parts[1].includes('.')) {
            const minutes = parseInt(parts[0], 10) || 0;
            const secondsParts = parts[1].split('.');
            const seconds = parseInt(secondsParts[0], 10) || 0;
            const milliseconds = parseInt((secondsParts[1] || '0').padEnd(3, '0').substring(0, 3), 10) || 0; // Ensure 3 digits for milliseconds
            return minutes * 60 + seconds + milliseconds / 1000;
        }
        // If it's still not in a recognizable format, return 0
        return 0;
    }
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const secondsParts = parts[2].split('.');
    const seconds = parseInt(secondsParts[0], 10) || 0;
    // Ensure milliseconds are correctly parsed from the fractional part (up to 3 digits)
    const milliseconds = parseInt((secondsParts[1] || '0').padEnd(3, '0').substring(0, 3), 10) || 0;
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
    return pVal;
};

export const getWrappedLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const lines: string[] = [];
    if (!text) return lines;
    const segments = text.split('\n');
    segments.forEach(segment => {
        const words = segment.split(' ');
        let currentLine = '';
        words.forEach((word, index) => {
            if (index === 0) { currentLine = word; }
            else {
                const testLine = currentLine + ' ' + word;
                if (ctx.measureText(testLine).width > maxWidth && currentLine !== '') {
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

// --- NEW/UPDATED HELPER FUNCTIONS FOR ASS EXPORT ---

/**
 * Formats a time in seconds to ASS (Advanced SubStation Alpha) timecode format.
 * Format: H:MM:SS.cs (hours:minutes:seconds.centiseconds)
 * Centiseconds are hundredths of a second.
 *
 * @param {number} totalSeconds - The time in seconds.
 * @returns {string} The formatted ASS timecode.
 */
export const formatTimeToAss = (totalSeconds: number): string => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return '0:00:00.00';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    // ASS uses centiseconds (1/100 of a second), rounded to nearest integer
    // IMPORTANT: Make sure to convert fractional seconds to centiseconds (e.g., 0.123 -> 12, 0.987 -> 99)
    const centiseconds = Math.floor(Math.round((totalSeconds - Math.floor(totalSeconds)) * 100));

    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
};

/**
 * Converts a hex/rgba color string to ASS BGR (Blue-Green-Red) hex format with Alpha.
 * ASS format: &H(AA)BBGGRR
 * AA: Alpha channel, 00 = opaque, FF = fully transparent
 * BB: Blue component (hex)
 * GG: Green component (hex)
 * RR: Red component (hex)
 *
 * CSS hex format: #RRGGBB or #AARRGGBB (Ant Design often uses RRGGBBAA)
 * CSS rgba format: rgba(R, G, B, A) where A is 0.0 (transparent) to 1.0 (opaque)
 *
 * @param {string} color - The input color string (e.g., "#FF0000", "rgba(255,0,0,0.5)")
 * @returns {string} The ASS color string (e.g., "&H000000FF" for opaque red)
 */
export const convertColorToAss = (color: string): string => {
    // Default to transparent black if color is invalid or explicitly transparent
    if (!color || color.toLowerCase() === 'transparent' || color === '#00000000' || color === 'rgba(0,0,0,0)') {
        return '&H00000000'; // Fully transparent black in ASS
    }

    let r = 0, g = 0, b = 0, a = 255; // Default to opaque black (CSS context)

    // Parse hex colors
    if (color.startsWith('#')) {
        let hex = color.substring(1);
        if (hex.length === 3) { // #RGB
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) { // #RRGGBB
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        } else if (hex.length === 8) { // #RRGGBBAA (common output from Ant Design ColorPicker) or #AARRGGBB
            // We assume #RRGGBBAA for Ant Design ColorPicker output based on typical usage
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
            a = parseInt(hex.substring(6, 8), 16); // This is the CSS alpha (0-255, 0=transparent, 255=opaque)
        } else {
            console.warn(`Invalid hex color length for ASS conversion: ${color}`);
        }
    }
    // Parse rgba colors (e.g., rgba(255, 0, 0, 0.5))
    else if (color.startsWith('rgb')) {
        const parts = color.match(/\d+(\.\d+)?/g);
        if (parts && parts.length >= 3) {
            r = parseInt(parts[0]);
            g = parseInt(parts[1]);
            b = parseInt(parts[2]);
            if (parts.length === 4) { // rgba, alpha is a float between 0 and 1
                a = Math.round(parseFloat(parts[3]) * 255);
            }
        } else {
            console.warn(`Invalid rgba color format for ASS conversion: ${color}`);
        }
    } else {
        console.warn(`Unsupported color format for ASS conversion: ${color}`);
    }

    // Convert CSS alpha (0=transparent, 255=opaque) to ASS alpha (0=opaque, 255=transparent)
    const assAlpha = 255 - a;

    // Convert components to 2-digit hex and combine for ASS format &H(AA)BBGGRR
    const toHex = (c: number) => Math.min(255, Math.max(0, c)).toString(16).padStart(2, '0').toUpperCase();
    return `&H${toHex(assAlpha)}${toHex(b)}${toHex(g)}${toHex(r)}`;
};

/**
 * Converts a generic text alignment string to ASS alignment codes.
 * ASS alignment codes represent 3x3 grid positions:
 * Bottom row: 1 (bottom left), 2 (bottom center), 3 (bottom right)
 * Middle row: 4 (middle left), 5 (middle center), 6 (middle right)
 * Top row:    7 (top left),    8 (top center),    9 (top right)
 * Defaulting to bottom center (2).
 *
 * @param {SubtitleTextAlign} align - The text alignment string ('left', 'center', 'right').
 * @returns {number} The ASS alignment code.
 */
export const getAssAlignment = (align: SubtitleTextAlign): number => {
    switch (align) {
        case 'left': return 1; // Default to bottom left
        case 'right': return 3; // Default to bottom right
        case 'center':
        default: return 2; // Default to bottom center
    }
};


// --- Existing Kapwing-related functions (no change needed) ---
export const getKapwingTimelineLabelInterval = (
    totalDurationSeconds: number,
    currentPxPerSec: number
): number => {
    if (totalDurationSeconds < 0) totalDurationSeconds = 0;

    let kapwingIntervals: number[];
    let kapwingDefaultInterval: number;

    if (totalDurationSeconds < 30) {
        kapwingIntervals = [1, 2];
        kapwingDefaultInterval = 2;
    } else if (totalDurationSeconds <= 60) {
        kapwingIntervals = [2, 3, 4, 5];
        kapwingDefaultInterval = 5;
    } else if (totalDurationSeconds <= 180) {
        kapwingIntervals = [10, 12, 15, 18, 20];
        kapwingDefaultInterval = 18;
    } else {
        kapwingIntervals = [30, 45, 60, 90, 120];

        const targetMarkersForDefault = (6 + 12) / 2;
        let closestToTargetDefault = kapwingIntervals[0];
        if (totalDurationSeconds > 0) {
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

    let targetMinTotalMarkers: number, targetMaxTotalMarkers: number;
    if (totalDurationSeconds < 30) { targetMinTotalMarkers = 10; targetMaxTotalMarkers = 30; }
    else if (totalDurationSeconds <= 60) { targetMinTotalMarkers = 8; targetMaxTotalMarkers = 20; }
    else if (totalDurationSeconds <= 180) { targetMinTotalMarkers = 7; targetMaxTotalMarkers = 18; }
    else { targetMinTotalMarkers = 5; targetMaxTotalMarkers = 12; }

    let chosenInterval = kapwingDefaultInterval;
    const idealPxPerSecondForDefault = 50;
    let idealIntervalIndex = kapwingIntervals.indexOf(kapwingDefaultInterval);
    if (idealIntervalIndex === -1) idealIntervalIndex = Math.floor(kapwingIntervals.length / 2);

    if (currentPxPerSec > idealPxPerSecondForDefault * 1.8 && idealIntervalIndex > 0) {
        idealIntervalIndex--;
        if (totalDurationSeconds < 30 && currentPxPerSec > 100 && kapwingIntervals[0] === 1) {
            idealIntervalIndex = 0;
        }
    } else if (currentPxPerSec < idealPxPerSecondForDefault * 0.6 && idealIntervalIndex < kapwingIntervals.length - 1) {
        idealIntervalIndex++;
    }

    chosenInterval = kapwingIntervals[idealIntervalIndex] || kapwingDefaultInterval;

    if (totalDurationSeconds > 0 && chosenInterval > 0) {
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

    if (totalDurationSeconds === 0) return 1;
    if (chosenInterval <= 0) chosenInterval = kapwingIntervals.find(iv => iv > 0) || 1;

    if (totalDurationSeconds > 0 && chosenInterval > totalDurationSeconds && kapwingIntervals.length > 0) {
        let feasibleInterval = [...kapwingIntervals].reverse().find(iv => iv > 0 && iv <= totalDurationSeconds);
        chosenInterval = feasibleInterval || Math.max(1, totalDurationSeconds);
    }
    if (totalDurationSeconds > 0 && totalDurationSeconds < chosenInterval) {
        chosenInterval = totalDurationSeconds;
    }

    return Math.max(0.1, chosenInterval);
};

export const formatRulerTimeForDynamicLabels = (totalSeconds: number): string => {
    if (totalSeconds < 0) totalSeconds = 0;
    const ss = Math.floor(totalSeconds % 60);
    const mm = Math.floor(totalSeconds / 60) % 60;
    const hh = Math.floor(totalSeconds / 3600);
    const pad = (num: number) => (num < 10 ? '0' : '') + num;

    if (hh > 0) {
        return `${hh}:${pad(mm)}:${pad(ss)}`;
    }
    if (mm > 0) {
        return `${mm}:${pad(ss)}`;
    }
    if (totalSeconds === 0) {
        return "0";
    }
    return `:${pad(ss)}`;
};
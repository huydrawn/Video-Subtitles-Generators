// src/components/VideoEditor/utils.ts

import { Keyframe } from './types';

// --- Helper Functions ---

export const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0:00.000';
    const totalMs = Math.floor(seconds * 1000);
    const ms = String(totalMs % 1000).padStart(3, '0');
    const totalSec = Math.floor(totalMs / 1000);
    const sec = String(totalSec % 60).padStart(2, '0');
    const min = String(Math.floor(totalSec / 60));
    return `${min}:${sec}.${ms}`;
};

// Linear interpolation
export const interpolateValue = (
    kfs: Keyframe[] | undefined,
    time: number,
    defaultValue: any
): any => {
    if (!kfs || kfs.length === 0) return defaultValue;
    // Ensure keyframes are sorted (should ideally be sorted on insertion)
    // kfs.sort((a, b) => a.time - b.time); // Assuming sorted on insertion

    if (time <= kfs[0].time) return kfs[0].value;
    if (time >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value;

    let prevKf = kfs[0];
    let nextKf = kfs[kfs.length - 1];
    for (let i = 0; i < kfs.length - 1; i++) {
        if (kfs[i].time <= time && kfs[i + 1].time >= time) {
            prevKf = kfs[i];
            nextKf = kfs[i + 1];
            break;
        }
    }

    const timeDiff = nextKf.time - prevKf.time;
    if (timeDiff === 0) return prevKf.value;

    const factor = (time - prevKf.time) / timeDiff;
    const pVal = prevKf.value;
    const nVal = nextKf.value;

    // Number interpolation
    if (typeof pVal === 'number' && typeof nVal === 'number') {
        return pVal + (nVal - pVal) * factor;
    }
    // Position (or other {x,y} object) interpolation
    else if (
        typeof pVal === 'object' && typeof nVal === 'object' &&
        pVal !== null && nVal !== null &&
        'x' in pVal && 'y' in pVal && 'x' in nVal && 'y' in nVal
    ) {
        const p = pVal as { x: number, y: number };
        const n = nVal as { x: number, y: number };
        return {
            x: p.x + (n.x - p.x) * factor,
            y: p.y + (n.y - p.y) * factor
        };
    }
    // Fallback for non-interpolatable types (e.g., strings) - return previous value
    return pVal;
};
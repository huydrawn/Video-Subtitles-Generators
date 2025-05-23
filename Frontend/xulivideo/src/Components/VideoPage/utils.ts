import type {Keyframe, Track} from './types'; // Assuming types are imported

export const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00.000';
    const totalMs = Math.floor(seconds * 1000);
    const ms = String(totalMs % 1000).padStart(3, '0');
    const totalSec = Math.floor(totalMs / 1000);
    const sec = String(totalSec % 60).padStart(2, '0');
    const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
    return `${min}:${sec}.${ms}`;
};

export const parseTimecodeToSeconds = (timecode: string): number => {
    const parts = timecode.replace(',', '.').split(':');
    if (parts.length !== 3) return 0;
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
                if (ctx.measureText(testLine).width > maxWidth) { lines.push(currentLine); currentLine = word; }
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
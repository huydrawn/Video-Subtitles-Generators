// src/Hooks/Logic/CanvasRenderer.ts

import { RefObject } from 'react';
import type { EditorProjectState, Clip, Keyframe, SubtitleEntry } from '../../Components/VideoPage/types'; // Corrected path based on your import structure
import { interpolateValue, getWrappedLines } from '../../Components/VideoPage/utils'; // Corrected path based on your import structure
import {
    SUBTITLE_OUTLINE_WIDTH,
    SUBTITLE_LINE_HEIGHT_MULTIPLIER,
    SUBTITLE_FILL_COLOR,
    SUBTITLE_OUTLINE_COLOR,
    SUBTITLE_BACKGROUND_COLOR,
} from '../constants'; // Corrected path based on your import structure

type MediaElementsRefValue = { [key: string]: HTMLVideoElement | HTMLImageElement };

export class CanvasRenderer {
    private canvasRef: RefObject<HTMLCanvasElement | null>;
    private interpolateValue: (kfs: Keyframe[] | undefined, time: number, defaultValue: any) => any;

    constructor(
        canvasRef: RefObject<HTMLCanvasElement | null>,
        interpolateValueFunc: (kfs: Keyframe[] | undefined, time: number, defaultValue: any) => any,
    ) {
        this.canvasRef = canvasRef;
        this.interpolateValue = interpolateValueFunc;
    }

    public drawFrame = (
        time: number,
        projectState: EditorProjectState,
        mediaElements: MediaElementsRefValue | null
    ): void => {
        const canvas = this.canvasRef.current;
        if (!canvas) { return; }
        const ctx = canvas.getContext('2d');
        if (!ctx) { return; }

        const { width: canvasWidth, height: canvasHeight } = projectState.canvasDimensions || {};
        if (!canvasWidth || !canvasHeight || canvasWidth <= 0 || canvasHeight <= 0) { return; }

        if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
        }

        const currentMediaElements = mediaElements || {};
        ctx.clearRect(0, 0, canvasWidth, canvasHeight); // Clear canvas

        // Draw Media Clips (Video and Image) - Logic remains unchanged
        projectState.tracks.forEach(track => {
            track.clips.forEach(clip => {
                const isMediaClip = clip.type === 'video' || clip.type === 'image';
                const isSubtitleAssociatedClip = clip.type === 'text' && projectState.subtitles.some(sub => sub.id === clip.id);

                if (isMediaClip && !isSubtitleAssociatedClip && time >= clip.startTime && time < clip.endTime) {
                    const element = currentMediaElements[clip.id];
                    if (!element) { return; }

                    if (element instanceof HTMLVideoElement) {
                        if (element.readyState < element.HAVE_CURRENT_DATA) { return; }
                        const clipTime = Math.max(0, time - clip.startTime);
                        if (element.seekable.length > 0 && element.duration !== undefined && clipTime >= 0 && clipTime <= element.duration + 0.1) {
                            const syncThreshold = element.paused ? 0.05 : 0.20;
                            if (Math.abs(element.currentTime - clipTime) > syncThreshold) {
                                try { element.currentTime = clipTime; } catch (e) { console.error(`DrawFrame: Error setting currentTime for ${clip.id}:`, e); }
                            }
                        }
                    }

                    const pos = this.interpolateValue(clip.keyframes?.position, time, clip.position);
                    const scale = this.interpolateValue(clip.keyframes?.scale, time, clip.scale);
                    const rotation = this.interpolateValue(clip.keyframes?.rotation, time, clip.rotation ?? 0);
                    const opacity = this.interpolateValue(clip.keyframes?.opacity, time, clip.opacity ?? 1);

                    let baseWidth = clip.originalWidth;
                    let baseHeight = clip.originalHeight;
                    if (element instanceof HTMLVideoElement && (baseWidth === undefined || baseWidth <= 0)) baseWidth = element.videoWidth;
                    if (element instanceof HTMLVideoElement && (baseHeight === undefined || baseHeight <= 0)) baseHeight = element.videoHeight;
                    if (element instanceof HTMLImageElement && (baseWidth === undefined || baseWidth <= 0)) baseWidth = element.naturalWidth;
                    if (element instanceof HTMLImageElement && (baseHeight === undefined || baseHeight <= 0)) baseHeight = element.naturalHeight;

                    if (baseWidth === undefined || baseWidth <= 0) baseWidth = (clip.type === 'text' ? 300 : 100);
                    if (baseHeight === undefined || baseHeight <= 0) baseHeight = (clip.type === 'text' ? 80 : 100);

                    const scaledWidth = baseWidth * scale.x;
                    const scaledHeight = baseHeight * scale.y;
                    const centerX_px = pos.x * canvasWidth;
                    const centerY_px = pos.y * canvasHeight;

                    ctx.save();
                    ctx.translate(centerX_px, centerY_px);
                    ctx.rotate(rotation * Math.PI / 180);
                    ctx.globalAlpha = opacity;

                    try { ctx.drawImage(element, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight); }
                    catch (e) { console.error(`CanvasRenderer: Error drawing element for clip ${clip.id}:`, e); }
                    ctx.restore();
                }
            });
        });

        // Draw Subtitles (if any)
        if (projectState.areSubtitlesVisibleOnCanvas) {
            const activeSubtitle = projectState.subtitles.find(sub => time >= sub.startTime && time < sub.endTime);
            if (activeSubtitle) {
                ctx.save();

                // --- NEW SUBTITLE SIZING AND POSITIONING LOGIC ---
                // Treating canvasWidth/Height as videoWidth/Height for responsive scaling
                const videoWidth = canvasWidth;
                const videoHeight = canvasHeight;

                // Subtitle area width: 80% of video width
                const subtitleAreaWidth = videoWidth * 0.8;

                // Bottom margin: 5% of video height
                const subtitleBottomMarginPx = videoHeight * 0.05;

                // Font size: 4.5% of video height
                const calculatedFontSize = videoHeight * 0.045;

                // Font properties from project state (family, bold, italic, underline, colors)
                const fontFamily = projectState.subtitleFontFamily || 'Arial';
                const textAlign = projectState.subtitleTextAlign || 'center';
                const isBold = projectState.isSubtitleBold ?? false;
                const isItalic = projectState.isSubtitleItalic ?? false;
                const isUnderlined = projectState.isSubtitleUnderlined ?? false;
                const fillColor = projectState.subtitleColor || SUBTITLE_FILL_COLOR;
                const backgroundColor = projectState.subtitleBackgroundColor || SUBTITLE_BACKGROUND_COLOR;
                const outlineColor = SUBTITLE_OUTLINE_COLOR;
                const outlineWidth = SUBTITLE_OUTLINE_WIDTH;

                // Set font style
                const fontStyle = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}${calculatedFontSize}px ${fontFamily}`;
                ctx.font = fontStyle;
                ctx.textBaseline = 'bottom'; // Crucial for drawing text upwards from a baseline

                // Wrap lines based on the calculated subtitle area width
                const wrappedLines = getWrappedLines(ctx, activeSubtitle.text, subtitleAreaWidth);
                const lineHeight = calculatedFontSize * SUBTITLE_LINE_HEIGHT_MULTIPLIER;
                const totalTextHeight = wrappedLines.length * lineHeight;

                // Calculate horizontal position (X) for text alignment
                let xCanvasPos: number;
                switch (textAlign) {
                    case 'left':
                        // Start from the left edge of the subtitle area
                        xCanvasPos = (videoWidth - subtitleAreaWidth) / 2;
                        ctx.textAlign = 'left';
                        break;
                    case 'right':
                        // End at the right edge of the subtitle area
                        xCanvasPos = (videoWidth - subtitleAreaWidth) / 2 + subtitleAreaWidth;
                        ctx.textAlign = 'right';
                        break;
                    case 'center':
                    default:
                        // Center of the video frame
                        xCanvasPos = videoWidth / 2;
                        ctx.textAlign = 'center';
                        break;
                }

                // Calculate vertical position (Y) for the bottom of the last line
                const lastLineBottomY = videoHeight - subtitleBottomMarginPx;

                // Calculate Y position for each line (drawing from bottom up)
                const linesBottomYs = wrappedLines.map((_, index) =>
                    lastLineBottomY - (wrappedLines.length - 1 - index) * lineHeight
                );

                // Draw background box (if applicable)
                if (backgroundColor && backgroundColor !== 'transparent' && wrappedLines.length > 0) {
                    let maxLineWidth = 0;
                    wrappedLines.forEach(line => maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width));

                    const padding = calculatedFontSize * 0.2; // Dynamic padding based on calculated font size
                    const bgWidth = maxLineWidth + 2 * padding;
                    const bgHeight = totalTextHeight + 2 * padding;

                    let bgX;
                    switch (textAlign) {
                        case 'left': bgX = xCanvasPos - padding; break;
                        case 'right': bgX = xCanvasPos - bgWidth + padding; break;
                        case 'center': default: bgX = xCanvasPos - bgWidth / 2; break;
                    }

                    // bgY is the top of the background box
                    const bgY = lastLineBottomY - totalTextHeight - padding;

                    ctx.fillStyle = backgroundColor;
                    ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
                }

                // Draw text (outline then fill)
                wrappedLines.forEach((line, index) => {
                    const lineBottomY = linesBottomYs[index]; // Get Y for current line

                    if (outlineWidth > 0 && outlineColor) {
                        ctx.strokeStyle = outlineColor;
                        ctx.lineWidth = outlineWidth;
                        ctx.lineJoin = 'round';
                        ctx.miterLimit = 2; // Helps prevent sharp corners on outline
                        ctx.strokeText(line, xCanvasPos, lineBottomY);
                    }
                    if (fillColor) {
                        ctx.fillStyle = fillColor;
                        ctx.fillText(line, xCanvasPos, lineBottomY);
                    }

                    // Draw underline if enabled
                    if (isUnderlined) {
                        const metrics = ctx.measureText(line);
                        const textWidth = metrics.width;
                        let underlineStartX;
                        switch (textAlign) {
                            case 'left': underlineStartX = xCanvasPos; break;
                            case 'right': underlineStartX = xCanvasPos - textWidth; break;
                            case 'center': default: underlineStartX = xCanvasPos - textWidth / 2; break;
                        }
                        // Underline position: slightly below the text baseline
                        const underlineY = lineBottomY + Math.max(1, calculatedFontSize * 0.05);
                        ctx.strokeStyle = fillColor; // Underline color matches text fill color
                        ctx.lineWidth = Math.max(1, calculatedFontSize / 25); // Underline thickness
                        ctx.beginPath();
                        ctx.moveTo(underlineStartX, underlineY);
                        ctx.lineTo(underlineStartX + textWidth, underlineY);
                        ctx.stroke();
                    }
                });
                ctx.restore();
            }
        }
    }
}
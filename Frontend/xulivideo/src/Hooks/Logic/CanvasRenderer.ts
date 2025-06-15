// src/Hooks/Logic/CanvasRenderer.ts

import { RefObject } from 'react';
import type { EditorProjectState, Clip, Keyframe, SubtitleEntry } from '../../Components/VideoPage/types';
import { interpolateValue, getWrappedLines } from '../../Components/VideoPage/utils'; // Ensure path is correct
import {
    SUBTITLE_OUTLINE_WIDTH, // Assuming this is defined in constants
    SUBTITLE_MAX_WIDTH_PX,  // Assuming this is defined in constants
    SUBTITLE_LINE_HEIGHT_MULTIPLIER, // Assuming this is defined in constants
    SUBTITLE_BOTTOM_MARGIN_PX, // Assuming this is defined in constants
    // SUBTITLE_FILL_COLOR, // These might come from projectState.subtitleColor now
    // SUBTITLE_OUTLINE_COLOR,
} from '../constants'; // Ensure path is correct for constants

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
        time: number, // Current editor playback time
        projectState: EditorProjectState,
        mediaElements: MediaElementsRefValue | null // Pass mediaElementsRef.current
    ): void => {
        const canvas = this.canvasRef.current;
        if (!canvas) {
            // console.warn("CanvasRenderer: Canvas not available.");
            return;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            // console.warn("CanvasRenderer: Failed to get 2D context.");
            return;
        }

        const { width: canvasWidth, height: canvasHeight } = projectState.canvasDimensions || {};
        if (!canvasWidth || !canvasHeight || canvasWidth <= 0 || canvasHeight <= 0) {
            // console.warn("CanvasRenderer: Invalid canvas dimensions.");
            return;
        }

        if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
        }

        const currentMediaElements = mediaElements || {};
        ctx.clearRect(0, 0, canvasWidth, canvasHeight); // Clear canvas

        // Draw Media Clips (Video and Image)
        projectState.tracks.forEach(track => {
            track.clips.forEach(clip => {
                const isMediaClip = clip.type === 'video' || clip.type === 'image';
                const isSubtitleAssociatedClip = clip.type === 'text' && projectState.subtitles.some(sub => sub.id === clip.id); // Text clips used for subtitles

                if (isMediaClip && !isSubtitleAssociatedClip && time >= clip.startTime && time < clip.endTime) {
                    const element = currentMediaElements[clip.id];
                    if (!element) {
                        // console.warn(`DrawFrame: Media element for clip ${clip.id} not found at time ${time}.`);
                        return; // Skip drawing this clip
                    }

                    if (element instanceof HTMLVideoElement) {
                        if (element.readyState < element.HAVE_CURRENT_DATA) {
                            // console.warn(`DrawFrame: Video ${clip.id} not ready (readyState: ${element.readyState}). Waiting for data.`);
                            // Optionally draw a "loading" placeholder for this clip
                            // ctx.fillStyle = 'rgba(50,50,50,0.7)';
                            // ctx.fillRect(calculated_x, calculated_y, calculated_width, calculated_height); // Placeholder dimensions
                            return; // Don't attempt to draw if not ready
                        }

                        // Sync video's currentTime if editor is paused or if there's a significant discrepancy.
                        // The PlaybackController should handle primary syncing during play/seek.
                        // This is a fallback to ensure the correct frame is drawn, especially after a seek
                        // or when the editor is paused.
                        const clipTime = Math.max(0, time - clip.startTime);
                        if (element.seekable.length > 0 && element.duration !== undefined && clipTime >= 0 && clipTime <= element.duration + 0.1) {
                            // Only force currentTime update if video is paused OR if it's playing but significantly out of sync.
                            // A smaller threshold for paused videos ensures immediate frame update.
                            // A larger threshold for playing videos prevents stutter if browser's own playback is slightly off.
                            const syncThreshold = element.paused ? 0.05 : 0.20; // seconds
                            if (Math.abs(element.currentTime - clipTime) > syncThreshold) {
                                try {
                                    // console.log(`DrawFrame: Syncing video ${clip.id} from ${element.currentTime.toFixed(3)} to ${clipTime.toFixed(3)} (editor time: ${time.toFixed(3)})`);
                                    element.currentTime = clipTime;
                                } catch (e) {
                                    // console.warn(`DrawFrame: Error setting currentTime for ${clip.id}:`, e);
                                    // This can happen if seeking too rapidly or video is in a bad state.
                                }
                            }
                        }
                    }

                    // Calculate interpolated properties
                    const pos = this.interpolateValue(clip.keyframes?.position, time, clip.position);
                    const scale = this.interpolateValue(clip.keyframes?.scale, time, clip.scale);
                    const rotation = this.interpolateValue(clip.keyframes?.rotation, time, clip.rotation ?? 0);
                    const opacity = this.interpolateValue(clip.keyframes?.opacity, time, clip.opacity ?? 1);

                    // Determine base dimensions
                    let baseWidth = clip.originalWidth;
                    let baseHeight = clip.originalHeight;
                    if (element instanceof HTMLVideoElement && (baseWidth === undefined || baseWidth <= 0)) baseWidth = element.videoWidth;
                    if (element instanceof HTMLVideoElement && (baseHeight === undefined || baseHeight <= 0)) baseHeight = element.videoHeight;
                    if (element instanceof HTMLImageElement && (baseWidth === undefined || baseWidth <= 0)) baseWidth = element.naturalWidth;
                    if (element instanceof HTMLImageElement && (baseHeight === undefined || baseHeight <= 0)) baseHeight = element.naturalHeight;

                    // Fallback dimensions if still not available (e.g. for a 'text' clip that's not a subtitle)
                    if (baseWidth === undefined || baseWidth <= 0) baseWidth = (clip.type === 'text' ? 300 : 100);
                    if (baseHeight === undefined || baseHeight <= 0) baseHeight = (clip.type === 'text' ? 80 : 100);


                    const scaledWidth = baseWidth * scale.x;
                    const scaledHeight = baseHeight * scale.y;
                    const centerX_px = pos.x * canvasWidth;
                    const centerY_px = pos.y * canvasHeight;

                    ctx.save();
                    ctx.translate(centerX_px, centerY_px); // Move to center of clip
                    ctx.rotate(rotation * Math.PI / 180);   // Rotate around center
                    ctx.globalAlpha = opacity;

                    try {
                        // Draw image from its center
                        ctx.drawImage(element, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
                    } catch (e) {
                        console.error(`CanvasRenderer: Error drawing element for clip ${clip.id}:`, e);
                        // This can happen if the media element becomes invalid (e.g., source removed)
                        // or due to cross-origin issues if not handled.
                    }
                    ctx.restore();
                }
            });
        });

        // Draw Subtitles (if any)
        if (projectState.areSubtitlesVisibleOnCanvas) { // ONLY draw if this flag is true
            // Draw Subtitles (if any)
            const activeSubtitle = projectState.subtitles.find(sub => time >= sub.startTime && time < sub.endTime);
            if (activeSubtitle) {
                ctx.save();
                const fontSize = projectState.subtitleFontSize || 24;
                const fontFamily = projectState.subtitleFontFamily || 'Arial';
                const textAlign = projectState.subtitleTextAlign || 'center';
                const isBold = projectState.isSubtitleBold ?? false;
                const isItalic = projectState.isSubtitleItalic ?? false;
                const isUnderlined = projectState.isSubtitleUnderlined ?? false;
                const fillColor = projectState.subtitleColor || '#FFFFFF'; // from projectState
                const backgroundColor = projectState.subtitleBackgroundColor || 'rgba(0,0,0,0.7)'; // from projectState
                const outlineColor = '#000000'; // Example, or use a constant
                const outlineWidth =  SUBTITLE_OUTLINE_WIDTH;


                const fontStyle = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}${fontSize}px ${fontFamily}`;
                ctx.font = fontStyle;
                ctx.textAlign = textAlign;
                ctx.textBaseline = 'alphabetic'; // Align text based on the alphabetic baseline

                // Calculate scaled max width for subtitles based on canvas size
                const scaledSubtitleMaxWidth = (SUBTITLE_MAX_WIDTH_PX / 1280) * canvasWidth; // Assuming 1280 is reference
                const wrappedLines = getWrappedLines(ctx, activeSubtitle.text, scaledSubtitleMaxWidth);
                const lineHeight = fontSize * SUBTITLE_LINE_HEIGHT_MULTIPLIER;
                const totalTextHeight = wrappedLines.length * lineHeight;

                let xPos: number;
                switch (textAlign) {
                    case 'left': xPos = canvasWidth * 0.05; break; // Small margin from left
                    case 'right': xPos = canvasWidth * 0.95; break; // Small margin from right
                    case 'center': default: xPos = canvasWidth / 2; break;
                }

                // Y position for the *baseline* of the *last line* of text
                const lastLineBaselineY = canvasHeight - SUBTITLE_BOTTOM_MARGIN_PX;

                // Optional: Draw background for subtitles
                if (backgroundColor && backgroundColor !== 'transparent' && wrappedLines.length > 0) {
                    let maxLineWidth = 0;
                    wrappedLines.forEach(line => maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width));

                    const padding = fontSize * 0.2; // Dynamic padding
                    const bgWidth = maxLineWidth + 2 * padding;
                    const bgHeight = totalTextHeight + (fontSize * (SUBTITLE_LINE_HEIGHT_MULTIPLIER -1) * 0.5) ; // Adjusted height for better fit

                    let bgX;
                    // Y for top of background box. lastLineBaselineY is baseline of last line.
                    // So, totalTextHeight up from there is roughly top of first line's text area.
                    const bgY = lastLineBaselineY - totalTextHeight + (lineHeight - fontSize) / 2  - padding + (fontSize * (SUBTITLE_LINE_HEIGHT_MULTIPLIER -1) * 0.25);


                    switch (textAlign) {
                        case 'left': bgX = xPos - padding; break;
                        case 'right': bgX = xPos - maxLineWidth - padding; break;
                        case 'center': default: bgX = xPos - bgWidth / 2; break;
                    }
                    ctx.fillStyle = backgroundColor;
                    ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
                }


                // Draw text (outline then fill)
                wrappedLines.forEach((line, index) => {
                    const lineBaselineY = lastLineBaselineY - (wrappedLines.length - 1 - index) * lineHeight;
                    if (outlineWidth > 0 && outlineColor) {
                        ctx.strokeStyle = outlineColor;
                        ctx.lineWidth = outlineWidth;
                        ctx.lineJoin = 'round'; // Smoother outlines
                        ctx.miterLimit = 2;
                        ctx.strokeText(line, xPos, lineBaselineY);
                    }
                    if (fillColor) {
                        ctx.fillStyle = fillColor;
                        ctx.fillText(line, xPos, lineBaselineY);
                    }

                    // Draw underline if enabled
                    if (isUnderlined) {
                        const metrics = ctx.measureText(line);
                        const textWidth = metrics.width;
                        let underlineStartX;
                        switch (textAlign) {
                            case 'left': underlineStartX = xPos; break;
                            case 'right': underlineStartX = xPos - textWidth; break;
                            case 'center': default: underlineStartX = xPos - textWidth / 2; break;
                        }
                        // metrics.actualBoundingBoxDescent might be useful if available and reliable
                        const underlineY = lineBaselineY + Math.max(2, fontSize * 0.08); // Position slightly below baseline
                        ctx.strokeStyle = fillColor; // Underline usually matches text color
                        ctx.lineWidth = Math.max(1, fontSize / 15); // Thinner line for underline
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
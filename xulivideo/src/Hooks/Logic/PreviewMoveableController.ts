// src/Hooks/Logic/PreviewMoveableController.ts

import { RefObject } from 'react';
import Moveable from 'react-moveable';
import type { OnDragEnd, OnResizeEnd, OnRotateEnd } from 'react-moveable';
import type { EditorProjectState, Clip, Keyframe } from '../../Components/VideoPage/types';
import { interpolateValue }  from '../../Components/VideoPage/utils';
import { PREVIEW_ZOOM_FIT_MODE, PREVIEW_ZOOM_FILL_MODE } from '../constants';

// --- UPDATED TYPE DEFINITIONS ---
// Based on the previous error message, updateSelectedClipProperty takes propUpdates and currentProjectState
type PropUpdates = Partial<Omit<Clip, "name" | "type" | "keyframes" | "source" | "secureUrl" | "id" | "trackId" | "duration" | "startTime" | "endTime" | "thumbnailUrls" | "originalWidth" | "originalHeight" | 'order'>>;

// Update UpdateSelectedClipPropertyFunc to accept two arguments (matches previous fix)
type UpdateSelectedClipPropertyFunc = (propUpdates: PropUpdates, currentProjectState: EditorProjectState) => void;

// *** NEW CHANGE: Update AddOrUpdateKeyframeFunc to accept FOUR arguments based on the latest error ***
type AddOrUpdateKeyframeFunc = (
    propName: keyof Clip['keyframes'],
    currentTime: number,         // Added
    selectedClip: Clip | null,   // Added
    currentProjectState: EditorProjectState // Already there
) => void;

export class PreviewMoveableController {
    private previewMoveableRef: RefObject<Moveable | null>;
    private previewContainerRef: RefObject<HTMLDivElement | null>;
    // Use the updated types
    private updateSelectedClipProperty: UpdateSelectedClipPropertyFunc;
    private addOrUpdateKeyframe: AddOrUpdateKeyframeFunc; // Uses the new 4-arg type
    private interpolateValue: (kfs: Keyframe[] | undefined, time: number, defaultValue: any) => any;


    constructor(
        previewMoveableRef: RefObject<Moveable | null>,
        previewContainerRef: RefObject<HTMLDivElement | null>,
        // Use the updated types in the constructor signature
        updateSelectedClipProperty: UpdateSelectedClipPropertyFunc,
        addOrUpdateKeyframe: AddOrUpdateKeyframeFunc, // Uses the new 4-arg type
        interpolateValue: (kfs: Keyframe[] | undefined, time: number, defaultValue: any) => any
    ) {
        this.previewMoveableRef = previewMoveableRef;
        this.previewContainerRef = previewContainerRef;
        this.updateSelectedClipProperty = updateSelectedClipProperty;
        this.addOrUpdateKeyframe = addOrUpdateKeyframe;
        this.interpolateValue = interpolateValue;
    }

    // Public handlers for Moveable events - MUST take current state/derived state as arguments
    public onPreviewDragEnd = ({ lastEvent }: OnDragEnd,
                               selectedClip: Clip | null,
                               currentTime: number,
                               projectState: EditorProjectState
    ): void => {
        const selectedIsSubtitleClip = selectedClip?.type === 'text' && projectState.subtitles.some(sub => sub.id === selectedClip.id);
        if (!lastEvent || typeof lastEvent.translate === 'undefined' || !selectedClip || selectedIsSubtitleClip || !this.previewContainerRef.current || !projectState.canvasDimensions) {
            if (selectedIsSubtitleClip) console.warn("Attempted to drag a subtitle clip.");

            if (this.previewMoveableRef.current?.getTargets()) {
                const target = this.previewMoveableRef.current.getTargets() as unknown as HTMLElement;
                if (target) {
                    const currentTransform = target.style.transform;
                    const rotationMatch = currentTransform.match(/rotate\([^)]+\)/)?.[0] || '';
                    target.style.transform = rotationMatch;
                }
            }
            return;
        }

        const currentPos = this.interpolateValue(selectedClip.keyframes?.position, currentTime, selectedClip.position);
        const { width: canvasWidth, height: canvasHeight } = projectState.canvasDimensions;
        const currentContainerScale = projectState.previewZoomLevel;

        if (currentContainerScale === 0 || canvasWidth === 0 || canvasHeight === 0) {
            console.warn("Cannot calculate position delta due to zero dimensions or scale.");
            if (this.previewMoveableRef.current?.getTargets()) {
                const target = this.previewMoveableRef.current.getTargets() as unknown as HTMLElement;
                if (target) {
                    const currentTransform = target.style.transform;
                    const rotationMatch = currentTransform.match(/rotate\([^)]+\)/)?.[0] || '';
                    target.style.transform = rotationMatch;
                }
            }
            return;
        }

        const deltaX_perc = (lastEvent.translate[0] / currentContainerScale) / canvasWidth;
        const deltaY_perc = (lastEvent.translate[1] / currentContainerScale) / canvasHeight;

        const newPosX = currentPos.x + deltaX_perc;
        const newPosY = currentPos.y + deltaY_perc;

        const newPosition = { x: newPosX, y: newPosY };

        // Pass projectState here
        this.updateSelectedClipProperty({ position: newPosition }, projectState);

        const didChange = Math.abs(newPosition.x - currentPos.x) > 0.0001 || Math.abs(newPosition.y - currentPos.y) > 0.0001;
        if (didChange) {
            // *** NEW CHANGE: Pass all 4 arguments to addOrUpdateKeyframe ***
            this.addOrUpdateKeyframe('position', currentTime, selectedClip, projectState);
        }

        if (this.previewMoveableRef.current?.getTargets()) {
            const target = this.previewMoveableRef.current.getTargets() as unknown as HTMLElement;
            if (target) {
                const currentTransform = target.style.transform;
                const rotationMatch = currentTransform.match(/rotate\([^)]+\)/)?.[0] || '';
                target.style.transform = rotationMatch;
            }
        }
    }

    public onPreviewResizeEnd = ({ lastEvent }: OnResizeEnd,
                                 selectedClip: Clip | null,
                                 currentTime: number,
                                 projectState: EditorProjectState
    ): void => {
        const selectedIsSubtitleClip = selectedClip?.type === 'text' && projectState.subtitles.some(sub => sub.id === selectedClip.id);
        if (!lastEvent || typeof lastEvent.width === 'undefined' || typeof lastEvent.height === 'undefined' || !selectedClip || selectedIsSubtitleClip || !this.previewContainerRef.current || !projectState.canvasDimensions) {
            if (selectedIsSubtitleClip) console.warn("Attempted to resize a subtitle clip.");
            if (this.previewMoveableRef.current?.getTargets()) {
                const target = this.previewMoveableRef.current.getTargets() as unknown as HTMLElement;
                if (target) {
                    target.style.width = ''; target.style.height = '';
                    const currentTransform = target.style.transform;
                    const rotationMatch = currentTransform.match(/rotate\([^)]+\)/)?.[0] || '';
                    target.style.transform = rotationMatch;
                }
            }
            return;
        }

        const currentScale = this.interpolateValue(selectedClip.keyframes?.scale, currentTime, selectedClip.scale);
        const newWidth_px = lastEvent.width; const newHeight_px = lastEvent.height;

        const { width: canvasWidth, height: canvasHeight } = projectState.canvasDimensions;
        const currentContainerScale = projectState.previewZoomLevel;

        const originalClipWidth = selectedClip.originalWidth || (selectedClip.type === 'text' ? 300 : 100);
        const originalClipHeight = selectedClip.originalHeight || (selectedClip.type === 'text' ? 80 : 100);

        if (currentContainerScale === 0 || originalClipWidth <= 0 || originalClipHeight <= 0 || canvasWidth === 0 || canvasHeight === 0) {
            console.warn("Cannot calculate scale delta due to zero dimensions or scale.");
            if (this.previewMoveableRef.current?.getTargets()) {
                const target = this.previewMoveableRef.current.getTargets() as unknown as HTMLElement;
                if (target) {
                    target.style.width = ''; target.style.height = '';
                    const currentTransform = target.style.transform;
                    const rotationMatch = currentTransform.match(/rotate\([^)]+\)/)?.[0] || '';
                    target.style.transform = rotationMatch;
                }
            }
            return;
        }

        const newScaleX = (newWidth_px / currentContainerScale) / originalClipWidth;
        const newScaleY = (newHeight_px / currentContainerScale) / originalClipHeight;

        const effectiveNewScaleX = Math.max(0.01, newScaleX);
        const newScaleValue = { x: effectiveNewScaleX, y: effectiveNewScaleX };

        // Pass projectState here
        this.updateSelectedClipProperty({ scale: newScaleValue }, projectState);

        const currentScaleVal = this.interpolateValue(selectedClip.keyframes?.scale, currentTime, selectedClip.scale);
        const didChange = Math.abs(newScaleValue.x - currentScaleVal.x) > 0.0001 || Math.abs(newScaleValue.y - currentScaleVal.y) > 0.0001;
        if (didChange) {
            // *** NEW CHANGE: Pass all 4 arguments to addOrUpdateKeyframe ***
            this.addOrUpdateKeyframe('scale', currentTime, selectedClip, projectState);
        }

        if (this.previewMoveableRef.current?.getTargets()) {
            const target = this.previewMoveableRef.current.getTargets() as unknown as HTMLElement;
            if (target) {
                target.style.width = ''; target.style.height = '';
                const currentTransform = target.style.transform;
                const rotationMatch = currentTransform.match(/rotate\([^)]+\)/)?.[0] || '';
                target.style.transform = rotationMatch;
            }
        }
    }

    public onPreviewRotateEnd = ({ lastEvent }: OnRotateEnd,
                                 selectedClip: Clip | null,
                                 currentTime: number,
                                 projectState: EditorProjectState
    ): void => {
        const selectedIsSubtitleClip = selectedClip?.type === 'text' && projectState.subtitles.some(sub => sub.id === selectedClip.id);
        if (!lastEvent || typeof lastEvent.rotate === 'undefined' || !selectedClip || selectedIsSubtitleClip) {
            if (selectedIsSubtitleClip) console.warn("Attempted to rotate a subtitle clip.");
            return;
        }

        const finalRotation = (lastEvent.lastEvent?.rotate || lastEvent.rotate || 0) % 360;
        const normalizedRotation = finalRotation < 0 ? finalRotation + 360 : finalRotation; // Normalize to 0-360

        // Pass projectState here
        this.updateSelectedClipProperty({ rotation: normalizedRotation }, projectState);

        const currentRotation = this.interpolateValue(selectedClip.keyframes?.rotation, currentTime, selectedClip.rotation ?? 0);
        const normalizedCurrentRotation = (currentRotation % 360 + 360) % 360;
        const didChange = Math.abs(normalizedRotation - normalizedCurrentRotation) > 0.0001;
        if (didChange) {
            // *** NEW CHANGE: Pass all 4 arguments to addOrUpdateKeyframe ***
            this.addOrUpdateKeyframe('rotation', currentTime, selectedClip, projectState);
        }
    }

    public handlePreviewContainerResize(projectState: EditorProjectState): void {
        if (this.previewMoveableRef.current && this.previewContainerRef.current) {
            this.previewMoveableRef.current.updateRect();
        }
    }
}
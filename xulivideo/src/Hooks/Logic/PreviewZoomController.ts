import { RefObject, Dispatch, SetStateAction } from 'react';
import type { EditorProjectState } from '../../Components/VideoPage/types';
import { PREVIEW_ZOOM_FIT_MODE, PREVIEW_ZOOM_FILL_MODE, PREVIEW_ZOOM_LEVELS } from '../constants';

type ProjectState = EditorProjectState;

export class PreviewZoomController {
    // CHANGE: Allow null in the RefObject type
    private previewContainerRef: RefObject<HTMLDivElement | null>;
    private setProjectState: Dispatch<SetStateAction<ProjectState>>;

    constructor(
        // CHANGE: Allow null in the RefObject type for the parameter
        previewContainerRef: RefObject<HTMLDivElement | null>,
        setProjectState: Dispatch<SetStateAction<ProjectState>>
    ) {
        this.previewContainerRef = previewContainerRef;
        this.setProjectState = setProjectState;
    }

    // Method to calculate fit/fill scales - can be private
    private calculateScales(canvasWidth: number, canvasHeight: number, containerWidth: number, containerHeight: number) {
        if (!containerWidth || !containerHeight || !canvasWidth || !canvasHeight || canvasWidth === 0 || canvasHeight === 0) {
            return { fit: 1.0, fill: 1.0 };
        }
        const scaleX = containerWidth / canvasWidth;
        const scaleY = containerHeight / canvasHeight;
        return { fit: Math.min(scaleX, scaleY), fill: Math.max(scaleX, scaleY) };
    }

    // Logic for the ResizeObserver - this will be called from the main hook's useEffect
    public handleContainerResize(currentProjectState: ProjectState): void {
        // This check is already correct and handles the null case
        const container = this.previewContainerRef.current;
        if (!container || !currentProjectState.canvasDimensions.width || !currentProjectState.canvasDimensions.height) return;

        const containerRect = container.getBoundingClientRect();
        const { width: canvasWidth, height: canvasHeight } = currentProjectState.canvasDimensions;
        const { width: containerWidth, height: containerHeight } = containerRect;

        const { fit, fill } = this.calculateScales(canvasWidth, canvasHeight, containerWidth, containerHeight);

        this.setProjectState(prev => {
            let newZoomLevel = prev.previewZoomLevel;
            let newZoomMode = prev.previewZoomMode;

            if (prev.previewZoomMode === PREVIEW_ZOOM_FIT_MODE) {
                if (Math.abs(prev.previewZoomLevel - fit) > 0.001) {
                    newZoomLevel = fit;
                }
                newZoomMode = PREVIEW_ZOOM_FIT_MODE;
            } else if (prev.previewZoomMode === PREVIEW_ZOOM_FILL_MODE) {
                if (Math.abs(prev.previewZoomLevel - fill) > 0.001) {
                    newZoomLevel = fill;
                }
                newZoomMode = PREVIEW_ZOOM_FILL_MODE;
            } else {
                // For percentage mode, level and mode string don't change on resize
                return prev; // No change needed if mode is percentage
            }

            if (Math.abs(newZoomLevel - prev.previewZoomLevel) > 0.001 || newZoomMode !== prev.previewZoomMode) {
                return { ...prev, previewZoomLevel: newZoomLevel, previewZoomMode: newZoomMode };
            }
            return prev;
        });
    }

    // Public handler for the zoom dropdown menu
    public handleZoomMenuClick = ({ key }: { key: string },
                                  currentProjectState: ProjectState // Pass current state
    ): void => {
        this.setProjectState(prev => {
            // This check is already correct and handles the null case
            const container = this.previewContainerRef.current;
            if (!container || !prev.canvasDimensions.width || !prev.canvasDimensions.height) return prev;

            const containerRect = container.getBoundingClientRect();
            const { width: canvasWidth, height: canvasHeight } = prev.canvasDimensions;
            const { width: containerWidth, height: containerHeight } = containerRect;

            const { fit, fill } = this.calculateScales(canvasWidth, canvasHeight, containerWidth, containerHeight);

            let newZoomLevel = prev.previewZoomLevel;
            let newZoomMode = prev.previewZoomMode;

            if (key === PREVIEW_ZOOM_FIT_MODE) {
                if (Math.abs(prev.previewZoomLevel - fit) > 0.001) {
                    newZoomLevel = fit;
                }
                newZoomMode = PREVIEW_ZOOM_FIT_MODE;
            } else if (key === PREVIEW_ZOOM_FILL_MODE) {
                if (Math.abs(prev.previewZoomLevel - fill) > 0.001) {
                    newZoomLevel = fill;
                }
                newZoomMode = PREVIEW_ZOOM_FILL_MODE;
            } else {
                const level = parseFloat(key);
                if (!isNaN(level) && PREVIEW_ZOOM_LEVELS.includes(level)) {
                    newZoomLevel = level;
                    newZoomMode = `${Math.round(newZoomLevel * 100)}%`;
                } else {
                    return prev;
                }
            }

            if (Math.abs(newZoomLevel - prev.previewZoomLevel) > 0.001 || newZoomMode !== prev.previewZoomMode) {
                return { ...prev, previewZoomLevel: newZoomLevel, previewZoomMode: newZoomMode };
            }
            return prev;
        });
    }
}
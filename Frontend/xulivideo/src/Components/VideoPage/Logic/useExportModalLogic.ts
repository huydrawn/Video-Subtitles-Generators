import { useState, useCallback } from 'react';
import { message } from 'antd';
import { fetchFile } from '@ffmpeg/util';
import { formatTime, parseTimecodeToSeconds } from '../utils';
import type { VideoEditorLogic } from '../types'; // Assuming types are in './types'

export interface ExportModalLogic {
    isExportModalVisible: boolean;
    selectedImageType: 'default' | 'webp';
    selectedGifType: 'gif' | 'webp';
    isExporting: boolean;
    exportProgress: number;
    removeColorOnExport: boolean;
    exportStartTime: number;
    exportEndTime: number;
    currentVideoAssetDuration: number;
    operationIsDone: boolean;
    currentOperationInProgress: boolean;
    currentProgressValue: number;
    showExportModal: () => void;
    handleExportModalCancel: () => void;
    handleExportModalOk: () => Promise<void>;
    handleTimeInputChange: (value: string, type: 'start' | 'end') => void;
    setSelectedImageType: React.Dispatch<React.SetStateAction<'default' | 'webp'>>;
    setSelectedGifType: React.Dispatch<React.SetStateAction<'gif' | 'webp'>>;
    setRemoveColorOnExport: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useExportModalLogic = (
    logic: VideoEditorLogic,
    getFirstVideoAssetDuration: () => number
): ExportModalLogic => {
    const [isExportModalVisible, setIsExportModalVisible] = useState(false);
    const [selectedImageType, setSelectedImageType] = useState<'default' | 'webp'>('default');
    const [selectedGifType, setSelectedGifType] = useState<'gif' | 'webp'>('gif');
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [removeColorOnExport, setRemoveColorOnExport] = useState(false);

    const [exportStartTime, setExportStartTime] = useState(0);
    const [exportEndTime, setExportEndTime] = useState(0);
    const [currentVideoAssetDuration, setCurrentVideoAssetDuration] = useState(0);

    const showExportModal = useCallback(() => {
        const duration = getFirstVideoAssetDuration();
        setExportStartTime(0);
        setExportEndTime(duration);
        setCurrentVideoAssetDuration(duration);
        setIsExportModalVisible(true);
        setExportProgress(0);
    }, [getFirstVideoAssetDuration]);

    const handleExportModalCancel = useCallback(() => {
        setIsExportModalVisible(false);
        if (isExporting || logic.isDesaturating) {
            setIsExporting(false);
            setExportProgress(0);
            // logic.cancelDesaturation(); // Assuming logic has a cancel method if needed
            message.info("Export cancelled.");
        }
    }, [isExporting, logic]);

    const handleExportModalOk = useCallback(async () => {
        if (!logic.ffmpegLoaded || !logic.ffmpegRef.current) {
            message.error("FFmpeg is not loaded. Cannot process export.");
            if (!logic.ffmpegLoaded) logic.loadFFmpeg();
            return;
        }
        if (isExporting || logic.isDesaturating) {
            message.warning("An export or processing operation is already in progress.");
            return;
        }

        const firstVideoAsset = logic.projectState.mediaAssets.find(
            asset => asset.type.startsWith('video/') && asset.secureUrl
        );

        if (!firstVideoAsset?.secureUrl) {
            message.error('No video asset with a secure URL found to export.');
            return;
        }

        // Reset progress only if not desaturating, as desaturation has its own progress
        if (!removeColorOnExport) {
            setIsExporting(true);
            setExportProgress(0);
        }
        message.info("Starting export process...");

        const ffmpeg = logic.ffmpegRef.current;
        const inputFileName = firstVideoAsset.secureUrl.substring(firstVideoAsset.secureUrl.lastIndexOf('/') + 1);
        const inputVideoName = `input_${Date.now()}_${inputFileName}`;
        const outputBaseName = logic.projectState.projectName.replace(/\s+/g, '_') || `export_${Date.now()}`;

        const progressCallback = ({ progress }: { progress: number; time?: number }) => {
            setExportProgress(Math.round(progress * 100));
        };

        try {
            if (removeColorOnExport) {
                message.info(
                    `Preparing to desaturate and trim video segment (${formatTime(exportStartTime)} to ${formatTime(exportEndTime)}).`
                );
                await logic.handleDesaturateVideoSegment(
                    firstVideoAsset.secureUrl,
                    exportStartTime,
                    exportEndTime
                );
                // The handleDesaturateVideoSegment should handle success message and download
            } else {
                setIsExporting(true); // Ensure exporting state is true for regular export
                message.info(`Fetching video: ${firstVideoAsset.name}`);
                await ffmpeg.writeFile(inputVideoName, await fetchFile(firstVideoAsset.secureUrl));
                message.info("Video loaded into FFmpeg.");
                ffmpeg.on('progress', progressCallback);

                const outputVideoName = `${outputBaseName}_video.mp4`;
                const videoExportArgs: string[] = ['-i', inputVideoName];
                const isTrimmed = exportStartTime > 0 || exportEndTime < currentVideoAssetDuration;

                if (isTrimmed) {
                    message.info(
                        `Trimming video from ${formatTime(exportStartTime, true)} to ${formatTime(exportEndTime, true)}.`
                    );
                    videoExportArgs.push('-ss', formatTime(exportStartTime, true));
                    videoExportArgs.push('-to', formatTime(exportEndTime, true));
                    videoExportArgs.push(
                        '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
                        '-c:a', 'aac', '-b:a', '128k'
                    );
                } else {
                    videoExportArgs.push('-c', 'copy');
                }
                videoExportArgs.push('-movflags', '+faststart', outputVideoName);

                message.info(`Processing video: ${outputVideoName}`);
                await ffmpeg.exec(videoExportArgs);
                message.success("Video processing complete.");

                const videoData = await ffmpeg.readFile(outputVideoName);
                const videoBlob = new Blob([videoData], { type: 'video/mp4' });
                const videoDownloadUrl = URL.createObjectURL(videoBlob);
                const videoLink = document.createElement('a');
                videoLink.href = videoDownloadUrl;
                videoLink.download = outputVideoName;
                document.body.appendChild(videoLink);
                videoLink.click();
                document.body.removeChild(videoLink);
                URL.revokeObjectURL(videoDownloadUrl);
                message.success(`Video "${outputVideoName}" downloaded.`);
                await ffmpeg.deleteFile(outputVideoName);
                await ffmpeg.deleteFile(inputVideoName);

                // Image and GIF export
                const snapshotInputName = `snapshot_input_${Date.now()}_${inputFileName}`;
                await ffmpeg.writeFile(snapshotInputName, await fetchFile(firstVideoAsset.secureUrl));

                let imageOutputName = '';
                let imageMimeType = '';
                const imageExportArgs: string[] = ['-i', snapshotInputName, '-ss', '00:00:01', '-frames:v', '1'];
                if (selectedImageType === 'webp') {
                    imageOutputName = `${outputBaseName}_snapshot.webp`;
                    imageMimeType = 'image/webp';
                    imageExportArgs.push('-c:v', 'libwebp', '-lossless', '0', '-q:v', '75', imageOutputName);
                } else {
                    imageOutputName = `${outputBaseName}_snapshot.jpg`;
                    imageMimeType = 'image/jpeg';
                    imageExportArgs.push('-c:v', 'mjpeg', '-q:v', '4', imageOutputName);
                }
                if (imageOutputName) {
                    await ffmpeg.exec(imageExportArgs);
                    const imageData = await ffmpeg.readFile(imageOutputName);
                    await ffmpeg.deleteFile(imageOutputName);
                    const imageBlob = new Blob([imageData], { type: imageMimeType });
                    const imageDownloadUrl = URL.createObjectURL(imageBlob);
                    const imageLink = document.createElement('a');
                    imageLink.href = imageDownloadUrl;
                    imageLink.download = imageOutputName;
                    document.body.appendChild(imageLink);
                    imageLink.click();
                    document.body.removeChild(imageLink);
                    URL.revokeObjectURL(imageDownloadUrl);
                    message.success(`Snapshot "${imageOutputName}" downloaded.`);
                }

                let animOutputName = '';
                let animMimeType = '';
                const animExportArgsBase: string[] = [
                    '-i', snapshotInputName, '-t', '5', '-vf', 'fps=15,scale=320:-1:flags=lanczos'
                ];
                let finalAnimExportArgs = [...animExportArgsBase];
                if (selectedGifType === 'webp') {
                    animOutputName = `${outputBaseName}_animation.webp`;
                    animMimeType = 'image/webp';
                    finalAnimExportArgs.push(
                        '-c:v', 'libwebp', '-loop', '0', '-lossless', '0',
                        '-q:v', '70', '-preset', 'picture', animOutputName
                    );
                } else {
                    animOutputName = `${outputBaseName}_animation.gif`;
                    animMimeType = 'image/gif';
                    const paletteName = 'palette.png';
                    await ffmpeg.exec([
                        '-i', snapshotInputName, '-t', '5',
                        '-vf', `fps=15,scale=320:-1:flags=lanczos,palettegen`,
                        '-y', paletteName
                    ]);
                    finalAnimExportArgs.push(
                        '-i', paletteName,
                        '-lavfi', 'fps=15,scale=320:-1:flags=lanczos [x]; [x][1:v] paletteuse',
                        animOutputName
                    );
                }
                if (animOutputName) {
                    await ffmpeg.exec(finalAnimExportArgs);
                    const animData = await ffmpeg.readFile(animOutputName);
                    await ffmpeg.deleteFile(animOutputName);
                    if (selectedGifType === 'gif') await ffmpeg.deleteFile('palette.png');

                    const animBlob = new Blob([animData], { type: animMimeType });
                    const animDownloadUrl = URL.createObjectURL(animBlob);
                    const animLink = document.createElement('a');
                    animLink.href = animDownloadUrl;
                    animLink.download = animOutputName;
                    document.body.appendChild(animLink);
                    animLink.click();
                    document.body.removeChild(animLink);
                    URL.revokeObjectURL(animDownloadUrl);
                    message.success(`Animation "${animOutputName}" downloaded.`);
                }
                await ffmpeg.deleteFile(snapshotInputName);
            }
        } catch (error) {
            console.error("Error during FFmpeg export:", error);
            message.error(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            ffmpeg.off('progress', progressCallback);
            if (!removeColorOnExport) { // Only reset isExporting if it was a regular export
                setIsExporting(false);
            }
            // setIsExportModalVisible(false); // Modal is hidden by desaturation success or regular export finish
            if (logic.isDesaturating && logic.desaturationProgress === 100) {
                setIsExportModalVisible(false);
            } else if (!removeColorOnExport && !logic.isDesaturating) {
                setIsExportModalVisible(false);
            }
        }
    }, [
        logic,
        isExporting,
        removeColorOnExport,
        exportStartTime,
        exportEndTime,
        currentVideoAssetDuration,
        selectedImageType,
        selectedGifType,
    ]);

    const handleTimeInputChange = useCallback((value: string, type: 'start' | 'end') => {
        let seconds = 0;
        const parts = value.replace(',', '.').split(':');
        if (parts.length === 2) {
            seconds = parseTimecodeToSeconds(`00:${value}`);
        } else if (parts.length === 3) {
            seconds = parseTimecodeToSeconds(value);
        } else {
            return;
        }
        if (isNaN(seconds)) seconds = 0;

        if (type === 'start') {
            setExportStartTime(
                Math.max(0, Math.min(seconds, exportEndTime, currentVideoAssetDuration))
            );
        } else {
            setExportEndTime(
                Math.max(exportStartTime, Math.min(seconds, currentVideoAssetDuration))
            );
        }
    }, [exportEndTime, exportStartTime, currentVideoAssetDuration]);

    const currentOperationInProgress = isExporting || logic.isDesaturating;
    const currentProgressValue = isExporting ? exportProgress : logic.desaturationProgress;
    const operationIsDone = (isExporting && exportProgress === 100) ||
        (logic.isDesaturating && logic.desaturationProgress === 100);


    return {
        isExportModalVisible,
        selectedImageType,
        selectedGifType,
        isExporting,
        exportProgress,
        removeColorOnExport,
        exportStartTime,
        exportEndTime,
        currentVideoAssetDuration,
        operationIsDone,
        currentOperationInProgress,
        currentProgressValue,
        showExportModal,
        handleExportModalCancel,
        handleExportModalOk,
        handleTimeInputChange,
        setSelectedImageType,
        setSelectedGifType,
        setRemoveColorOnExport,
    };
}
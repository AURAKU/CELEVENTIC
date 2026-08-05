/** Canonical BackgroundJob.queue value for invitation / media video processing. */
export const VIDEO_PROCESS_QUEUE = "video-process" as const;

export type VideoProcessQueue = typeof VIDEO_PROCESS_QUEUE;

/**
 * Browser-side audio trim: decode → slice → encode WAV.
 * Works for any format the browser can decode (mp3, wav, m4a, ogg, flac, webm, …).
 */

export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const ctx = new AudioContext();
  try {
    const data = await file.arrayBuffer();
    return await ctx.decodeAudioData(data.slice(0));
  } finally {
    await ctx.close().catch(() => undefined);
  }
}

export async function trimAudioFileToWav(
  file: File,
  startSec: number,
  endSec: number
): Promise<{ blob: Blob; durationSec: number; fileName: string }> {
  const buffer = await decodeAudioFile(file);
  const sampleRate = buffer.sampleRate;
  const start = Math.max(0, Math.min(startSec, buffer.duration));
  const end = Math.max(start + 0.05, Math.min(endSec, buffer.duration));
  const startFrame = Math.floor(start * sampleRate);
  const endFrame = Math.floor(end * sampleRate);
  const frameCount = Math.max(1, endFrame - startFrame);
  const channels = buffer.numberOfChannels;

  const trimmed = new AudioBuffer({
    length: frameCount,
    numberOfChannels: channels,
    sampleRate,
  });

  for (let ch = 0; ch < channels; ch++) {
    const src = buffer.getChannelData(ch).subarray(startFrame, endFrame);
    trimmed.copyToChannel(src, ch, 0);
  }

  const wav = audioBufferToWavBlob(trimmed);
  const base = file.name.replace(/\.[^.]+$/, "") || "clip";
  return {
    blob: wav,
    durationSec: frameCount / sampleRate,
    fileName: `${base}-clip-${Math.round(start)}-${Math.round(end)}.wav`,
  };
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const headerLength = 44;
  const arrayBuffer = new ArrayBuffer(headerLength + dataLength);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) channels.push(buffer.getChannelData(i));

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

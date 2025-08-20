/**
 * Audio analysis utilities using Web Audio API
 * Handles waveform data extraction and audio processing
 */

interface AudioAnalysisResult {
  waveformData: number[];
  duration: number;
  sampleRate: number;
}

/**
 * Analyzes an audio file and extracts waveform data
 * @param audioUrl - URL of the audio file to analyze
 * @param samples - Number of samples to extract (default: 200)
 * @returns Promise with waveform data and audio metadata
 */
export async function analyzeAudioFile(
  audioUrl: string,
  samples: number = 200
): Promise<AudioAnalysisResult> {
  try {
    // Fetch the audio file
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();

    // Create audio context
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    
    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Extract waveform data
    const waveformData = extractWaveformData(audioBuffer, samples);
    
    // Clean up
    audioContext.close();
    
    return {
      waveformData,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate
    };
  } catch (error) {
    console.error('Error analyzing audio file:', error);
    // Return default waveform data on error
    return {
      waveformData: generateDefaultWaveform(samples),
      duration: 0,
      sampleRate: 44100
    };
  }
}

/**
 * Extracts normalized waveform data from an AudioBuffer
 * @param audioBuffer - The decoded audio buffer
 * @param samples - Number of samples to extract
 * @returns Array of normalized peak values (0-1)
 */
function extractWaveformData(audioBuffer: AudioBuffer, samples: number): number[] {
  const channelData = audioBuffer.getChannelData(0); // Get first channel
  const blockSize = Math.floor(channelData.length / samples);
  const waveformData: number[] = [];

  for (let i = 0; i < samples; i++) {
    const start = blockSize * i;
    const end = Math.min(start + blockSize, channelData.length);
    
    // Find the peak value in this block
    let peak = 0;
    for (let j = start; j < end; j++) {
      const value = Math.abs(channelData[j]);
      if (value > peak) {
        peak = value;
      }
    }
    
    // Normalize to 0-1 range
    waveformData.push(peak);
  }

  return waveformData;
}

/**
 * Generates a default waveform pattern for fallback
 * @param samples - Number of samples to generate
 * @returns Array of random waveform values
 */
function generateDefaultWaveform(samples: number): number[] {
  const waveform: number[] = [];
  
  for (let i = 0; i < samples; i++) {
    // Generate a realistic-looking waveform pattern
    const base = 0.3 + Math.random() * 0.4;
    const variation = Math.sin(i * 0.1) * 0.2;
    waveform.push(Math.max(0, Math.min(1, base + variation)));
  }
  
  return waveform;
}

/**
 * Draws waveform data on a canvas element
 * @param canvas - The canvas element to draw on
 * @param waveformData - Array of normalized peak values
 * @param volume - Volume level (0-200)
 * @param color - Waveform color (default: green)
 * @param backgroundColor - Background color (default: transparent)
 */
export function drawWaveform(
  canvas: HTMLCanvasElement,
  waveformData: number[],
  volume: number = 100,
  color: string = 'rgba(74, 222, 128, 0.8)',
  backgroundColor: string = 'transparent'
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const barWidth = width / waveformData.length;
  const volumeMultiplier = volume / 100;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Fill background if specified
  if (backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Draw waveform bars
  ctx.fillStyle = color;
  
  for (let i = 0; i < waveformData.length; i++) {
    const barHeight = waveformData[i] * height * 0.8 * volumeMultiplier;
    const x = i * barWidth;
    const y = (height - barHeight) / 2;
    
    // Draw mirrored bars for symmetric waveform
    ctx.fillRect(x, y, barWidth - 1, barHeight);
  }
}

/**
 * Draws Final Cut Pro style waveform (bottom-up with gradient)
 * @param canvas - The canvas element to draw on
 * @param waveformData - Array of normalized peak values
 * @param volume - Volume level (0-100)
 * @param isActive - Whether the clip is active/selected
 */
export function drawWaveformFinalCutStyle(
  canvas: HTMLCanvasElement,
  waveformData: number[],
  volume: number = 100,
  isActive: boolean = false
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const barWidth = Math.max(1, width / waveformData.length);
  const gap = barWidth > 3 ? 1 : 0; // Add gap between bars if they're wide enough
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Create gradient for waveform
  const gradient = ctx.createLinearGradient(0, height, 0, 0);
  if (isActive) {
    // Active state - brighter blue
    gradient.addColorStop(0, 'rgba(56, 244, 124, 0.9)'); // Bright green at bottom
    gradient.addColorStop(1, 'rgba(56, 244, 124, 0.3)'); // Faded at top
  } else {
    // Inactive state - Final Cut Pro blue
    gradient.addColorStop(0, 'rgba(74, 144, 226, 0.9)'); // Solid blue at bottom
    gradient.addColorStop(0.7, 'rgba(74, 144, 226, 0.6)'); // Mid fade
    gradient.addColorStop(1, 'rgba(74, 144, 226, 0.2)'); // Faded at top
  }
  
  ctx.fillStyle = gradient;
  
  // Draw waveform bars from bottom up
  for (let i = 0; i < waveformData.length; i++) {
    // Apply volume scaling (0-100% range)
    const scaledHeight = waveformData[i] * (volume / 100);
    const barHeight = scaledHeight * height * 0.9; // Use 90% of available height
    const x = i * barWidth;
    const y = height - barHeight; // Start from bottom
    
    // Draw bar
    ctx.fillRect(x, y, barWidth - gap, barHeight);
  }
  
  // Add subtle reflection effect (optional)
  if (barWidth > 2) {
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = 'white';
    for (let i = 0; i < waveformData.length; i++) {
      const scaledHeight = waveformData[i] * (volume / 100);
      const barHeight = scaledHeight * height * 0.9;
      const x = i * barWidth;
      const y = height - barHeight;
      
      // Draw thin highlight on left edge of each bar
      ctx.fillRect(x, y, 1, barHeight);
    }
    ctx.globalAlpha = 1;
  }
}

/**
 * Calculates the RMS (Root Mean Square) value for volume visualization
 * @param waveformData - Array of normalized peak values
 * @returns RMS value (0-1)
 */
export function calculateRMS(waveformData: number[]): number {
  if (waveformData.length === 0) return 0;
  
  const sum = waveformData.reduce((acc, val) => acc + val * val, 0);
  return Math.sqrt(sum / waveformData.length);
}

/**
 * Smooths waveform data for better visualization
 * @param waveformData - Raw waveform data
 * @param smoothingFactor - How much to smooth (0-1, higher = smoother)
 * @returns Smoothed waveform data
 */
export function smoothWaveform(
  waveformData: number[],
  smoothingFactor: number = 0.3
): number[] {
  const smoothed: number[] = [];
  
  for (let i = 0; i < waveformData.length; i++) {
    let sum = waveformData[i];
    let count = 1;
    
    // Average with neighboring samples
    const range = Math.floor(smoothingFactor * 5);
    for (let j = 1; j <= range; j++) {
      if (i - j >= 0) {
        sum += waveformData[i - j];
        count++;
      }
      if (i + j < waveformData.length) {
        sum += waveformData[i + j];
        count++;
      }
    }
    
    smoothed.push(sum / count);
  }
  
  return smoothed;
}

/**
 * Resamples waveform data to a different number of samples
 * Useful when resizing the waveform display
 * @param waveformData - Original waveform data
 * @param newSampleCount - Desired number of samples
 * @returns Resampled waveform data
 */
export function resampleWaveform(
  waveformData: number[],
  newSampleCount: number
): number[] {
  if (waveformData.length === newSampleCount) return waveformData;
  
  const resampled: number[] = [];
  const ratio = waveformData.length / newSampleCount;
  
  for (let i = 0; i < newSampleCount; i++) {
    const index = i * ratio;
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.min(Math.ceil(index), waveformData.length - 1);
    const fraction = index - lowerIndex;
    
    // Linear interpolation between samples
    const value = waveformData[lowerIndex] * (1 - fraction) + 
                  waveformData[upperIndex] * fraction;
    resampled.push(value);
  }
  
  return resampled;
}
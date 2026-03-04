'use client';

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import Hls from 'hls.js';
import { Channel } from '@/lib/channels';

export interface Recording {
  id: string;
  channel: Channel;
  startTime: Date;
  duration: number;
  blob: Blob | null;
  isRecording: boolean;
  isPaused: boolean;
  error: string | null;
  quality: '720p' | '1080p';
  thumbnailUrl?: string;
  title?: string;
}

interface RecordingContextType {
  recordings: Recording[];
  activeRecording: Recording | null;
  startRecording: (channel: Channel, duration: number, quality: '720p' | '1080p', title?: string) => Promise<void>;
  stopRecording: (recordingId: string) => void;
  pauseRecording: (recordingId: string) => void;
  resumeRecording: (recordingId: string) => void;
  downloadRecording: (recordingId: string) => void;
  deleteRecording: (recordingId: string) => void;
  getCompletedRecordings: () => Recording[];
  getRecordingUrl: (recordingId: string) => string | null;
}

const RecordingContext = createContext<RecordingContextType | null>(null);

const STORAGE_KEY = 'streamflow_recordings_metadata';

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [activeRecording, setActiveRecording] = useState<Recording | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  
  const recordingRefs = useRef<Map<string, {
    video: HTMLVideoElement;
    mediaRecorder: MediaRecorder;
    hls: Hls | null;
    chunks: Blob[];
    timerInterval: NodeJS.Timeout;
    objectUrl?: string;
    audioContext?: AudioContext;
    destination?: MediaStreamAudioDestinationNode;
    originalStream?: MediaStream;
    frameInterval?: NodeJS.Timeout;
  }>>(new Map());

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const restored: Recording[] = parsed.map((r: any) => ({
          ...r,
          startTime: new Date(r.startTime),
          blob: null,
          isRecording: false,
          isPaused: false,
        }));
        setRecordings(restored);
      } catch (e) {
        console.error('Failed to load recordings:', e);
      }
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const metadata = recordings.map(r => ({
      id: r.id,
      channel: r.channel,
      startTime: r.startTime.toISOString(),
      duration: r.duration,
      quality: r.quality,
      title: r.title,
      thumbnailUrl: r.thumbnailUrl,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
  }, [recordings, isHydrated]);

  const startRecording = useCallback(async (channel: Channel, duration: number, quality: '720p' | '1080p', title?: string) => {
    const recordingId = `${channel.id}_${Date.now()}`;
    let hlsInstance: Hls | null = null;
    let video: HTMLVideoElement | null = null;
    
    try {
      // Create video element that MUST be visible for captureStream to work properly
      video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = false; // Unmuted so we can capture audio
      video.playsInline = true;
      video.autoplay = true;
      
      // CRITICAL: Video must be in DOM and technically visible for captureStream to generate frames
      // Position it off-screen but not with display:none or visibility:hidden
      video.style.position = 'fixed';
      video.style.top = '0';
      video.style.left = '0';
      video.style.width = '1px';
      video.style.height = '1px';
      video.style.opacity = '0.01'; // Nearly invisible but technically rendered
      video.style.pointerEvents = 'none';
      video.style.zIndex = '-1';
      document.body.appendChild(video);

      // Setup HLS with specific config for stability
      if (Hls.isSupported()) {
        hlsInstance = new Hls({
          enableWorker: true,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          maxBufferSize: 20 * 1000 * 1000,
          maxBufferHole: 0.5,
          lowLatencyMode: false,
          backBufferLength: 30,
          startLevel: quality === '1080p' ? 4 : 2,
          abrEwmaDefaultEstimate: quality === '1080p' ? 5000000 : 3000000,
          maxFragLookUpTolerance: 0.25,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10,
        });
        
        hlsInstance.on(Hls.Events.ERROR, (_, data) => {
          console.log('HLS Event:', data);
          if (data.fatal) {
            console.error('Fatal HLS error:', data.type, data.details);
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              console.log('Recovering network error...');
              hlsInstance?.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              console.log('Recovering media error...');
              hlsInstance?.recoverMediaError();
            }
          }
        });
        
        hlsInstance.loadSource(channel.m3u8Url);
        hlsInstance.attachMedia(video);
        
        await new Promise<void>((resolve, reject) => {
          const onManifestParsed = () => {
            console.log('Manifest parsed, levels:', hlsInstance!.levels.length);
            if (quality === '1080p' && hlsInstance!.levels.length > 4) {
              hlsInstance!.currentLevel = 4;
            } else if (quality === '720p' && hlsInstance!.levels.length > 2) {
              hlsInstance!.currentLevel = 2;
            }
            resolve();
          };
          
          hlsInstance!.once(Hls.Events.MANIFEST_PARSED, onManifestParsed);
          hlsInstance!.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) reject(new Error(`HLS Error: ${data.type}`));
          });
          
          setTimeout(() => resolve(), 10000);
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = channel.m3u8Url;
        await new Promise<void>((resolve, reject) => {
          video!.addEventListener('loadedmetadata', () => resolve(), { once: true });
          setTimeout(() => reject(new Error('Timeout')), 10000);
        });
      } else {
        throw new Error('HLS not supported');
      }

      // Start playing
      await video.play();
      
      // CRITICAL: Wait for actual playback with frames
      await new Promise<void>((resolve, reject) => {
        let checks = 0;
        const checkPlayback = () => {
          checks++;
          console.log('Video check:', {
            readyState: video!.readyState,
            currentTime: video!.currentTime,
            paused: video!.paused,
            videoWidth: video!.videoWidth,
            buffered: video!.buffered.length > 0 ? 
              `${video!.buffered.start(0)}-${video!.buffered.end(0)}` : 'none'
          });
          
          // readyState 4 = HAVE_ENOUGH_DATA
          if (video!.readyState >= 3 && video!.currentTime > 0.5 && video!.videoWidth > 0) {
            resolve();
          } else if (checks > 100) {
            reject(new Error('Video playback not starting properly'));
          } else {
            setTimeout(checkPlayback, 100);
          }
        };
        checkPlayback();
      });

      // Wait a bit more for stable playback
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Capture thumbnail
      let thumbnailUrl: string | undefined;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
        }
      } catch (e) {
        console.warn('Thumbnail failed:', e);
      }

      // CRITICAL FIX: Use captureStream with specific frame rate
      // @ts-ignore
      if (!video.captureStream) {
        throw new Error('captureStream not supported');
      }
      
      // Capture at 30fps
      // @ts-ignore
      const videoStream = video.captureStream(30);
      
      if (!videoStream) {
        throw new Error('Failed to capture stream');
      }

      // Verify video tracks
      const videoTracks = videoStream.getVideoTracks();
      console.log('Video tracks:', videoTracks.length, videoTracks.map((t: { label: any; enabled: any; readyState: any; getSettings: () => any; }) => ({
        label: t.label,
        enabled: t.enabled,
        readyState: t.readyState,
        settings: t.getSettings?.()
      })));

      if (videoTracks.length === 0) {
        throw new Error('No video tracks captured');
      }

      // Setup audio context to capture audio
      let audioContext: AudioContext | undefined;
      let destination: MediaStreamAudioDestinationNode | undefined;
      
      try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 48000,
          latencyHint: 'playback'
        });
        
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        
        const source = audioContext.createMediaElementSource(video);
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 1.0;
        
        destination = audioContext.createMediaStreamDestination();
        source.connect(gainNode);
        gainNode.connect(destination);
        // Also connect to speakers so we can hear it
        gainNode.connect(audioContext.destination);
        
        // Add audio track to video stream
        const audioTrack = destination.stream.getAudioTracks()[0];
        if (audioTrack) {
          videoStream.addTrack(audioTrack);
          console.log('Audio track added');
        }
      } catch (audioErr) {
        console.warn('Audio setup failed:', audioErr);
      }

      // Determine best codec - prefer vp9 for better compression
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
      ];

      let selectedMimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          console.log('Selected codec:', type);
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error('No supported codec found');
      }

      const mediaRecorder = new MediaRecorder(videoStream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: quality === '1080p' ? 8000000 : 5000000,
        audioBitsPerSecond: 128000,
      });

      const chunks: Blob[] = [];
      let frameCount = 0;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
          frameCount++;
          if (frameCount % 10 === 0) {
            console.log(`Recorded ${frameCount} chunks, latest size:`, e.data.size);
          }
        }
      };

      mediaRecorder.onstart = () => {
        console.log('MediaRecorder started, state:', mediaRecorder.state);
      };

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped, total chunks:', chunks.length, 'total size:', chunks.reduce((a, b) => a + b.size, 0));
        
        if (audioContext && audioContext.state !== 'closed') {
          audioContext.close().catch(console.error);
        }
        
        const blob = new Blob(chunks, { type: selectedMimeType });
        const url = URL.createObjectURL(blob);
        
        setRecordings(prev => prev.map(r => 
          r.id === recordingId 
            ? { ...r, blob, isRecording: false, thumbnailUrl: r.thumbnailUrl || thumbnailUrl }
            : r
        ));
        
        setActiveRecording(prev => prev?.id === recordingId ? null : prev);
        
        const ref = recordingRefs.current.get(recordingId);
        if (ref) {
          ref.objectUrl = url;
        }
      };

      mediaRecorder.onerror = (e) => {
        console.error('MediaRecorder error:', e);
      };

      // CRITICAL: Request data every 1 second to ensure we get data even if stream stalls
      mediaRecorder.start(1000);

      // CRITICAL FIX: Keep video playing by monitoring and forcing play if it pauses
      const frameInterval = setInterval(() => {
        if (video && video.paused && !video.ended) {
          console.log('Video paused unexpectedly, resuming...');
          video.play().catch(e => console.error('Failed to resume video:', e));
        }
        // Log current state for debugging
        if (video) {
          console.log('Recording status:', {
            currentTime: video.currentTime,
            paused: video.paused,
            readyState: video.readyState,
            recorderState: mediaRecorder.state
          });
        }
      }, 2000);

      const defaultTitle = `${channel.name} - ${formatDate(new Date())}`;
      
      const newRecording: Recording = {
        id: recordingId,
        channel,
        startTime: new Date(),
        duration,
        blob: null,
        isRecording: true,
        isPaused: false,
        error: null,
        quality,
        title: title || defaultTitle,
        thumbnailUrl,
      };

      setRecordings(prev => [...prev, newRecording]);
      setActiveRecording(newRecording);

      const timerInterval = setInterval(() => {
        setRecordings(prev => prev.map(r => {
          if (r.id === recordingId && r.isRecording && !r.isPaused) {
            const elapsed = (Date.now() - r.startTime.getTime()) / 1000 / 60;
            if (r.duration > 0 && elapsed >= r.duration) {
              const ref = recordingRefs.current.get(recordingId);
              if (ref?.mediaRecorder.state === 'recording') {
                ref.mediaRecorder.stop();
              }
            }
          }
          return r;
        }));
      }, 1000);

      recordingRefs.current.set(recordingId, {
        video,
        mediaRecorder,
        hls: hlsInstance,
        chunks,
        timerInterval,
        audioContext,
        destination,
        originalStream: videoStream,
        frameInterval,
      });

    } catch (err) {
      console.error('Recording failed:', err);
      
      if (video) {
        video.pause();
        video.src = '';
        video.remove();
      }
      hlsInstance?.destroy();
      
      setRecordings(prev => prev.map(r => 
        r.id === recordingId 
          ? { ...r, error: err instanceof Error ? err.message : 'Unknown error', isRecording: false }
          : r
      ));
      
      throw err;
    }
  }, []);

  const stopRecording = useCallback((recordingId: string) => {
    const ref = recordingRefs.current.get(recordingId);
    if (ref) {
      console.log('Stopping recording:', recordingId);
      
      if (ref.frameInterval) {
        clearInterval(ref.frameInterval);
      }
      
      if (ref.mediaRecorder.state === 'recording' || ref.mediaRecorder.state === 'paused') {
        ref.mediaRecorder.stop();
      }
      
      clearInterval(ref.timerInterval);
      
      if (ref.audioContext && ref.audioContext.state !== 'closed') {
        ref.audioContext.close().catch(console.error);
      }
    }
  }, []);

  const pauseRecording = useCallback((recordingId: string) => {
    const ref = recordingRefs.current.get(recordingId);
    if (ref && ref.mediaRecorder.state === 'recording') {
      ref.mediaRecorder.pause();
      ref.video.pause();
      setRecordings(prev => prev.map(r => 
        r.id === recordingId ? { ...r, isPaused: true } : r
      ));
    }
  }, []);

  const resumeRecording = useCallback((recordingId: string) => {
    const ref = recordingRefs.current.get(recordingId);
    if (ref && ref.mediaRecorder.state === 'paused') {
      ref.mediaRecorder.resume();
      ref.video.play().catch(console.error);
      setRecordings(prev => prev.map(r => 
        r.id === recordingId ? { ...r, isPaused: false } : r
      ));
    }
  }, []);

  const getRecordingUrl = useCallback((recordingId: string): string | null => {
    const recording = recordings.find(r => r.id === recordingId);
    if (!recording?.blob) return null;
    
    const ref = recordingRefs.current.get(recordingId);
    if (ref?.objectUrl) return ref.objectUrl;
    
    const url = URL.createObjectURL(recording.blob);
    if (ref) ref.objectUrl = url;
    return url;
  }, [recordings]);

  const downloadRecording = useCallback((recordingId: string) => {
    const recording = recordings.find(r => r.id === recordingId);
    if (!recording?.blob) return;

    const url = URL.createObjectURL(recording.blob);
    const a = document.createElement('a');
    a.href = url;
    
    const ext = recording.blob.type.includes('mp4') ? 'mp4' : 'webm';
    a.download = `${recording.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'recording'}_${formatDate(recording.startTime)}.${ext}`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [recordings]);

  const deleteRecording = useCallback((recordingId: string) => {
    const ref = recordingRefs.current.get(recordingId);
    if (ref) {
      if (ref.frameInterval) {
        clearInterval(ref.frameInterval);
      }
      
      if (ref.mediaRecorder.state !== 'inactive') {
        ref.mediaRecorder.stop();
      }
      
      clearInterval(ref.timerInterval);
      ref.hls?.destroy();
      ref.video.pause();
      ref.video.src = '';
      ref.video.remove();
      
      if (ref.audioContext?.state !== 'closed') {
        ref.audioContext?.close().catch(console.error);
      }
      
      if (ref.objectUrl) {
        URL.revokeObjectURL(ref.objectUrl);
      }
      
      recordingRefs.current.delete(recordingId);
    }
    
    setRecordings(prev => prev.filter(r => r.id !== recordingId));
    if (activeRecording?.id === recordingId) {
      setActiveRecording(null);
    }
  }, [activeRecording]);

  const getCompletedRecordings = useCallback(() => {
    return recordings.filter(r => r.blob && !r.isRecording);
  }, [recordings]);

  return (
    <RecordingContext.Provider value={{
      recordings,
      activeRecording,
      startRecording,
      stopRecording,
      pauseRecording,
      resumeRecording,
      downloadRecording,
      deleteRecording,
      getCompletedRecordings,
      getRecordingUrl,
    }}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const context = useContext(RecordingContext);
  if (!context) {
    throw new Error('useRecording must be used within RecordingProvider');
  }
  return context;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
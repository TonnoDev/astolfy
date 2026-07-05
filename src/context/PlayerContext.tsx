import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { Song, PlayerState } from '../types/music';
import { musicAggregator } from '../services/musicService';
import { pipedService } from '../services/pipedApi';

interface PlayerContextType extends PlayerState {
  playSong: (song: Song) => void;
  pauseSong: () => void;
  resumeSong: () => void;
  playNext: () => void;
  playPrevious: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  setRepeatMode: (mode: 'none' | 'all' | 'one') => void;
  seekTo: (time: number) => void;
  setQueue: (songs: Song[], startIndex?: number) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  dismissPlaybackError: () => void;
  queue: Song[];
  currentIndex: number;
  isNowPlayingOpen: boolean;
  openNowPlaying: () => void;
  closeNowPlaying: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [playerState, setPlayerState] = useState<PlayerState>({
    currentSong: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    isShuffle: false,
    repeatMode: 'none',
    playbackError: null
  });

  const [queue, setQueueState] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);

  const playerRef = useRef<any>(null);
  const isPlayerReady = useRef(false);
  const updateIntervalRef = useRef<number | null>(null);
  const consecutiveErrorCountRef = useRef(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeBackendRef = useRef<'youtube' | 'audio'>('youtube');

  // Refs mirroring state so frozen YouTube handlers always see current values.
  const queueRef = useRef<Song[]>(queue);
  const currentIndexRef = useRef<number>(currentIndex);
  const playerStateRef = useRef<PlayerState>(playerState);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { playerStateRef.current = playerState; }, [playerState]);

  // Stable dispatchers for the frozen YouTube player handlers.
  const playNextRef = useRef<() => void>(() => {});
  const handleSongEndRef = useRef<() => void>(() => {});
  const handleYouTubeErrorRef = useRef<() => void>(() => {});

  // --- HTML5 audio element setup (once) ---
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const onTimeUpdate = () => {
      if (activeBackendRef.current !== 'audio') return;
      setPlayerState(prev => ({
        ...prev,
        currentTime: audio.currentTime,
        duration: audio.duration && isFinite(audio.duration) ? audio.duration : prev.duration
      }));
    };
    const onLoadedMeta = () => {
      if (activeBackendRef.current !== 'audio') return;
      if (audio.duration && isFinite(audio.duration)) {
        setPlayerState(prev => ({ ...prev, duration: audio.duration }));
      }
    };
    const onPlay = () => {
      if (activeBackendRef.current !== 'audio') return;
      consecutiveErrorCountRef.current = 0;
      setPlayerState(prev => ({ ...prev, isPlaying: true, playbackError: null }));
      startProgressUpdate();
    };
    const onPause = () => {
      if (activeBackendRef.current !== 'audio') return;
      setPlayerState(prev => ({ ...prev, isPlaying: false }));
      stopProgressUpdate();
    };
    const onEnded = () => {
      if (activeBackendRef.current !== 'audio') return;
      handleSongEndRef.current();
    };
    const onError = () => {
      if (activeBackendRef.current !== 'audio') return;
      console.error('PlayerContext: HTML5 audio error');
      consecutiveErrorCountRef.current += 1;
      setPlayerState(prev => ({
        ...prev,
        playbackError:
          `"${prev.currentSong?.title ?? 'Brano'}" non è riproducibile. Salto al successivo...`
      }));
      const MAX = 8;
      if (consecutiveErrorCountRef.current > MAX) {
        setPlayerState(prev => ({
          ...prev,
          isPlaying: false,
          currentSong: null,
          playbackError: 'Troppe riproduzioni non disponibili di fila. La coda è stata interrotta.'
        }));
        stopProgressUpdate();
        return;
      }
      window.setTimeout(() => { playNextRef.current(); }, 700);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMeta);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMeta);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize YouTube IFrame API
  useEffect(() => {
    console.log('PlayerContext: Initializing YouTube API');
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    (window as any).onYouTubeIframeAPIReady = () => {
      console.log('PlayerContext: YouTube API ready');
      isPlayerReady.current = true;
      initializePlayer();
    };
    return () => {
      if (playerRef.current) playerRef.current.destroy();
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializePlayer = useCallback(() => {
    console.log('PlayerContext: Initializing YouTube player');
    playerRef.current = new (window as any).YT.Player('youtube-player', {
      height: '0',
      width: '0',
      playerVars: { 'playsinline': 1, 'controls': 0, 'disablekb': 1 },
      events: {
        'onReady': onPlayerReady,
        'onStateChange': onPlayerStateChange,
        'onError': onPlayerError
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPlayerReady = useCallback(() => {
    console.log('PlayerContext: YouTube player ready');
    if (playerRef.current) {
      playerRef.current.setVolume(playerStateRef.current.volume * 100);
    }
  }, []);

  const updateProgress = useCallback(() => {
    if (activeBackendRef.current === 'audio' && audioRef.current) {
      const a = audioRef.current;
      setPlayerState(prev => ({
        ...prev,
        currentTime: a.currentTime,
        duration: a.duration && isFinite(a.duration) ? a.duration : prev.duration
      }));
      return;
    }
    if (playerRef.current && activeBackendRef.current === 'youtube') {
      const currentTime = playerRef.current.getCurrentTime();
      const duration = playerRef.current.getDuration();
      if (duration > 0) {
        setPlayerState(prev => ({ ...prev, currentTime, duration }));
      }
    }
  }, []);

  const startProgressUpdate = useCallback(() => {
    if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
    updateProgress();
    updateIntervalRef.current = window.setInterval(() => { updateProgress(); }, 1000);
  }, [updateProgress]);

  const stopProgressUpdate = useCallback(() => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    if (activeBackendRef.current === 'audio' && audioRef.current) {
      audioRef.current.currentTime = time;
      setPlayerState(prev => ({ ...prev, currentTime: time }));
      return;
    }
    if (playerRef.current && activeBackendRef.current === 'youtube') {
      playerRef.current.seekTo(time);
      setPlayerState(prev => ({ ...prev, currentTime: time }));
      if (playerState.isPlaying) startProgressUpdate();
    }
  }, [playerState.isPlaying, startProgressUpdate]);

  /**
   * Core play function. Branches on song.source:
   *   - audius   → resolve Audius stream URL → <audio>
   *   - youtube  → PRIMARY: try Piped for a direct audio URL (bypasses
   *                Error 150 entirely → playback always works, even for
   *                restricted videos like BABYMETAL Gimme Chocolate).
   *                FALLBACK: if Piped fails, use the YouTube IFrame
   *                player (may Error 150 → handled → skip to next song).
   */
  const playSong = useCallback(async (song: Song) => {
    console.log('PlayerContext: playSong called with:', song);

    consecutiveErrorCountRef.current = 0;
    setPlayerState(prev => ({
      ...prev,
      currentSong: song,
      isPlaying: true,
      currentTime: 0,
      duration: song.duration || 0,
      playbackError: null
    }));

    // Pause whichever backend was active before switching.
    if (activeBackendRef.current === 'audio' && audioRef.current) audioRef.current.pause();
    if (playerRef.current && activeBackendRef.current === 'youtube') {
      try { playerRef.current.stopVideo(); } catch { /* ignore */ }
    }

    // --- Audius path ---
    if (song.source === 'audius') {
      activeBackendRef.current = 'audio';
      const audio = audioRef.current;
      if (!audio) return;
      let url: string | undefined = song.audioUrl;
      if (!url) {
        const resolved = await musicAggregator.resolveAudio(song);
        url = resolved?.audioUrl;
      }
      if (!url) {
        setPlayerState(prev => ({
          ...prev,
          playbackError: `"${song.title}" non è riproducibile. Salto al successivo...`
        }));
        window.setTimeout(() => { playNextRef.current(); }, 700);
        return;
      }
      audio.src = url;
      audio.volume = playerStateRef.current.volume;
      audio.muted = playerStateRef.current.isMuted;
      try {
        await audio.play();
        startProgressUpdate();
      } catch (e) {
        console.error('PlayerContext: audio.play() rejected', e);
        setPlayerState(prev => ({
          ...prev,
          playbackError: `"${song.title}" non è riproducibile. Salto al successivo...`
        }));
        window.setTimeout(() => { playNextRef.current(); }, 700);
      }
      return;
    }

    // --- YouTube path ---
    // PRIMARY: try Piped for a direct audio URL. This bypasses Error 150
    // entirely and lets us play via <audio> with no embed restrictions.
    if (song.videoId) {
      console.log('PlayerContext: resolving Piped stream for', song.videoId);
      try {
        const piped = await pipedService.resolveAudioStream(song.videoId);
        if (piped && piped.url) {
          const audio = audioRef.current;
          if (audio) {
            activeBackendRef.current = 'audio';
            audio.src = piped.url;
            audio.volume = playerStateRef.current.volume;
            audio.muted = playerStateRef.current.isMuted;
            try {
              await audio.play();
              startProgressUpdate();
              console.log('PlayerContext: playing via Piped direct stream');
              return;
            } catch (e) {
              console.warn('PlayerContext: Piped stream rejected, falling back to IFrame', e);
            }
          }
        } else {
          console.warn('PlayerContext: Piped failed, falling back to YouTube IFrame');
        }
      } catch (e) {
        console.warn('PlayerContext: Piped error, falling back to YouTube IFrame', e);
      }
    }

    // FALLBACK: YouTube IFrame player. May Error 150 → skip to next song.
    activeBackendRef.current = 'youtube';
    if (!isPlayerReady.current) {
      console.log('PlayerContext: Player not ready, waiting...');
      setTimeout(() => { if (isPlayerReady.current) playSong(song); }, 1000);
      return;
    }
    if (playerRef.current) {
      console.log('PlayerContext: Loading YouTube video (IFrame):', song.videoId);
      playerRef.current.loadVideoById(song.videoId);
    }
  }, [startProgressUpdate]);

  const pauseSong = useCallback(() => {
    if (activeBackendRef.current === 'audio' && audioRef.current) {
      audioRef.current.pause();
      return;
    }
    if (playerRef.current && activeBackendRef.current === 'youtube') {
      playerRef.current.pauseVideo();
    }
    stopProgressUpdate();
  }, [stopProgressUpdate]);

  const resumeSong = useCallback(() => {
    if (activeBackendRef.current === 'audio' && audioRef.current) {
      audioRef.current.play().catch(() => {});
      return;
    }
    if (playerRef.current && activeBackendRef.current === 'youtube') {
      playerRef.current.playVideo();
    }
  }, []);

  const playNext = useCallback(() => {
    const q = queueRef.current;
    const idx = currentIndexRef.current;
    const ps = playerStateRef.current;
    if (q.length === 0) return;

    let nextIndex = idx + 1;
    if (ps.isShuffle) {
      nextIndex = Math.floor(Math.random() * q.length);
    } else if (nextIndex >= q.length) {
      nextIndex = ps.repeatMode === 'all' ? 0 : -1;
      if (nextIndex < 0) return;
    }
    setCurrentIndex(nextIndex);
    playSong(q[nextIndex]);
  }, [playSong]);

  const playPrevious = useCallback(() => {
    const ps = playerStateRef.current;
    let currentT = 0;
    if (activeBackendRef.current === 'audio' && audioRef.current) {
      currentT = audioRef.current.currentTime;
    } else if (playerRef.current && activeBackendRef.current === 'youtube') {
      try { currentT = playerRef.current.getCurrentTime(); } catch { /* ignore */ }
    }
    if (currentT > 3) { seekTo(0); return; }
    const q = queueRef.current;
    const idx = currentIndexRef.current;
    let prevIndex = idx - 1;
    if (prevIndex < 0) {
      prevIndex = ps.repeatMode === 'all' ? q.length - 1 : -1;
      if (prevIndex < 0) return;
    }
    setCurrentIndex(prevIndex);
    playSong(q[prevIndex]);
  }, [playSong, seekTo]);

  const setVolume = useCallback((volume: number) => {
    setPlayerState(prev => ({ ...prev, volume, isMuted: volume === 0 }));
    if (audioRef.current) { audioRef.current.volume = volume; audioRef.current.muted = volume === 0; }
    if (playerRef.current) { try { playerRef.current.setVolume(volume * 100); } catch { /* ignore */ } }
  }, []);

  const toggleMute = useCallback(() => {
    if (playerState.isMuted) {
      setVolume(playerState.volume || 0.5);
    } else {
      if (audioRef.current) audioRef.current.muted = true;
      if (playerRef.current) { try { playerRef.current.mute(); } catch { /* ignore */ } }
      setPlayerState(prev => ({ ...prev, isMuted: true }));
    }
  }, [playerState.isMuted, playerState.volume, setVolume]);

  const toggleShuffle = useCallback(() => {
    setPlayerState(prev => ({ ...prev, isShuffle: !prev.isShuffle }));
  }, []);

  const setRepeatMode = useCallback((mode: 'none' | 'all' | 'one') => {
    setPlayerState(prev => ({ ...prev, repeatMode: mode }));
  }, []);

  const dismissPlaybackError = useCallback(() => {
    setPlayerState(prev => ({ ...prev, playbackError: null }));
  }, []);

  const openNowPlaying = useCallback(() => setIsNowPlayingOpen(true), []);
  const closeNowPlaying = useCallback(() => setIsNowPlayingOpen(false), []);

  const handleSongEnd = useCallback(() => {
    const ps = playerStateRef.current;
    const q = queueRef.current;
    const idx = currentIndexRef.current;
    if (ps.repeatMode === 'one') {
      playSong(ps.currentSong!);
    } else if (idx < q.length - 1) {
      playNext();
    } else if (ps.repeatMode === 'all' && q.length > 0) {
      setCurrentIndex(0);
      playSong(q[0]);
    } else {
      setPlayerState(prev => ({ ...prev, isPlaying: false }));
      stopProgressUpdate();
    }
  }, [playSong, playNext, stopProgressUpdate]);

  /**
   * Handle a YouTube IFrame playback error (typically Error 150). With
   * Piped as the primary playback path, reaching here means both Piped
   * and the IFrame player failed → we just skip to the next song.
   */
  const handleYouTubeError = useCallback(() => {
    setPlayerState(prev => ({
      ...prev,
      playbackError:
        `"${prev.currentSong?.title ?? 'Brano'}" non è riproducibile. Salto al successivo...`
    }));
    const MAX_CONSECUTIVE_ERRORS = 8;
    if (consecutiveErrorCountRef.current > MAX_CONSECUTIVE_ERRORS) {
      setPlayerState(prev => ({
        ...prev,
        isPlaying: false,
        currentSong: null,
        playbackError: 'Troppe riproduzioni non disponibili di fila. La coda è stata interrotta.'
      }));
      stopProgressUpdate();
      return;
    }
    window.setTimeout(() => { playNextRef.current(); }, 700);
  }, [stopProgressUpdate]);

  useEffect(() => { playNextRef.current = playNext; }, [playNext]);
  useEffect(() => { handleSongEndRef.current = handleSongEnd; }, [handleSongEnd]);
  useEffect(() => { handleYouTubeErrorRef.current = handleYouTubeError; }, [handleYouTubeError]);

  // --- Frozen YouTube player event handlers (registered once) ---
  const onPlayerStateChange = useCallback((event: any) => {
    const state = event.data;
    console.log('PlayerContext: YT player state changed to:', state);
    if (state === (window as any).YT.PlayerState.PLAYING) {
      consecutiveErrorCountRef.current = 0;
      setPlayerState(prev => ({ ...prev, isPlaying: true, playbackError: null }));
      startProgressUpdate();
    } else if (state === (window as any).YT.PlayerState.PAUSED) {
      setPlayerState(prev => ({ ...prev, isPlaying: false }));
      stopProgressUpdate();
    } else if (state === (window as any).YT.PlayerState.ENDED) {
      handleSongEndRef.current();
    }
  }, [startProgressUpdate, stopProgressUpdate]);

  const onPlayerError = useCallback((event: any) => {
    if (activeBackendRef.current !== 'youtube') return;
    console.error('PlayerContext: YouTube Player Error:', event.data);
    consecutiveErrorCountRef.current += 1;
    handleYouTubeErrorRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setQueue = useCallback((songs: Song[], startIndex?: number) => {
    console.log('PlayerContext: Setting queue with', songs.length, 'songs');
    setQueueState(songs);
    const idx = typeof startIndex === 'number' && startIndex >= 0 && startIndex < songs.length
      ? startIndex : 0;
    setCurrentIndex(idx);
  }, []);

  const addToQueue = useCallback((song: Song) => {
    setQueueState(prev => [...prev, song]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueueState(prev => prev.filter((_, i) => i !== index));
    if (index === currentIndex) {
      setPlayerState(prev => ({ ...prev, currentSong: null, isPlaying: false }));
      stopProgressUpdate();
    } else if (index < currentIndex) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex, stopProgressUpdate]);

  const clearQueue = useCallback(() => {
    setQueueState([]);
    setCurrentIndex(-1);
    setPlayerState(prev => ({ ...prev, currentSong: null, isPlaying: false }));
    stopProgressUpdate();
  }, [stopProgressUpdate]);

  const value: PlayerContextType = {
    ...playerState,
    playSong, pauseSong, resumeSong, playNext, playPrevious,
    setVolume, toggleMute, toggleShuffle, setRepeatMode, seekTo,
    setQueue, addToQueue, removeFromQueue, clearQueue, dismissPlaybackError,
    queue, currentIndex, isNowPlayingOpen, openNowPlaying, closeNowPlaying
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <div id="youtube-player" style={{ display: 'none' }}></div>
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
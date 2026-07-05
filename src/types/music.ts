export type SongSource = 'youtube' | 'audius' | 'itunes';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  thumbnail: string;
  videoId: string;
  /** Which catalog this track came from. */
  source: SongSource;
  /**
   * Direct, playable audio URL for sources that provide one (Audius full
   * stream, iTunes 30s preview). Empty/undefined for YouTube (uses the
   * IFrame player by videoId).
   */
  audioUrl?: string;
  /** True when audioUrl is a full track rather than a short preview. */
  isPreview?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  songs: Song[];
}

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'none' | 'all' | 'one';
  /** Friendly message set when the current track can't be played. */
  playbackError: string | null;
}

export interface SearchResult {
  songs: Song[];
  playlists: Playlist[];
}
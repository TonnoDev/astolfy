import axios from 'axios';
import { Song, SearchResult, Playlist } from '../types/music';

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || 'YOUR_YOUTUBE_API_KEY';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export class YouTubeMusicService {
  private apiKey: string;

  constructor(apiKey: string = YOUTUBE_API_KEY) {
    this.apiKey = apiKey;
  }

  /**
   * Enriches the given video IDs with accurate durations (and could
   * expose embeddability info) via the videos.list endpoint. We do NOT
   * filter out non-embeddable videos here: the user explicitly wants to
   * see and choose everything. Non-playable videos surface a friendly
   * error in the player UI instead of being silently hidden.
   */
  private async fetchVideoMetadata(
    ids: string[]
  ): Promise<Map<string, { duration: number; embeddable: boolean; licensedContent: boolean }>> {
    const result = new Map<string, { duration: number; embeddable: boolean; licensedContent: boolean }>();
    if (ids.length === 0) return result;

    try {
      const response = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
        params: {
          part: 'contentDetails,status',
          id: ids.join(','),
          key: this.apiKey
        }
      });

      const data = response.data as any;
      for (const item of data.items || []) {
        result.set(item.id, {
          duration: this.parseDuration(item.contentDetails?.duration || ''),
          embeddable: item.status?.embeddable === true,
          licensedContent: item.status?.license === 'creativeCommon' ? false : true
        });
      }
    } catch (error) {
      console.error('Error fetching video metadata:', error);
    }
    return result;
  }

  async searchSongs(query: string): Promise<Song[]> {
    try {
      const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
        params: {
          part: 'snippet',
          q: `${query} music`,
          type: 'video',
          videoCategoryId: '10', // Music category
          maxResults: 25,
          key: this.apiKey
        }
      });

      const data = response.data as any;
      const rawSongs: Song[] = (data.items || []).map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        album: '',
        duration: 0,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        videoId: item.id.videoId
      }));

      // Enrich with real durations. We intentionally do NOT hide videos
      // that are non-embeddable — the user wants to see everything.
      const ids = rawSongs.map(s => s.videoId);
      const meta = await this.fetchVideoMetadata(ids);
      return rawSongs.map(s => ({
        ...s,
        source: 'youtube',
        audioUrl: '',
        isPreview: false,
        duration: meta.get(s.videoId)?.duration ?? 0
      }));
    } catch (error) {
      console.error('Error searching songs:', error);
      return [];
    }
  }

  async getVideoDetails(videoId: string): Promise<{ duration: number }> {
    try {
      const response = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
        params: {
          part: 'contentDetails',
          id: videoId,
          key: this.apiKey
        }
      });

      const data = response.data as any;
      if (data.items && data.items.length > 0) {
        const duration = this.parseDuration(data.items[0].contentDetails.duration);
        return { duration };
      }
      return { duration: 0 };
    } catch (error) {
      console.error('Error getting video details:', error);
      return { duration: 0 };
    }
  }

  async getTrendingSongs(): Promise<Song[]> {
    try {
      const response = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
        params: {
          part: 'snippet,contentDetails,status',
          chart: 'mostPopular',
          videoCategoryId: '10',
          maxResults: 25,
          key: this.apiKey
        }
      });

      const data = response.data as any;
      // Show all trending videos (no embeddability filtering).
      return (data.items || []).map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        album: '',
        duration: this.parseDuration(item.contentDetails.duration),
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        videoId: item.id,
        source: 'youtube' as const,
        audioUrl: '',
        isPreview: false
      }));
    } catch (error) {
      console.error('Error getting trending songs:', error);
      return [];
    }
  }

  private parseDuration(duration: string): number {
    // YouTube returns duration in PT1M30S format
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;

    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');

    let totalSeconds = 0;
    if (hours) totalSeconds += parseInt(hours) * 3600;
    if (minutes) totalSeconds += parseInt(minutes) * 60;
    if (seconds) totalSeconds += parseInt(seconds);

    return totalSeconds;
  }
}

export const youtubeMusicService = new YouTubeMusicService();
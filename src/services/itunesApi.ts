import axios from 'axios';
import { Song } from '../types/music';

/**
 * iTunes Search API service.
 *
 * Fully public (no API key) and great for metadata + 30-second previews.
 * Catalog coverage is huge (essentially all commercially-released music).
 *
 * Docs: https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
 *
 * We use it to:
 *   - Provide rich song metadata (album, high-res artwork, real duration)
 *   - Provide a 30-second m4a preview URL that always plays (no embed
 *     restrictions) — useful as a guaranteed-playable fallback.
 */
export class ITunesService {
  private base = 'https://itunes.apple.com';

  async searchTracks(query: string, limit = 20): Promise<Song[]> {
    if (!query.trim()) return [];
    try {
      const resp = await axios.get(`${this.base}/search`, {
        params: {
          term: query,
          media: 'music',
          entity: 'song',
          limit
        },
        timeout: 7000
      });
      const data = resp.data as any;
      const results = (data && data.results) || [];
      return results.map((r: any) => this.mapResult(r));
    } catch (e) {
      console.error('ITunesService: searchTracks failed:', e);
      return [];
    }
  }

  /**
   * Trending via iTunes is approximated by using the "Top Songs" RSS feed.
   * https://rss.applemarketingtools.com
   */
  async getTopSongs(limit = 20): Promise<Song[]> {
    // The Apple Marketing Tools RSS endpoint does NOT send CORS headers,
    // so direct browser requests fail. We route it through a public CORS
    // proxy. If that fails, we fall back gracefully (Home just shows fewer
    // trending items from the other sources).
    const rssUrl =
      'https://rss.applemarketingtools.com/api/v2/us/music/most-played/25/songs.json';
    const proxies = [
      (u: string) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
      (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      (u: string) => u // last resort: direct (will fail CORS, but try)
    ];

    for (const makeUrl of proxies) {
      try {
        const resp = await axios.get(makeUrl(rssUrl), { timeout: 8000 });
        const data = resp.data as any;
        const feed = (data && data.feed) || {};
        const results = feed.results || [];
        if (results.length > 0) {
          return results.slice(0, limit).map((r: any) => this.mapRssResult(r));
        }
      } catch (e) {
        // try next proxy
        continue;
      }
    }
    console.warn('ITunesService: getTopSongs failed on all proxies');
    return [];
  }

  private mapResult(r: any): Song {
    return {
      id: `itunes-${r.trackId || r.collectionId}`,
      title: r.trackName || 'Unknown',
      artist: r.artistName || 'Unknown Artist',
      album: r.collectionName || '',
      duration: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : 0,
      thumbnail:
        (r.artworkUrl100 || r.artworkUrl60 || '').replace('100x100', '300x300'),
      videoId: '',
      source: 'itunes',
      audioUrl: r.previewUrl || '',
      isPreview: true
    };
  }

  private mapRssResult(r: any): Song {
    return {
      id: `itunes-${r.id}`,
      title: r.name || 'Unknown',
      artist: r.artistName || 'Unknown Artist',
      album: r.collectionName || '',
      duration: r.durationInMillis ? Math.round(r.durationInMillis / 1000) : 0,
      thumbnail: (r.artworkUrl100 || '').replace('100x100', '300x300'),
      videoId: '',
      source: 'itunes',
      audioUrl: r.previewUrl || '',
      isPreview: true
    };
  }
}

export const itunesService = new ITunesService();
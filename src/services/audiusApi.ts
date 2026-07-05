import axios from 'axios';
import { Song } from '../types/music';

/**
 * Audius music API service.
 *
 * Audius is a decentralized music protocol with a fully free, public REST
 * API that returns DIRECT, streamable audio URLs (no embed restrictions,
 * no Content ID blocks — playback always works).
 *
 * Docs: https://docs.audius.org
 *
 * Flow:
 *   1. Fetch the list of healthy discovery nodes from https://api.audius.co
 *   2. Use one of them as the base for /v1/tracks/search and /v1/tracks/{id}/stream
 *
 * The catalog skews electronic/indie/hip-hop — great as a complement to
 * YouTube for tracks that YouTube refuses to embed (Error 150).
 */
export class AudiusService {
  private host: string | null = null;
  private hostsFallback = [
    'https://discoveryprovider.audius.co',
    'https://audius-discovery-1.altego.net',
    'https://discoveryprovider2.audius.co',
    'https://discoveryprovider3.audius.co'
  ];

  /**
   * Pick a healthy Audius discovery node.
   *
   * The official /host list sometimes returns nodes that are up but then
   * refuse artwork/stream requests (ERR_CONNECTION_REFUSED). We probe each
   * candidate with a tiny HEAD-ish request and pick the first that answers.
   */
  async ensureHost(): Promise<string> {
    if (this.host) return this.host;

    // Build candidate list.
    const candidates: string[] = [];
    try {
      const resp = await axios.get('https://api.audius.co', { timeout: 4000 });
      const data = resp.data as string[];
      if (Array.isArray(data) && data.length > 0) {
        // Shuffle for load balancing but keep deterministic fallbacks too.
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        candidates.push(...shuffled);
      }
    } catch (e) {
      console.warn('AudiusService: / host list unavailable, using fallback list');
    }
    // Always append hardcoded fallbacks (deduped).
    for (const h of this.hostsFallback) {
      if (!candidates.includes(h)) candidates.push(h);
    }

    // Probe candidates in order; keep first that responds.
    for (const c of candidates) {
      try {
        await axios.get(`${c}/v1/health`, {
          timeout: 3000,
          // We just need it to respond; data shape doesn't matter.
        });
        this.host = c;
        return this.host;
      } catch {
        // try next
        continue;
      }
    }

    // Should not normally happen, but return the first fallback so callers
    // at least get *something* (they handle failures individually).
    this.host = this.hostsFallback[0];
    return this.host;
  }

  /** Build a Song[] from raw Audius track objects. */
  private mapTracks(items: any[]): Song[] {
    return (items || [])
      .filter((t: any) => t && t.is_streamable !== false)
      .map((t: any) => ({
        id: `audius-${t.id}`,
        title: t.title || 'Unknown',
        artist:
          (t.user && (t.user.name || t.user.handle)) || 'Unknown Artist',
        album: t.playlist_name || t.album || '',
        duration: typeof t.duration === 'number' ? Math.round(t.duration) : 0,
        thumbnail:
          (t.artwork && (t.artwork['480x480'] || t.artwork['150x150'])) ||
          (t.user && t.user.profile_picture && (t.user.profile_picture['150x150'])) ||
          '',
        videoId: '',
        source: 'audius' as const,
        audioUrl: '', // lazily resolved on play via streamUrl
        isPreview: false,
        // Stash the raw id for stream URL construction.
        _audiusId: t.id
      } as any));
  }

  async searchTracks(query: string, limit = 20): Promise<Song[]> {
    if (!query.trim()) return [];
    try {
      const host = await this.ensureHost();
      const resp = await axios.get(`${host}/v1/tracks/search`, {
        params: { query, app_name: 'astolfy' },
        timeout: 7000
      });
      const data = resp.data as any;
      const items = (data && data.data) || [];
      return this.mapTracks(items).slice(0, limit);
    } catch (e) {
      console.error('AudiusService: searchTracks failed:', e);
      return [];
    }
  }

  async getTrending(limit = 20): Promise<Song[]> {
    try {
      const host = await this.ensureHost();
      const resp = await axios.get(`${host}/v1/tracks/trending`, {
        params: { app_name: 'astolfy', time: 'week', genre: 'All' },
        timeout: 7000
      });
      const data = resp.data as any;
      const items = (data && data.data) || [];
      return this.mapTracks(items).slice(0, limit);
    } catch (e) {
      console.error('AudiusService: getTrending failed:', e);
      return [];
    }
  }

  /**
   * Resolve a direct, streamable URL for a track. Audius redirects this
   * endpoint to the actual audio file (mp3). We return the URL and let
   * an <audio> element play it.
   */
  async getStreamUrl(trackId: string): Promise<string | null> {
    try {
      const host = await this.ensureHost();
      // Audius stream endpoint returns a 302 redirect to the mp3 — for an
      // <audio> tag we can just pass this URL directly because the browser
      // follows redirects.
      return `${host}/v1/tracks/${trackId}/stream?app_name=astolfy`;
    } catch (e) {
      console.error('AudiusService: getStreamUrl failed:', e);
      return null;
    }
  }

  /**
   * Given a Song whose audioUrl was lazily empty, fill it in. Returns the
   * same Song reference (mutated) for convenience, or null on failure.
   */
  async resolveStreamUrl(song: Song): Promise<Song | null> {
    if (song.audioUrl) return song;
    const audiusId = (song as any)._audiusId;
    if (!audiusId) return null;
    const url = await this.getStreamUrl(audiusId);
    if (!url) return null;
    (song as any).audioUrl = url;
    return song;
  }
}

export const audiusService = new AudiusService();
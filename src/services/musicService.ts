import { Song } from '../types/music';
import { youtubeMusicService } from './youtubeMusicApi';
import { audiusService } from './audiusApi';

/**
 * Aggregator that merges results from free music sources that provide
 * FULL-TRACK streaming (no 30-second previews):
 *
 *   - YouTube : long-tail, official videos, full tracks
 *               (some videos hit Error 150 — see findAlternativeFor())
 *   - Audius  : full streaming, indie/electronic/hip-hop (always plays)
 *
 * iTunes is intentionally NOT used for search/trending because it only
 * provides 30s previews. The user wants full songs, not previews.
 *
 * Results are deduplicated by normalized (artist + title) so we don't
 * show the same song twice.
 */

const normalize = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s]/g, '')     // strip punctuation
    .replace(/\b(official|audio|video|lyrics?|hd|hq|mv|m\/v|full|explicit|clean)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const dedupeKey = (s: Song) => `${normalize(s.artist)}::${normalize(s.title)}`;

/**
 * Merge multiple result sets, dedupe by artist+title, and interleave so
 * the user sees a healthy mix of sources instead of 25 YouTube then 20
 * Audius.
 */
function mergeAndDedupe(buckets: Song[][]): Song[] {
  const seen = new Set<string>();
  const merged: Song[] = [];
  const maxLen = Math.max(...buckets.map(b => b.length), 0);

  // Round-robin interleave: take one from each bucket per round.
  for (let i = 0; i < maxLen; i++) {
    for (const bucket of buckets) {
      const song = bucket[i];
      if (!song) continue;
      const key = dedupeKey(song);
      // Avoid duplicate uploads of the same track.
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(song);
    }
  }
  return merged;
}

export class MusicAggregator {
  /**
   * Search full-track sources in parallel and return merged, deduped results.
   * (iTunes previews are excluded — user wants full songs, not 30s clips.)
   * If a source fails it's simply skipped.
   */
  async searchAll(query: string): Promise<Song[]> {
    const [yt, audius] = await Promise.all([
      youtubeMusicService.searchSongs(query).catch(() => [] as Song[]),
      audiusService.searchTracks(query).catch(() => [] as Song[])
    ]);

    return mergeAndDedupe([yt, audius]);
  }

  /**
   * Get trending from full-track sources.
   */
  async getTrendingAll(): Promise<Song[]> {
    const [yt, audius] = await Promise.all([
      youtubeMusicService.getTrendingSongs().catch(() => [] as Song[]),
      audiusService.getTrending().catch(() => [] as Song[])
    ]);

    return mergeAndDedupe([yt, audius]);
  }

  /**
   * Find an alternative, embeddable version of a song that returned
   * YouTube Error 150 (embedding restricted on the official video).
   *
   * Strategy: search YouTube again with a query biased toward
   * user-uploaded "audio"/"lyrics"/"cover" versions, which are far less
   * likely to be restricted from embedding. Returns the FIRST result
   * that is NOT the same videoId as the one that failed.
   *
   * Returns null if no alternative is found.
   */
  async findAlternativeFor(song: Song): Promise<Song | null> {
    // Build a search query biased toward less-restricted uploads.
    const baseArtist = (song.artist || '').split(/[,&+]|\bfeat\b/i)[0].trim();
    const baseTitle = (song.title || '')
      .replace(/\(official.*\)/i, '')
      .replace(/\[official.*\]/i, '')
      .replace(/official (music )?video/i, '')
      .replace(/-.*$/i, '')
      .trim();
    const queries = [
      `${baseArtist} ${baseTitle} audio`,
      `${baseArtist} ${baseTitle} lyrics`,
      `${baseArtist} ${baseTitle} cover`,
      `${baseArtist} ${baseTitle}`
    ];

    for (const q of queries) {
      try {
        const results = await youtubeMusicService.searchSongs(q);
        const alt = results.find(r => r.videoId && r.videoId !== song.videoId);
        if (alt) {
          console.log('MusicAggregator: alternative found for', song.title, '->', alt.title);
          return alt;
        }
      } catch {
        // try next query
      }
    }
    return null;
  }

  /**
   * Resolve a lazily-resolved stream URL (used for Audius tracks whose
   * audioUrl is empty until first play). Returns the Song with audioUrl
   * populated, or null if it can't be resolved.
   */
  async resolveAudio(song: Song): Promise<Song | null> {
    if (song.source === 'audius') {
      return audiusService.resolveStreamUrl(song);
    }
    // YouTube already carries its full playable videoId.
    return song;
  }
}

export const musicAggregator = new MusicAggregator();
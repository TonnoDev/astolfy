import axios from 'axios';

/**
 * Piped API service.
 *
 * Piped (https://github.com/TeamPiped/Piped) is an open-source alternative
 * YouTube frontend. Its public API exposes DIRECT audio stream URLs for
 * any YouTube video — with NO embedding restrictions, NO Content-ID blocks,
 * and NO Error 150. We use it to play the FULL track via an <audio> element,
 * bypassing the YouTube IFrame embed entirely.
 *
 * Public instance list: https://piped-instances.kavin.rocks/
 *
 * Flow:
 *   GET {instance}/streams/{videoId}
 *     → JSON with `audioStreams[]`, each having a direct `url`
 *
 * We pick the highest-bitrate stream and hand it to <audio>.
 *
 * If every instance is down or rate-limited, callers fall back to the
 * YouTube IFrame player (which may then Error 150 — handled separately).
 */

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.leptons.xyz',
  'https://pipedapi.r4fo.com',
  'https://pipedapi.tokhmi.xyz',
  'https://api.piped.private.coffee',
  'https://pipedapi.darkness.services'
];

export interface PipedStreamResult {
  url: string;
  mimeType: string;
  bitrate: number;
}

export class PipedService {
  /**
   * Resolve a direct audio-stream URL for a YouTube videoId. Tries each
   * known instance in turn until one returns a usable stream.
   *
   * Returns null if all instances fail — caller should then fall back to
   * the YouTube IFrame player.
   */
  async resolveAudioStream(videoId: string): Promise<PipedStreamResult | null> {
    if (!videoId) return null;

    // Iterate instances in parallel-friendly order but sequentially to
    // avoid hammering them all at once. First success wins.
    for (const instance of PIPED_INSTANCES) {
      try {
        const resp = await axios.get(`${instance}/streams/${videoId}`, {
          timeout: 5000,
          // Some instances are picky about headers.
          headers: { Accept: 'application/json' }
        });
        const data = resp.data as any;

        // Piped responses include `audioStreams` (array) and sometimes a
        // `hls` manifest. We want the plain progressive audio URL.
        const streams: any[] = (data && data.audioStreams) || [];
        if (!Array.isArray(streams) || streams.length === 0) continue;

        // Prefer M4A (better compatibility with <audio> than OPUS on
        // Safari/iOS), otherwise fall back to OPUS. Sort by bitrate desc.
        const playable = streams
          .filter(s => s && s.url && (s.mimeType || '').startsWith('audio/'))
          .sort((a, b) => {
            const aIsM4a = (a.mimeType || '').includes('mp4');
            const bIsM4a = (b.mimeType || '').includes('mp4');
            if (aIsM4a && !bIsM4a) return -1;
            if (!aIsM4a && bIsM4a) return 1;
            return (b.bitrate || 0) - (a.bitrate || 0);
          });

        const best = playable[0];
        if (best && best.url) {
          console.log('PipedService: resolved stream for', videoId, 'via', instance);
          return {
            url: best.url,
            mimeType: best.mimeType || 'audio/mp4',
            bitrate: best.bitrate || 0
          };
        }
      } catch (e) {
        // Instance down / rate-limited / blocked → try the next.
        continue;
      }
    }

    console.warn('PipedService: no instance returned a stream for', videoId);
    return null;
  }

  /**
   * Search YouTube via a Piped instance (avoids needing the official
   * Data API + key). Returns minimal metadata: videoId, title, uploader.
   * Used as a robust fallback for searches.
   */
  async search(query: string): Promise<
    Array<{ videoId: string; title: string; uploader: string; thumbnail: string; duration: number }>
  > {
    for (const instance of PIPED_INSTANCES) {
      try {
        const resp = await axios.get(`${instance}/search`, {
          params: { q: query, filter: 'music_songs' },
          timeout: 6000,
          headers: { Accept: 'application/json' }
        });
        const items = ((resp.data as any) && (resp.data as any).items) || [];
        return items
          .filter((it: any) => it && it.url && it.url.startsWith('/watch'))
          .map((it: any) => ({
            videoId: (it.url || '').replace('/watch?v=', ''),
            title: it.title || 'Unknown',
            uploader: it.uploaderName || 'Unknown',
            thumbnail: it.thumbnail || '',
            duration: it.duration || 0
          }))
          .filter((s: any) => s.videoId);
      } catch {
        continue;
      }
    }
    return [];
  }
}

export const pipedService = new PipedService();
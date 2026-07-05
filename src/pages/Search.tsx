import React, { useState, useEffect, useRef } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonSearchbar,
  IonSpinner,
  IonText,
  IonCard,
  IonCardContent
} from '@ionic/react';
import { usePlayer } from '../context/PlayerContext';
import { musicAggregator } from '../services/musicService';
import { Song } from '../types/music';
import SongCard from '../components/SongCard';
import './Search.css';

const Search: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { playSong, setQueue } = usePlayer();

  // Debounce timer + race-condition guard for async searches.
  const searchTimerRef = useRef<number | null>(null);
  const lastRequestIdRef = useRef(0);

  /**
   * Update the controlled input value IMMEDIATELY on every keystroke.
   *
   * The previous implementation used IonSearchbar's `debounce={800}` prop,
   * which delays the `onIonInput` event entirely. Because the searchbar is
   * a CONTROLLED component (value={searchQuery}), the state only updates
   * after the debounced event fires — so during typing React keeps
   * re-rendering with the OLD value and the input visibly "eats" the
   * characters the user is typing. Symptoms: typed text disappears and
   * reappears when backspacing.
   *
   * Fix: keep `onIonInput` un-debounced (instant state update) and move
   * the debouncing to a separate effect that only gates the expensive
   * API call.
   */
  const handleInputChange = (e: any) => {
    const value = e.detail.value ?? '';
    setSearchQuery(value);
  };

  // Debounced search effect: runs whenever searchQuery changes.
  useEffect(() => {
    // Cancel any pending debounced search.
    if (searchTimerRef.current !== null) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }

    const q = searchQuery.trim();

    // Too short → clear results, no API call.
    if (q.length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      setError(null);
      setLoading(false);
      return;
    }

    // Mark as searching immediately for responsive UI.
    setLoading(true);
    setHasSearched(true);
    setError(null);

    // Issue a new request id so stale responses are ignored.
    const requestId = ++lastRequestIdRef.current;

    searchTimerRef.current = window.setTimeout(async () => {
      try {
        const results = await musicAggregator.searchAll(q);
        // Ignore if a newer search has been issued meanwhile.
        if (requestId !== lastRequestIdRef.current) return;

        setSearchResults(results);
        if (results.length === 0) {
          setError('No results found. Try different keywords.');
        }
      } catch (err: any) {
        if (requestId !== lastRequestIdRef.current) return;
        console.error('Error searching songs:', err);
        setError(err.message || 'Failed to search. Please try again.');
        setSearchResults([]);
      } finally {
        if (requestId === lastRequestIdRef.current) {
          setLoading(false);
        }
      }
    }, 600);

    return () => {
      if (searchTimerRef.current !== null) {
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }
    };
  }, [searchQuery]);

  const handlePlaySong = (song: Song) => {
    console.log('Playing song:', song);
    // Find the index of the clicked song so the queue starts from it
    // (makes playNext/playPrevious and auto-skip-on-error behave correctly).
    const startIndex = searchResults.findIndex(s => s.id === song.id);
    setQueue(searchResults, startIndex >= 0 ? startIndex : 0);
    playSong(song);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>🔍 Search</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">🔍 Search</IonTitle>
          </IonToolbar>
        </IonHeader>

        <div className="search-content">
          {/* Search Bar */}
          <div className="search-bar-container">
            <IonSearchbar
              value={searchQuery}
              onIonInput={handleInputChange}
              placeholder="Search for songs, artists..."
              animated={true}
              show-clear-button="focus"
              onIonClear={() => {
                setSearchQuery('');
              }}
            />
          </div>

          {/* Search Results */}
          <div className="search-results">
            {loading && (
              <div className="loading-container">
                <IonSpinner name="crescent" color="secondary" />
                <p>Searching...</p>
              </div>
            )}

            {error && !loading && (
              <div className="error-container">
                <IonCard color="warning">
                  <IonCardContent>
                    <p>⚠️ {error}</p>
                  </IonCardContent>
                </IonCard>
              </div>
            )}

            {!loading && !error && hasSearched && searchResults.length === 0 && (
              <div className="no-results">
                <p>No results found for "{searchQuery}"</p>
                <p>Try different keywords</p>
              </div>
            )}

            {!loading && searchResults.length > 0 && (
              <div className="results-section">
                <IonText>
                  <h3>Results for "{searchQuery}"</h3>
                </IonText>
                <div className="songs-grid">
                  {searchResults.map((song) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      onPlay={handlePlaySong}
                    />
                  ))}
                </div>
              </div>
            )}

            {!hasSearched && !loading && (
              <div className="search-placeholder">
                <IonText>
                  <h2 className="text-2xl font-bold text-primary mb-2">🎵 Find Your Music</h2>
                  <p className="text-sm text-medium">Search for your favorite songs, artists, or albums</p>
                  <p className="search-tips mt-4">
                    <strong>Tips:</strong><br/>
                    • Search by artist name<br/>
                    • Search by song title<br/>
                    • Use specific keywords for better results
                  </p>
                </IonText>
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Search;
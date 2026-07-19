import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonSpinner,
  IonText,
  IonRefresher,
  IonRefresherContent,
  RefresherEventDetail
} from '@ionic/react';
import { refresh } from 'ionicons/icons';
import { usePlayer } from '../context/PlayerContext';
import { musicAggregator } from '../services/musicService';
import { Song } from '../types/music';
import SongCard from '../components/SongCard';
import astolfyLogo from '../assets/astolfyLogo.png';
import './Home.css';

/**
 * Genres offered in the Home "Trending" filter chip row.
 *
 * "All" defers to the plain global trending chart; the others are routed
 * through MusicAggregator.getTrendingByGenre() which combines Audius'
 * native genre chart with a YouTube genre search.
 */
const GENRES: string[] = [
  'All',
  'Pop',
  'Hip-Hop',
  'Rock',
  'Metal',
  'Electronic',
  'Dance & EDM',
  'R&B',
  'Latin',
  'Jazz',
  'Classical',
  'Reggae',
  'Country',
  'Ambient',
  'Lo-fi'
];

const Home: React.FC = () => {
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const { playSong, setQueue } = usePlayer();

  const loadTrendingSongs = async (genre: string = 'All') => {
    try {
      setLoading(true);
      const songs = await musicAggregator.getTrendingByGenre(genre);
      setTrendingSongs(songs);
    } catch (error) {
      console.error('Error loading trending songs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrendingSongs(selectedGenre);
  }, [selectedGenre]);

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    await loadTrendingSongs(selectedGenre);
    event.detail.complete();
  };

  const handleGenreChange = (genre: string) => {
    setSelectedGenre(genre);
  };

  const handlePlaySong = (song: Song) => {
    // Start the queue from the clicked song so playNext/playPrevious
    // and auto-skip-on-error behave correctly.
    const startIndex = trendingSongs.findIndex(s => s.id === song.id);
    setQueue(trendingSongs, startIndex >= 0 ? startIndex : 0);
    playSong(song);
  };

  const handlePlayAll = () => {
    if (trendingSongs.length > 0) {
      setQueue(trendingSongs);
      playSong(trendingSongs[0]);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            <div className="flex flex-row items-center gap-2">
            <img src={astolfyLogo} width="35" height="35" alt="Astolfy Logo" className="logo" />
            Astolfy Player
            </div>
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">🎵 Astolfy</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent
            pullingIcon={refresh}
            pullingText="Pull to refresh"
            refreshingSpinner="circles"
            refreshingText="Refreshing..."
          />
        </IonRefresher>

        <div className="home-content">
          {/* Welcome Section */}
          <div className="welcome-section">
            <IonText>
              <h2>Welcome to Astolfy Music</h2>
              <p>Discover and enjoy music from YouTube</p>
            </IonText>
          </div>

          {/* Genre Filters */}
          <div className="genre-filters-container">
            <div className="genre-filters">
              {GENRES.map((genre) => (
                <button
                  key={genre}
                  className={`genre-chip ${selectedGenre === genre ? 'active' : ''}`}
                  onClick={() => handleGenreChange(genre)}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Trending Section */}
          <div className="trending-section">
            <div className="section-header">
              <IonText>
                <h3>{selectedGenre === 'All' ? 'Trending Now' : `Trending ${selectedGenre}`}</h3>
              </IonText>
              {trendingSongs.length > 0 && (
                <button className="play-all-button" onClick={handlePlayAll}>
                  Play All
                </button>
              )}
            </div>

            {loading ? (
              <div className="loading-container">
                <IonSpinner name="crescent" color="secondary" />
                <p>Loading trending songs...</p>
              </div>
            ) : (
              <div className="songs-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {trendingSongs.length > 0 ? (
                  trendingSongs.map((song) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      onPlay={handlePlaySong}
                    />
                  ))
                ) : (
                  <div className="no-songs">
                    <p>No songs available</p>
                    <p>Make sure you have a valid YouTube API key configured</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
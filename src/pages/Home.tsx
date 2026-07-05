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
import './Home.css';

const Home: React.FC = () => {
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const { playSong, setQueue } = usePlayer();

  const loadTrendingSongs = async () => {
    try {
      setLoading(true);
      const songs = await musicAggregator.getTrendingAll();
      setTrendingSongs(songs);
    } catch (error) {
      console.error('Error loading trending songs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrendingSongs();
  }, []);

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    await loadTrendingSongs();
    event.detail.complete();
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
          <IonTitle>🎵 Astolfy Player</IonTitle>
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

          {/* Trending Section */}
          <div className="trending-section">
            <div className="section-header">
              <IonText>
                <h3>Trending Now</h3>
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
              <div className="songs-grid">
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
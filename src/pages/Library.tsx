import React from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonText,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonThumbnail
} from '@ionic/react';
import { trash, play, closeCircle } from 'ionicons/icons';
import { usePlayer } from '../context/PlayerContext';
import { Song } from '../types/music';
import SongCard from '../components/SongCard';
import './Library.css';

const Library: React.FC = () => {
  const {
    queue,
    currentIndex,
    currentSong,
    isPlaying,
    playSong,
    pauseSong,
    resumeSong,
    clearQueue,
    removeFromQueue
  } = usePlayer();

  const handlePlaySong = (song: Song, index: number) => {
    playSong(song);
  };

  const handleRemoveFromQueue = (index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    removeFromQueue(index);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>📚 Library</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">📚 Library</IonTitle>
          </IonToolbar>
        </IonHeader>

        <div className="library-content">
          {/* Current Playing Section */}
          {currentSong && (
            <div className="current-playing-section">
              <IonText>
                <h3>Now Playing</h3>
              </IonText>
              <div className="current-song-card">
                <SongCard song={currentSong} onPlay={() => {}} showArtist={true} />
                <div className="current-song-controls">
                  <IonButton
                    fill="solid"
                    color={isPlaying ? 'secondary' : 'primary'}
                    onClick={isPlaying ? pauseSong : resumeSong}
                  >
                    <IonIcon icon={play} slot="start" />
                    {isPlaying ? 'Pause' : 'Play'}
                  </IonButton>
                </div>
              </div>
            </div>
          )}

          {/* Queue Section */}
          <div className="queue-section">
            <div className="queue-header">
              <IonText>
                <h3>
                  Queue {queue.length > 0 && `(${queue.length} songs)`}
                </h3>
              </IonText>
              {queue.length > 0 && (
                <IonButton fill="clear" color="danger" onClick={clearQueue}>
                  <IonIcon icon={trash} slot="icon-only" />
                </IonButton>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="empty-queue">
                <IonText>
                  <p>🎵 Your queue is empty</p>
                  <p>Search for songs or browse trending to add music</p>
                </IonText>
              </div>
            ) : (
              <div className="queue-list">
                {queue.map((song, index) => (
                  <div
                    key={`${song.id}-${index}`}
                    className={`queue-item ${index === currentIndex ? 'current' : ''}`}
                    onClick={() => handlePlaySong(song, index)}
                  >
                    <div className="queue-item-info">
                      <span className="queue-index">
                        {index === currentIndex ? (
                          <IonIcon icon={play} color="secondary" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <IonThumbnail slot="start" className="queue-thumbnail">
                        <img src={song.thumbnail} alt={song.title} />
                      </IonThumbnail>
                      <div className="queue-item-details">
                        <IonText className="queue-song-title">
                          <h4>{song.title}</h4>
                        </IonText>
                        <IonText className="queue-song-artist">
                          <p>{song.artist}</p>
                        </IonText>
                      </div>
                    </div>
                    <IonButton
                      fill="clear"
                      color="medium"
                      onClick={(e) => handleRemoveFromQueue(index, e)}
                      className="remove-button"
                    >
                      <IonIcon icon={closeCircle} />
                    </IonButton>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="library-info">
            <IonText color="medium">
              <p className="info-text">
                💡 Tip: Songs are automatically added to your queue when you play them from Home or Search
              </p>
            </IonText>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Library;
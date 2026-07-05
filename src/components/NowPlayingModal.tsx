import React, { useState, useEffect } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonText,
  IonRange,
  IonCard,
  IonContent
} from '@ionic/react';
import {
  play,
  pause,
  playSkipBack,
  playSkipForward,
  shuffle,
  repeat,
  repeatOutline,
  volumeHigh,
  volumeMute,
  heart,
  heartOutline,
  list,
  chevronDown
} from 'ionicons/icons';
import { usePlayer } from '../context/PlayerContext';
import './NowPlayingModal.css';

const NowPlayingModal: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    pauseSong,
    resumeSong,
    playNext,
    playPrevious,
    setVolume,
    toggleMute,
    toggleShuffle,
    setRepeatMode,
    seekTo,
    queue,
    isNowPlayingOpen,
    closeNowPlaying
  } = usePlayer();

  const [isLiked, setIsLiked] = useState(false);
  const [localVolume, setLocalVolume] = useState(volume);

  useEffect(() => {
    setLocalVolume(volume);
  }, [volume]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: any) => {
    const time = parseFloat(e.detail.value);
    seekTo(time);
  };

  const handleVolumeChange = (e: any) => {
    const vol = parseFloat(e.detail.value);
    setLocalVolume(vol);
    setVolume(vol);
  };

  const getRepeatIcon = () => {
    switch (repeatMode) {
      case 'one':
        return repeat;
      case 'all':
        return repeat;
      default:
        return repeatOutline;
    }
  };

  const skipForward = () => {
    const newTime = Math.min(currentTime + 10, duration);
    seekTo(newTime);
  };

  const skipBackward = () => {
    const newTime = Math.max(currentTime - 10, 0);
    seekTo(newTime);
  };

  const toggleLike = () => {
    setIsLiked(!isLiked);
  };

  // IMPORTANT: do NOT conditionally return null here. Ionic React
  // requires <IonModal> to stay mounted in the tree at all times and
  // be controlled only via the `isOpen` prop. Mounting/unmounting it
  // conditionally throws "framework delegate is missing" and breaks
  // React reconciliation (insertBefore errors), which freezes playback.
  const song = currentSong;

  return (
    <IonModal
      isOpen={isNowPlayingOpen && !!song}
      onDidDismiss={closeNowPlaying}
      className="now-playing-modal"
      initialBreakpoint={1}
      breakpoints={[0, 1]}
      backdropDismiss={true}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>🎵 Now Playing</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={closeNowPlaying}>
              <IonIcon icon={chevronDown} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      
      <IonContent>
        <div className="modal-content">
          {/* Album Art */}
          <div className="album-art-container">
            <IonCard className="album-art-card">
              <img
                src={song?.thumbnail || ''}
                alt={song?.title || ''}
                className="album-art"
              />
            </IonCard>
          </div>

          {/* Song Info */}
          <div className="song-info-container">
            <IonText className="song-title">
              <h1>{song?.title || '—'}</h1>
            </IonText>
            <IonText className="song-artist">
              <h2>{song?.artist || ''}</h2>
            </IonText>
          </div>

          {/* Progress Bar */}
          <div className="progress-container">
            <div className="time-labels">
              <span className="current-time">{formatTime(currentTime)}</span>
              <span className="total-time">{formatTime(duration)}</span>
            </div>
            <IonRange
              min={0}
              max={duration}
              step={1}
              value={currentTime}
              onIonChange={handleSeek}
              className="seek-range"
              color="secondary"
            />
          </div>

          {/* Main Controls */}
          <div className="main-controls">
            <div className="control-row">
              <IonButton
                fill="clear"
                color={isShuffle ? 'secondary' : 'medium'}
                onClick={toggleShuffle}
                className="control-button"
              >
                <IonIcon icon={shuffle} />
              </IonButton>

              <IonButton
                fill="clear"
                onClick={skipBackward}
                className="control-button skip-button"
              >
                <IonIcon icon={playSkipBack} />
                <span className="skip-label">-10s</span>
              </IonButton>

              <IonButton
                fill="clear"
                onClick={playPrevious}
                className="control-button"
              >
                <IonIcon icon={playSkipBack} />
              </IonButton>

              <IonButton
                fill="solid"
                color="secondary"
                onClick={isPlaying ? pauseSong : resumeSong}
                className="play-pause-large"
              >
                <IonIcon icon={isPlaying ? pause : play} />
              </IonButton>

              <IonButton
                fill="clear"
                onClick={playNext}
                className="control-button"
              >
                <IonIcon icon={playSkipForward} />
              </IonButton>

              <IonButton
                fill="clear"
                onClick={skipForward}
                className="control-button skip-button"
              >
                <IonIcon icon={playSkipForward} />
                <span className="skip-label">+10s</span>
              </IonButton>

              <IonButton
                fill="clear"
                color={repeatMode !== 'none' ? 'secondary' : 'medium'}
                onClick={() => {
                  const modes: ('none' | 'all' | 'one')[] = ['none', 'all', 'one'];
                  const currentIndex = modes.indexOf(repeatMode);
                  const nextIndex = (currentIndex + 1) % modes.length;
                  setRepeatMode(modes[nextIndex]);
                }}
                className="control-button"
              >
                <IonIcon icon={getRepeatIcon()} />
              </IonButton>
            </div>

            {/* Secondary Controls */}
            <div className="secondary-controls">
              <IonButton fill="clear" color={isLiked ? 'danger' : 'medium'} onClick={toggleLike}>
                <IonIcon icon={isLiked ? heart : heartOutline} />
              </IonButton>
              
              <div className="volume-control">
                <IonButton fill="clear" onClick={toggleMute}>
                  <IonIcon icon={isMuted ? volumeMute : volumeHigh} />
                </IonButton>
                <IonRange
                  min={0}
                  max={1}
                  step={0.1}
                  value={isMuted ? 0 : localVolume}
                  onIonChange={handleVolumeChange}
                  className="volume-range"
                  color="secondary"
                />
              </div>

              <IonButton fill="clear" href="/library">
                <IonIcon icon={list} />
              </IonButton>
            </div>
          </div>

          {/* Queue Preview */}
          {queue.length > 1 && song && (
            <div className="queue-preview">
              <IonText color="medium">
                <p>Up Next: {queue[queue.indexOf(song) + 1]?.title || 'End of queue'}</p>
              </IonText>
            </div>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
};

export default NowPlayingModal;
import React from 'react';
import {
  IonFooter,
  IonToolbar,
  IonThumbnail,
  IonText,
  IonProgressBar,
  IonIcon,
  IonButton
} from '@ionic/react';
import {
  play,
  pause,
  playSkipBack,
  playSkipForward,
  chevronUp,
  warningOutline,
  openOutline,
  closeOutline
} from 'ionicons/icons';
import { usePlayer } from '../context/PlayerContext';
import './PlayerBar.css';

/**
 * Mini player bar shown above the tab bar while a song is loaded.
 *
 * The full-screen "Now Playing" modal is intentionally NOT rendered here
 * anymore: it is hoisted to <App /> (via the open/close state in
 * PlayerContext) so the modal can overlay the tab bar instead of being
 * trapped inside this footer's stacking context.
 */
const PlayerBar: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    pauseSong,
    resumeSong,
    playNext,
    playPrevious,
    playbackError,
    dismissPlaybackError,
    openNowPlaying
  } = usePlayer();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentSong) {
    return null;
  }

  const openOnYouTube = currentSong.source === 'youtube' && currentSong.videoId;

  return (
    <>
      {playbackError && currentSong && (
        <div
          className="playback-error-banner"
          style={{
            background: 'rgba(180, 40, 40, 0.95)',
            color: '#fff',
            padding: '10px 12px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap'
          }}
        >
          <IonIcon icon={warningOutline} style={{ fontSize: '18px', flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: '200px' }}>{playbackError}</span>
          {openOnYouTube && (
            <IonButton
              fill="clear"
              size="small"
              color="light"
              href={`https://www.youtube.com/watch?v=${currentSong.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ margin: 0, '--padding-start': '6px', '--padding-end': '6px' }}
            >
              <IonIcon icon={openOutline} slot="start" />
              YouTube
            </IonButton>
          )}
          <IonButton
            fill="solid"
            size="small"
            color="light"
            onClick={() => { dismissPlaybackError(); playNext(); }}
            style={{ margin: 0 }}
          >
            <IonIcon icon={playSkipForward} slot="start" />
            Skip
          </IonButton>
          <IonButton
            fill="clear"
            size="small"
            color="light"
            onClick={dismissPlaybackError}
            style={{ margin: 0, '--padding-start': '6px', '--padding-end': '6px' }}
          >
            <IonIcon icon={closeOutline} />
          </IonButton>
        </div>
      )}
      <IonFooter className="player-bar" slot="bottom">
        <IonToolbar className="player-toolbar">
          {/* Progress Bar */}
          <IonProgressBar
            value={duration > 0 ? currentTime / duration : 0}
            className="progress-bar"
            color="secondary"
          />

          <div className="player-content">
            {/* Song Info - Clickable to open modal */}
            <div className="song-info clickable" onClick={openNowPlaying}>
              <IonThumbnail slot="start" className="song-thumbnail">
                <img src={currentSong.thumbnail} alt={currentSong.title} />
              </IonThumbnail>
              <div className="song-details">
                <IonText className="song-title">
                  <h3>{currentSong.title}</h3>
                </IonText>
                <IonText className="song-artist">
                  <p>{currentSong.artist}</p>
                </IonText>
              </div>
            </div>

            {/* Time Display */}
            <div className="time-display-compact">
              <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>

            {/* Compact Controls */}
            <div className="compact-controls">
              <IonButton
                fill="clear"
                onClick={playPrevious}
                className="compact-control"
              >
                <IonIcon icon={playSkipBack} />
              </IonButton>

              <IonButton
                fill="solid"
                color="secondary"
                onClick={isPlaying ? pauseSong : resumeSong}
                className="play-pause-compact"
              >
                <IonIcon icon={isPlaying ? pause : play} />
              </IonButton>

              <IonButton
                fill="clear"
                onClick={playNext}
                className="compact-control"
              >
                <IonIcon icon={playSkipForward} />
              </IonButton>

              <IonButton
                fill="clear"
                onClick={openNowPlaying}
                className="open-modal-button"
              >
                <IonIcon icon={chevronUp} />
              </IonButton>
            </div>
          </div>
        </IonToolbar>
      </IonFooter>
    </>
  );
};

export default PlayerBar;
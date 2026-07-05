import React from 'react';
import { IonCard, IonCardHeader, IonCardContent, IonThumbnail, IonText, IonButton } from '@ionic/react';
import { play, playCircle } from 'ionicons/icons';
import { IonIcon } from '@ionic/react';
import { Song } from '../types/music';

/** Shared fallback for thumbnails that fail to load (Audius host down,
 *  iTunes artwork 404, etc). Hides the <img> and shows a placeholder. */
const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget;
  img.style.display = 'none';
  const parent = img.parentElement;
  if (parent && !parent.querySelector('.thumb-fallback')) {
    const fallback = document.createElement('div');
    fallback.className = 'thumb-fallback';
    fallback.style.cssText =
      'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#2a2a2a;color:#666;font-size:40px;';
    fallback.innerHTML = '<ion-icon name="musical-notes"></ion-icon>';
    parent.appendChild(fallback);
  }
};

interface SongCardProps {
  song: Song;
  onPlay: (song: Song) => void;
  showArtist?: boolean;
}

const SongCard: React.FC<SongCardProps> = ({ song, onPlay, showArtist = true }) => {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the card onClick from firing
    console.log('SongCard: Play clicked for song:', song);
    onPlay(song);
  };

  return (
    <IonCard className="song-card" onClick={() => onPlay(song)}>
      <div className="song-card-content">
        <div className="song-thumbnail-wrapper">
          <img
            src={song.thumbnail}
            alt={song.title}
            className="song-card-thumbnail"
            onError={handleImgError}
            referrerPolicy="no-referrer"
          />
          <div className="play-overlay">
            <IonButton 
              fill="solid" 
              color="secondary" 
              className="play-button"
              onClick={handlePlayClick}
            >
              <IonIcon icon={play} slot="icon-only" />
            </IonButton>
          </div>
          {song.duration > 0 && (
            <div className="duration-badge">
              <span>{formatDuration(song.duration)}</span>
            </div>
          )}
          <div className={`source-badge source-${song.source || 'youtube'}`}>
            <span>
              {song.source === 'audius' && 'Audius'}
              {song.source === 'itunes' && (song.isPreview ? 'Preview' : 'iTunes')}
              {(!song.source || song.source === 'youtube') && 'YT'}
            </span>
          </div>
        </div>
        <div className="song-info">
          <IonText className="song-title">
            <h3>{song.title}</h3>
          </IonText>
          {showArtist && (
            <IonText className="song-artist">
              <p>{song.artist}</p>
            </IonText>
          )}
        </div>
      </div>
    </IonCard>
  );
};

export default SongCard;
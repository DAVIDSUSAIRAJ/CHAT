import { useState, useRef, useEffect } from 'react';

const MusicPlayer = ({ audioUrl, songName = 'Song', artist = 'Artist' }) => {
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isVolumeVisible, setIsVolumeVisible] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Reset player when audioUrl changes
    audio.pause();
    setIsPlaying(false);
    setCurrentTime(0);
    
    // Set up event listeners
    const setAudioData = () => {
      setDuration(audio.duration);
    };

    const setAudioTime = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    // Add event listeners
    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', handleEnded);

    // Clean up event listeners
    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressChange = (e) => {
    const audio = audioRef.current;
    const newTime = (e.target.value / 100) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value) / 100;
    setVolume(newVolume);
    audioRef.current.volume = newVolume;
  };

  // Format time in mm:ss
  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || timeInSeconds === Infinity) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="music-player">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <div className="music-info">
        <div className="song-details">
          <h4 className="song-name">{songName}</h4>
          <p className="artist-name">{artist}</p>
        </div>
      </div>

      <div className="player-controls">
        <button 
          className="rewind-button" 
          onClick={() => {
            audioRef.current.currentTime = Math.max(0, currentTime - 10);
          }}
          aria-label="Rewind 10 seconds"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 17l-5-5 5-5"></path>
            <path d="M18 17l-5-5 5-5"></path>
          </svg>
        </button>

        <button 
          className="play-pause-button" 
          onClick={togglePlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          )}
        </button>

        <button 
          className="forward-button" 
          onClick={() => {
            audioRef.current.currentTime = Math.min(duration, currentTime + 10);
          }}
          aria-label="Forward 10 seconds"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 17l5-5-5-5"></path>
            <path d="M6 17l5-5-5-5"></path>
          </svg>
        </button>
      </div>

      <div className="progress-container">
        <span className="time current">{formatTime(currentTime)}</span>
        <div className="progress-bar-container">
          <input
            type="range"
            ref={progressBarRef}
            className="progress-bar"
            value={progressPercentage}
            onChange={handleProgressChange}
            min="0"
            max="100"
            step="0.1"
          />
        </div>
        <span className="time duration">{formatTime(duration)}</span>
      </div>

      <div className="volume-container">
        <button 
          className="volume-button" 
          onClick={() => setIsVolumeVisible(!isVolumeVisible)}
          aria-label="Volume"
        >
          {volume === 0 ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
              <line x1="23" y1="9" x2="17" y2="15"></line>
              <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg>
          ) : volume < 0.5 ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
            </svg>
          )}
        </button>
        
        {isVolumeVisible && (
          <div className="volume-slider-container">
            <input
              type="range"
              className="volume-slider"
              min="0"
              max="100"
              value={volume * 100}
              onChange={handleVolumeChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicPlayer; 
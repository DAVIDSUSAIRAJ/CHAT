import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

const WaveSurferPlayer = ({ audioUrl }) => {
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (waveformRef.current) {
      // Cleanup previous instance
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }

      // Create WaveSurfer instance
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#c0c5ce',
        progressColor: '#1976d2',
        cursorColor: '#1976d2',
        barWidth: 3,
        barRadius: 2,
        barGap: 2,
        height: 60,
        responsive: true,
        normalize: true,
        backend: 'WebAudio',
        interact: true,
        hideScrollbar: true,
      });

      // Load audio file
      wavesurfer.load(audioUrl);

      // Set duration once ready
      wavesurfer.on('ready', () => {
        setDuration(wavesurfer.getDuration());
      });

      // Update time during playback
      wavesurfer.on('audioprocess', () => {
        setCurrentTime(wavesurfer.getCurrentTime());
      });

      // Update time when seeking
      wavesurfer.on('seek', (position) => {
        const newTime = position * wavesurfer.getDuration();
        setCurrentTime(newTime);
      });

      // Update time on interaction
      wavesurfer.on('interaction', () => {
        setCurrentTime(wavesurfer.getCurrentTime());
      });

      // Update play state
      wavesurfer.on('play', () => setIsPlaying(true));
      wavesurfer.on('pause', () => setIsPlaying(false));
      wavesurfer.on('finish', () => setIsPlaying(false));

      // Save instance
      wavesurferRef.current = wavesurfer;

      // Cleanup on unmount
      return () => {
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy();
        }
      };
    }
  }, [audioUrl]);

  const togglePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  // Manually handle seeking when clicking on waveform
  const handleWaveformClick = (e) => {
    if (wavesurferRef.current) {
      const waveformEl = waveformRef.current;
      const rect = waveformEl.getBoundingClientRect();
      const position = (e.clientX - rect.left) / rect.width;
      
      wavesurferRef.current.seekTo(position);
      const newTime = position * wavesurferRef.current.getDuration();
      setCurrentTime(newTime);
    }
  };

  // Format time in 0:00:00 format
  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || timeInSeconds === Infinity) return '0:00:00';
    
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="wavesurfer-player">
      <div className="controls">
        <button 
          onClick={togglePlayPause} 
          className="play-pause-btn"
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
      </div>
      
      <div className="waveform-container">
        <div 
          ref={waveformRef} 
          className="waveform"
          onClick={handleWaveformClick}
        ></div>
        <div className="time-display">
          <span className="current-time">{formatTime(currentTime)}</span>
          <span className="duration">{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

export default WaveSurferPlayer; 
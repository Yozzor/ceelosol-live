import React, { useState, useEffect, useRef, useCallback } from 'react';
import radioService from '../services/radioService';
import radioStatic from '../utils/radioStatic';
import './GhettoRadio.css';

const GhettoRadio = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStation, setCurrentStation] = useState(0);
  const [volume, setVolume] = useState(50);
  const [currentTrack, setCurrentTrack] = useState(0);
  const playerRef = useRef(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [stations, setStations] = useState(radioService.getStations());

  // Note: extractVideoId is now handled by radioService.extractVideoId

  // Define nextTrack with useCallback to avoid dependency issues
  const nextTrack = useCallback(() => {
    const currentStationData = stations[currentStation];
    if (currentStationData.tracks.length > 0) {
      const newTrack = (currentTrack + 1) % currentStationData.tracks.length;
      setCurrentTrack(newTrack);

      if (isPlaying && playerRef.current && playerReady) {
        // Simplified approach - just play the next track normally
        const trackUrl = currentStationData.tracks[newTrack];
        const videoId = radioService.extractVideoId(trackUrl);

        if (videoId) {
          try {
            playerRef.current.loadVideoById(videoId);
            playerRef.current.playVideo();
            console.log(`📻 Skipped to track ${newTrack + 1}`);
          } catch (error) {
            console.error('📻 Error in nextTrack:', error);
          }
        }
      }
    }
  }, [stations, currentStation, currentTrack, isPlaying, playerReady]);

  // Initialize radio static only
  useEffect(() => {
    // Initialize radio static generator
    radioStatic.initialize().catch(error => {
      console.warn('Radio static initialization failed:', error);
    });

    // Test radio service
    console.log('📻 Radio service test:', {
      stations: radioService.getStations(),
      testExtract: radioService.extractVideoId('https://www.youtube.com/watch?v=ej2aOF1emNI')
    });
  }, []);

  // Separate effect for YouTube player initialization with better isolation
  useEffect(() => {
    let playerContainer = null;
    let player = null;

    const initializePlayer = () => {
      try {
        // Create a completely isolated container outside React's management
        playerContainer = document.createElement('div');
        playerContainer.id = 'youtube-player-container';
        playerContainer.style.cssText = 'position: absolute; top: -9999px; left: -9999px; width: 1px; height: 1px; opacity: 0; pointer-events: none;';
        document.body.appendChild(playerContainer);

        const playerDiv = document.createElement('div');
        playerDiv.id = 'youtube-player-isolated';
        playerContainer.appendChild(playerDiv);

        if (window.YT && window.YT.Player) {
          player = new window.YT.Player('youtube-player-isolated', {
            height: '1',
            width: '1',
            playerVars: {
              autoplay: 0,
              controls: 0,
              disablekb: 1,
              fs: 0,
              modestbranding: 1,
              rel: 0,
              showinfo: 0
            },
            events: {
              onReady: (event) => {
                console.log('📻 YouTube player ready (isolated)');
                playerRef.current = event.target;
                setPlayerReady(true);
                event.target.setVolume(volume);
              },
              onStateChange: (event) => {
                console.log('📻 Player state changed:', event.data);
                if (event.data === window.YT.PlayerState.ENDED) {
                  nextTrack();
                } else if (event.data === window.YT.PlayerState.PLAYING) {
                  setIsPlaying(true);
                } else if (event.data === window.YT.PlayerState.PAUSED) {
                  setIsPlaying(false);
                }
              },
              onError: (event) => {
                console.error('📻 YouTube player error:', event.data);
                setTimeout(() => {
                  nextTrack();
                }, 1000);
              }
            }
          });
        }
      } catch (error) {
        console.error('📻 Failed to initialize isolated YouTube player:', error);
      }
    };

    // Load YouTube API if not already loaded
    if (!window.YT) {
      const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        document.head.appendChild(tag);
      }

      window.onYouTubeIframeAPIReady = () => {
        console.log('📻 YouTube API ready (isolated)');
        setTimeout(initializePlayer, 200);
      };
    } else {
      setTimeout(initializePlayer, 200);
    }

    // Cleanup function
    return () => {
      try {
        if (player && typeof player.destroy === 'function') {
          player.destroy();
        }
        if (playerContainer && playerContainer.parentNode) {
          playerContainer.parentNode.removeChild(playerContainer);
        }
        playerRef.current = null;
        setPlayerReady(false);
      } catch (error) {
        console.warn('📻 Error during isolated cleanup:', error);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initialize once only

  // Separate effect for volume changes
  useEffect(() => {
    if (playerRef.current && playerReady) {
      try {
        playerRef.current.setVolume(volume);
      } catch (error) {
        console.warn('📻 Error setting volume:', error);
      }
    }
  }, [volume, playerReady]);

  const playCurrentTrack = () => {
    const currentStationData = stations[currentStation];
    console.log('📻 Attempting to play track:', {
      station: currentStationData.name,
      playerReady,
      hasPlayer: !!playerRef.current,
      tracksLength: currentStationData.tracks.length
    });

    if (currentStationData.tracks.length > 0 && playerRef.current && playerReady) {
      // Simplified approach - just extract video ID and play normally
      const trackUrl = currentStationData.tracks[currentTrack];
      const videoId = radioService.extractVideoId(trackUrl);

      if (videoId) {
        try {
          console.log('📻 Loading video:', videoId);
          playerRef.current.loadVideoById(videoId);
          playerRef.current.playVideo();
          console.log(`📻 Playing ${currentStationData.name}`);
        } catch (error) {
          console.error('📻 Error loading video:', error);
        }
      } else {
        console.error('📻 No valid video ID found for:', trackUrl);
      }
    } else {
      console.warn('📻 Cannot play - missing requirements:', {
        tracksLength: currentStationData.tracks.length,
        playerReady,
        hasPlayer: !!playerRef.current
      });
    }
  };

  const togglePlay = () => {
    console.log('📻 Toggle play clicked:', { playerReady, hasPlayer: !!playerRef.current, isPlaying });

    if (!playerReady || !playerRef.current) {
      console.warn('📻 Player not ready for toggle');
      return;
    }

    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      if (stations[currentStation].tracks.length > 0) {
        playCurrentTrack();
      } else {
        console.warn('📻 No tracks available for current station');
      }
    }
  };

  const changeStation = async (direction) => {
    const newStation = direction === 'next'
      ? radioService.getNextStation(currentStation)
      : radioService.getPreviousStation(currentStation);

    // Play radio static effect when changing stations
    try {
      await radioStatic.playStaticWithFade(0.4, 0.15);
    } catch (error) {
      console.warn('Could not play radio static:', error);
    }

    // Update station and reset track to 0
    setCurrentStation(newStation);
    setCurrentTrack(0);

    if (isPlaying && playerRef.current && playerReady) {
      // Pause current playback briefly for station change effect
      playerRef.current.pauseVideo();
      setTimeout(() => {
        // Play the first track of the NEW station
        const newStationData = stations[newStation];
        if (newStationData.tracks.length > 0) {
          const trackUrl = newStationData.tracks[0]; // Always play first track of new station
          const videoId = radioService.extractVideoId(trackUrl);

          if (videoId) {
            try {
              console.log(`📻 Switching to ${newStationData.name} - Playing track 1`);
              playerRef.current.loadVideoById(videoId);
              playerRef.current.playVideo();
            } catch (error) {
              console.error('📻 Error switching station:', error);
            }
          }
        }
      }, 400); // Delay to let static finish
    }
  };



  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (playerRef.current && playerReady) {
      playerRef.current.setVolume(newVolume);
    }
  };

  const currentStationData = stations[currentStation];

  return (
    <>
      {/* Radio Toggle Button */}
      <div className={`radio-toggle ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        <div className="radio-icon">📻</div>
        <div className="radio-label">RADIO</div>
      </div>

      {/* Radio Interface */}
      {isOpen && (
        <div className="ghetto-radio">
          <div className="radio-header">
            <div className="radio-brand">GHETTO BLASTER</div>
            <button className="radio-close" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          <div className="radio-display">
            <div className="station-info">
              <div className="station-name">{currentStationData.name}</div>
              <div className="station-freq">{currentStationData.frequency} FM</div>
              <div className="station-genre">{currentStationData.genre}</div>
            </div>

            <div className="track-info">
              {currentStationData.tracks.length > 0 ? (
                <div className="now-playing">
                  <div className="track-label">NOW PLAYING:</div>
                  <div className="track-title">Track {currentTrack + 1} of {currentStationData.tracks.length}</div>
                </div>
              ) : (
                <div className="no-tracks">NO TRACKS LOADED</div>
              )}
            </div>
          </div>

          <div className="radio-controls">
            <button className="station-btn" onClick={() => changeStation('prev')}>
              ◀◀ PREV
            </button>

            <button className="play-btn" onClick={togglePlay}>
              {isPlaying ? '⏸️ PAUSE' : '▶️ PLAY'}
            </button>

            <button className="station-btn" onClick={() => changeStation('next')}>
              NEXT ▶▶
            </button>
          </div>



          <div className="radio-volume">
            <span className="volume-label">VOLUME</span>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="volume-slider"
            />
            <span className="volume-value">{volume}%</span>
          </div>

          <div className="radio-stations">
            {stations.map((station, index) => (
              <button
                key={index}
                className={`station-preset ${index === currentStation ? 'active' : ''}`}
                onClick={async () => {
                  console.log('📻 Station preset clicked:', { index, currentStation, isPlaying });

                  if (index !== currentStation) {
                    // Play static when switching to different station
                    try {
                      await radioStatic.playStaticWithFade(0.3, 0.12);
                    } catch (error) {
                      console.warn('Could not play radio static:', error);
                    }

                    if (isPlaying && playerRef.current && playerReady) {
                      playerRef.current.pauseVideo();
                    }

                    setTimeout(() => {
                      setCurrentStation(index);
                      setCurrentTrack(0);
                      if (isPlaying && playerRef.current && playerReady) {
                        // Play the first track of the selected station
                        const selectedStationData = stations[index];
                        if (selectedStationData.tracks.length > 0) {
                          const trackUrl = selectedStationData.tracks[0];
                          const videoId = radioService.extractVideoId(trackUrl);

                          if (videoId) {
                            try {
                              console.log(`📻 Switching to ${selectedStationData.name} - Playing track 1`);
                              playerRef.current.loadVideoById(videoId);
                              playerRef.current.playVideo();
                            } catch (error) {
                              console.error('📻 Error switching to preset station:', error);
                            }
                          }
                        }
                      }
                    }, 300);
                  } else {
                    // Same station clicked - toggle play if not playing
                    if (!isPlaying && playerRef.current && playerReady) {
                      playCurrentTrack();
                    }
                  }
                }}
              >
                <div className="preset-freq">{station.frequency}</div>
                <div className="preset-name">{station.name}</div>
              </button>
            ))}
          </div>

          <div className="radio-footer">
            <div className="radio-status">
              {isPlaying ? '🔊 ON AIR' : '📻 TUNED IN'}
            </div>
          </div>
        </div>
      )}

      {/* YouTube player is now created dynamically outside React's DOM management */}
    </>
  );
};

export default GhettoRadio;

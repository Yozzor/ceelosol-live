/**
 * Radio Service - Manages radio stations and playlists
 * Add YouTube links here to populate the radio stations
 */

class RadioService {
  constructor() {
    this.stations = [
      {
        name: "RADIO LOS SANTOS",
        genre: "Hip-Hop/Rap",
        frequency: "106.7",
        tracks: [
          "https://www.youtube.com/watch?v=ej2aOF1emNI"
        ]
      },
      {
        name: "K-DST",
        genre: "Classic Rock",
        frequency: "107.7",
        tracks: [
          "https://www.youtube.com/watch?v=GjUrSjjUbVk"
        ]
      },
      {
        name: "BOUNCE FM",
        genre: "Funk/Soul",
        frequency: "103.5",
        tracks: [
          "https://www.youtube.com/watch?v=KZUfoNjKAPU"
        ]
      },
      {
        name: "CSR 103.9",
        genre: "Soul/R&B",
        frequency: "103.9",
        tracks: [
          "https://www.youtube.com/watch?v=nPurvKR4jZg"
        ]
      },
      {
        name: "PLAYBACK FM",
        genre: "Old School Hip-Hop",
        frequency: "99.1",
        tracks: [
          "https://www.youtube.com/watch?v=25B2xNhiVUY"
        ]
      },
      {
        name: "WEST COAST CLASSICS",
        genre: "West Coast Hip-Hop",
        frequency: "105.3",
        tracks: [
          "https://www.youtube.com/watch?v=wnmg6CfHQ18"
        ]
      }
    ];
  }

  // Get all stations
  getStations() {
    return this.stations;
  }

  // Get specific station
  getStation(index) {
    return this.stations[index] || null;
  }

  // Add track to station
  addTrackToStation(stationIndex, youtubeUrl) {
    if (this.stations[stationIndex] && this.isValidYouTubeUrl(youtubeUrl)) {
      this.stations[stationIndex].tracks.push(youtubeUrl);
      this.saveToLocalStorage();
      return true;
    }
    return false;
  }

  // Remove track from station
  removeTrackFromStation(stationIndex, trackIndex) {
    if (this.stations[stationIndex] && this.stations[stationIndex].tracks[trackIndex]) {
      this.stations[stationIndex].tracks.splice(trackIndex, 1);
      this.saveToLocalStorage();
      return true;
    }
    return false;
  }

  // Validate YouTube URL
  isValidYouTubeUrl(url) {
    const regex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;
    return regex.test(url);
  }

  // Extract video ID from YouTube URL
  extractVideoId(url) {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  // Get random track from station
  getRandomTrack(stationIndex) {
    const station = this.stations[stationIndex];
    if (station && station.tracks.length > 0) {
      const randomIndex = Math.floor(Math.random() * station.tracks.length);
      return {
        url: station.tracks[randomIndex],
        index: randomIndex
      };
    }
    return null;
  }

  // Shuffle station playlist
  shuffleStation(stationIndex) {
    const station = this.stations[stationIndex];
    if (station && station.tracks.length > 0) {
      for (let i = station.tracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [station.tracks[i], station.tracks[j]] = [station.tracks[j], station.tracks[i]];
      }
      this.saveToLocalStorage();
    }
  }

  // Save to localStorage
  saveToLocalStorage() {
    try {
      localStorage.setItem('ceelosol_radio_stations', JSON.stringify(this.stations));
    } catch (error) {
      console.error('Error saving radio stations:', error);
    }
  }

  // Load from localStorage
  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('ceelosol_radio_stations');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with default stations, keeping any added tracks
        parsed.forEach((savedStation, index) => {
          if (this.stations[index]) {
            this.stations[index].tracks = savedStation.tracks || [];
          }
        });
      }
    } catch (error) {
      console.error('Error loading radio stations:', error);
    }
  }

  // Add multiple tracks to a station at once
  addMultipleTracksToStation(stationIndex, youtubeUrls) {
    if (!this.stations[stationIndex]) return false;

    let addedCount = 0;
    youtubeUrls.forEach(url => {
      if (this.isValidYouTubeUrl(url)) {
        this.stations[stationIndex].tracks.push(url);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      this.saveToLocalStorage();
    }

    return addedCount;
  }

  // Get station stats
  getStationStats(stationIndex) {
    const station = this.stations[stationIndex];
    if (!station) return null;

    return {
      name: station.name,
      genre: station.genre,
      frequency: station.frequency,
      trackCount: station.tracks.length,
      totalDuration: station.tracks.length * 3.5 // Estimate 3.5 minutes per track
    };
  }

  // Search for stations by genre
  findStationsByGenre(genre) {
    return this.stations.filter(station =>
      station.genre.toLowerCase().includes(genre.toLowerCase())
    );
  }

  // Get next station index
  getNextStation(currentIndex) {
    return (currentIndex + 1) % this.stations.length;
  }

  // Get previous station index
  getPreviousStation(currentIndex) {
    return (currentIndex - 1 + this.stations.length) % this.stations.length;
  }

  // Generate random start time for long playlists (in seconds)
  // These are long playlists (1-2+ hours), so we'll generate random start times
  getRandomStartTime(stationIndex) {
    const station = this.stations[stationIndex];
    if (!station || station.tracks.length === 0) return 0;

    // Estimated durations for each station (in seconds)
    const stationDurations = {
      0: 3600,  // Radio Los Santos - ~1 hour
      1: 7200,  // K-DST - ~2 hours
      2: 5400,  // Bounce FM - ~1.5 hours
      3: 4800,  // CSR - ~1.3 hours
      4: 6000,  // Playback FM - ~1.7 hours
      5: 5400   // West Coast Classics - ~1.5 hours
    };

    const duration = stationDurations[stationIndex] || 3600; // Default 1 hour

    // Generate random start time (avoid last 5 minutes to prevent immediate ending)
    const maxStartTime = Math.max(0, duration - 300);
    return Math.floor(Math.random() * maxStartTime);
  }

  // Extract video ID and add random start time
  extractVideoIdWithRandomStart(url, stationIndex) {
    const videoId = this.extractVideoId(url);
    if (!videoId) return null;

    const startTime = this.getRandomStartTime(stationIndex);

    return {
      videoId: videoId,
      startTime: startTime
    };
  }

  // Helper method to quickly add tracks to stations
  populateStations() {
    // This method can be called to add sample tracks for testing
    // You can add your YouTube links here for each station

    console.log('🎵 Radio stations ready! Add YouTube links to populate playlists.');
    console.log('📻 Available stations:', this.stations.map(s => `${s.name} (${s.frequency} FM)`));
    console.log('🎶 To add tracks, use: radioService.addTrackToStation(stationIndex, "youtube_url")');
  }
}

// Create singleton instance
const radioService = new RadioService();

// Load saved data on initialization
radioService.loadFromLocalStorage();

// Show available stations in console
radioService.populateStations();

export default radioService;

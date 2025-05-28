# 📻 Ghetto Radio Setup Guide

## Overview
The Ghetto Radio is a GTA San Andreas-inspired music player that plays YouTube music with different radio stations. It's designed to enhance the street/ghetto aesthetic of the gambling platform.

## Features
- **6 Radio Stations** with different genres
- **YouTube Integration** for music playback
- **Station Switching** with smooth transitions
- **Volume Control** with visual slider
- **Shuffle & Skip** functionality
- **Persistent Settings** saved to localStorage
- **Mobile Responsive** design
- **GTA San Andreas Styling** with authentic colors and fonts

## Radio Stations

1. **RADIO LOS SANTOS** (106.7 FM) - Hip-Hop/Rap
2. **K-DST** (107.7 FM) - Classic Rock
3. **BOUNCE FM** (103.5 FM) - Funk/Soul
4. **CSR 103.9** (103.9 FM) - Soul/R&B
5. **PLAYBACK FM** (99.1 FM) - Old School Hip-Hop
6. **WEST COAST CLASSICS** (105.3 FM) - West Coast Hip-Hop

## How to Add Music

### Method 1: Direct Code Edit
1. Open `src/services/radioService.js`
2. Find the station you want to add music to
3. Add YouTube URLs to the `tracks` array:

```javascript
{
  name: "RADIO LOS SANTOS",
  genre: "Hip-Hop/Rap", 
  frequency: "106.7",
  tracks: [
    "https://www.youtube.com/watch?v=nSy7wpevIsY",
    "https://www.youtube.com/watch?v=ANOTHER_VIDEO_ID",
    // Add more YouTube links here
  ]
}
```

### Method 2: Browser Console (Runtime)
1. Open browser developer tools (F12)
2. Go to Console tab
3. Use these commands:

```javascript
// Add single track to station (0-5 for station index)
radioService.addTrackToStation(0, "https://www.youtube.com/watch?v=nSy7wpevIsY");

// Add multiple tracks at once
radioService.addMultipleTracksToStation(0, [
  "https://www.youtube.com/watch?v=VIDEO_ID_1",
  "https://www.youtube.com/watch?v=VIDEO_ID_2",
  "https://www.youtube.com/watch?v=VIDEO_ID_3"
]);

// Check station info
radioService.getStationStats(0);
```

## YouTube URL Formats Supported
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://www.youtube.com/watch?v=VIDEO_ID&t=30s`
- `https://youtu.be/VIDEO_ID`

## Controls

### Radio Toggle
- **Location**: Bottom-left corner
- **Click**: Opens/closes radio interface
- **Icon**: 📻 RADIO

### Main Controls
- **PREV/NEXT**: Switch between radio stations
- **PLAY/PAUSE**: Start/stop music playback
- **SKIP**: Skip to next track in current station
- **SHUFFLE**: Randomize current station's playlist

### Volume Control
- **Slider**: Adjust volume from 0-100%
- **Real-time**: Changes apply immediately

### Station Presets
- **Grid Layout**: Quick access to all stations
- **Active Highlight**: Current station highlighted in gold
- **Click**: Instantly switch to any station

## Technical Details

### Files Created
- `src/components/GhettoRadio.js` - Main radio component
- `src/components/GhettoRadio.css` - Styling and animations
- `src/services/radioService.js` - Radio logic and data management

### Integration Points
- Added to `GameModeSelector.js` (main menu)
- Added to `LobbyRoom.js` (during gameplay)
- Uses YouTube IFrame API for music playback

### Storage
- Playlists saved to `localStorage` as `ceelosol_radio_stations`
- Settings persist between browser sessions
- Automatic loading on app startup

## Styling Features
- **GTA San Andreas Colors**: Green, gold, sand, red
- **Pricedown Font**: Authentic GTA typography for headers
- **Backdrop Blur**: Modern glass effect
- **Smooth Animations**: Slide-in/fade-out transitions
- **Responsive Design**: Works on mobile and desktop

## Usage Tips

1. **Adding Music**: Start with 3-5 tracks per station for testing
2. **Station Themes**: Keep music genres consistent with station names
3. **Volume**: Default volume is 50%, adjustable per user
4. **Performance**: YouTube API loads automatically, no setup needed
5. **Mobile**: Radio interface adapts to smaller screens

## Console Commands

```javascript
// View all stations
radioService.getStations();

// Get specific station
radioService.getStation(0);

// Shuffle a station's playlist
radioService.shuffleStation(0);

// Check if URL is valid
radioService.isValidYouTubeUrl("https://www.youtube.com/watch?v=VIDEO_ID");

// Get random track from station
radioService.getRandomTrack(0);
```

## Example Playlist Setup

```javascript
// Hip-Hop Station (Index 0)
radioService.addMultipleTracksToStation(0, [
  "https://www.youtube.com/watch?v=nSy7wpevIsY", // Example track
  "https://www.youtube.com/watch?v=ANOTHER_ID",
  "https://www.youtube.com/watch?v=THIRD_ID"
]);

// Classic Rock Station (Index 1)  
radioService.addMultipleTracksToStation(1, [
  "https://www.youtube.com/watch?v=ROCK_TRACK_1",
  "https://www.youtube.com/watch?v=ROCK_TRACK_2"
]);
```

The radio is now ready to use! Just provide YouTube links and the ghetto vibes will start flowing! 🎵🎰

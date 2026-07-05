# 🎵 Astolfy Music

A modern, responsive music player web app built with Ionic React that integrates with YouTube Music API. Works seamlessly on both desktop and mobile devices.

## Features

- 🔍 **Search** - Search for songs, artists, and albums from YouTube
- 🏠 **Home** - Discover trending music and popular songs
- 📚 **Library** - Manage your playback queue and favorites
- 🎵 **Full Player Controls** - Play, pause, skip, shuffle, repeat
- 🔊 **Volume Control** - Adjust volume with visual feedback
- 📱 **Responsive Design** - Optimized for both mobile and desktop
- 🌙 **Dark Mode** - Easy on the eyes, stylish dark theme
- ⚡ **Fast Performance** - Built with React and Ionic for smooth experience
- 🔐 **Secure API Key Management** - Environment variables for sensitive data

## Tech Stack

- **Frontend**: React 19 + Ionic 8
- **Styling**: CSS with responsive design
- **State Management**: React Context API
- **API**: YouTube Data API v3
- **Audio**: YouTube IFrame API
- **Environment**: Vite with dotenv support

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm
- YouTube Data API v3 key

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
# or
pnpm install
```

2. Configure API Keys:

Edit the `.env` file and add your YouTube API key:
```
VITE_YOUTUBE_API_KEY=your_actual_api_key_here
```

3. Get a YouTube API Key:
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project or select existing one
- Enable YouTube Data API v3
- Create credentials (API Key)
- Copy the API key and paste it in the `.env` file

⚠️ **Important Security Note**: Never commit your `.env` file to version control. The `.env` file is already included in `.gitignore` to prevent accidental commits. Only `.env.example` should be shared with the repository.

### Environment Variables

The application uses the following environment variables (defined in `.env`):

- `VITE_YOUTUBE_API_KEY`: Your YouTube Data API v3 key (required)
- `VITE_SPOTIFY_CLIENT_ID`: Spotify Client ID (for future use)
- `VITE_SPOTIFY_CLIENT_SECRET`: Spotify Client Secret (for future use)
- `VITE_SPOTIFY_REDIRECT_URI`: Spotify OAuth redirect URI (for future use)

Note: Variables must be prefixed with `VITE_` to be accessible in the Vite frontend.

### Development

Run the development server:
```bash
npm run dev
# or
pnpm dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
# or
pnpm build
```

## Usage

### Home Page
- View trending songs from YouTube
- Click "Play All" to start playing trending songs
- Click on any song card to play it
- Pull down to refresh trending songs

### Search Page
- Use the search bar to find songs, artists, or albums
- Results appear as you type (minimum 3 characters)
- Click on any song to play it and add to queue

### Library Page
- View your current playback queue
- See the currently playing song
- Remove songs from queue
- Clear entire queue
- Click on any queued song to play it

### Player Controls (Bottom Bar)
- **Play/Pause** - Toggle playback
- **Previous/Next** - Navigate through queue
- **Shuffle** - Randomize playback order
- **Repeat** - Cycle through: no repeat → repeat all → repeat one
- **Volume** - Adjust playback volume
- **Progress Bar** - See current position and seek (drag to scrub)

## Architecture

### File Structure
```
src/
├── components/           # Reusable UI components
│   ├── PlayerBar.tsx    # Bottom player with controls
│   └── SongCard.tsx     # Song display card
├── context/            # State management
│   └── PlayerContext.tsx # Global player state
├── pages/              # Main pages
│   ├── Home.tsx       # Trending songs
│   ├── Search.tsx     # Search functionality
│   └── Library.tsx    # Queue management
├── services/          # API integration
│   └── youtubeMusicApi.ts # YouTube API wrapper
├── types/            # TypeScript definitions
│   └── music.ts      # Type definitions
└── App.tsx          # Main app component

Configuration:
├── .env.example      # Example environment variables
├── .env              # Your actual environment variables (not committed)
└── .gitignore        # Excludes .env from version control
```

### Key Components

**PlayerContext**: Manages global state including:
- Current playing song
- Playback state (playing/paused)
- Queue management
- Volume and controls
- YouTube player integration

**YouTubeMusicService**: Handles API calls to YouTube:
- Search songs
- Get trending songs
- Fetch video details
- Secure API key management via environment variables

## Security Features

- **Environment Variables**: API keys stored in `.env` file
- **Git Protection**: `.env` file excluded from version control
- **Vite Integration**: Securely loads environment variables at build time
- **Example Configuration**: `.env.example` provides template for developers

## Future Enhancements

- 🎧 Spotify integration (prepared with environment variables)
- 💾 Local storage for playlists and favorites
- 🎨 More theme options
- 📊 Listening statistics
- 🔄 Background play support
- 📱 Native mobile app (via Capacitor)
- 🔐 User authentication
- ❤️ Like/favorite songs
- 📝 Create and manage playlists
- 🎵 Audio quality settings

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Known Limitations

- YouTube API has rate limits (10,000 units/day for free tier)
- Some videos may be unavailable due to region restrictions
- Background playback may not work in all browsers
- YouTube IFrame API requires user interaction for first play

## Troubleshooting

### No songs appearing
- Check your `.env` file exists and contains valid API key
- Ensure YouTube Data API v3 is enabled in Google Cloud Console
- Check browser console for API errors
- Verify environment variable is properly formatted: `VITE_YOUTUBE_API_KEY=your_key`

### Player not working
- Ensure YouTube IFrame API is loading (check network tab)
- Some browsers may block autoplay - try clicking play manually
- Check if ad-blockers are interfering

### Environment variable issues
- Make sure to restart dev server after creating/modifying `.env` file
- Verify variable starts with `VITE_` prefix
- Check that `.env` file is in the project root directory
- Ensure no extra spaces or quotes around the API key

### Build errors
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check TypeScript errors in console
- Ensure all dependencies are compatible
- Verify environment variables are properly set before building

## Security Best Practices

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Use strong API keys** - Generate secure keys from official sources
3. **Rotate keys regularly** - Update API keys periodically
4. **Limit API usage** - Set up quotas in Google Cloud Console
5. **Use separate environments** - Different keys for dev/staging/production
6. **Monitor usage** - Track API usage to detect unauthorized access

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

---

Built with ❤️ using Ionic React and YouTube Music API# astolfy

# NFL EPA Calculator - Frontend

React frontend for the NFL EPA Calculator application.

## Features

- **Team Selection**: Choose home and away teams with NFL team logos
- **Game Situation Input**: Configure down, distance, field position
- **Score & Time**: Set scores, time remaining, and timeouts
- **Real-time EPA Calculation**: Get instant Expected Points Added predictions
- **Beautiful UI**: Modern, responsive design with Tailwind CSS

## Quick Start

### Prerequisites

- Node.js 18+ installed
- Backend API running on http://localhost:8000

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server (http://localhost:3000)
npm run dev
```

The frontend will automatically proxy API requests to the backend at http://localhost:8000.

### Build for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   │   └── EPACalculator.jsx
│   ├── data/            # Static data
│   │   └── teams.json   # NFL teams with logos
│   ├── App.jsx          # Main app component
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles (Tailwind)
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
└── package.json         # Dependencies
```

## Tech Stack

- **React 18**: UI framework
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **ESPN CDN**: NFL team logos

## API Integration

The app connects to the FastAPI backend:

- **Endpoint**: POST http://localhost:8000/api/calculate
- **Request**: Game situation data (teams, down, distance, etc.)
- **Response**: EPA value and metadata

## Team Logos

Team logos are loaded from ESPN's CDN:
`https://a.espncdn.com/i/teamlogos/nfl/500/{team_abbr}.png`

All 32 NFL teams are supported with official abbreviations.

## Environment Variables

To change the API endpoint, update the proxy configuration in `vite.config.js`.

## Deployment

The frontend can be deployed to:

- **Vercel** (recommended)
- **Netlify**
- **GitHub Pages**
- Any static hosting service

Update the API endpoint in production to point to your deployed backend.

## Next Steps

- Phase 5: Deploy to production
- Add Win Probability model integration (Phase 2b)
- Add play-by-play simulation
- Historical comparisons

---

**Status**: Phase 4 - Frontend Development ✓

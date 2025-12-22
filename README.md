# Signage Manager

A complete digital signage management system built with Next.js, designed for Raspberry Pi displays.

## Features

- 🔐 **Authentication** - Password-based admin access
- 📺 **Screen Management** - Add/remove displays with status monitoring
- 📁 **Asset Library** - Upload images/videos with Vercel Blob storage
- 🎵 **Playlist Builder** - Create content schedules for each screen
- 🔄 **Auto-sync** - Raspberry Pi clients automatically poll for updates
- 💓 **Heartbeat Monitoring** - Real-time status of all displays
- 🌐 **API Access** - RESTful API for Pi clients with key authentication

## Quick Start

### 1. Deploy Web App
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/signage-manager)

### 2. Setup Database
- Add Vercel Postgres to your project
- Visit `/api/setup` to initialize tables

### 3. Configure Environment
```bash
NEXTAUTH_SECRET=your-secret-here
SIGNAGE_PASSWORD=your-admin-password
API_KEY=your-pi-api-key
BLOB_READ_WRITE_TOKEN=your-blob-token
DATABASE_URL=your-postgres-url
```

### 4. Setup Raspberry Pi
See [`pi_client/README.md`](pi_client/README.md) for Pi setup instructions.

## Architecture

- **Frontend**: Next.js with Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: PostgreSQL (Vercel Postgres)
- **Storage**: Vercel Blob for media files
- **Auth**: NextAuth.js for web, API keys for Pi clients
- **Client**: Python script for Raspberry Pi displays

## Usage

1. **Login** with your admin password
2. **Add Screens** - Create entries for each Pi display
3. **Upload Assets** - Add images/videos to your library
4. **Build Playlists** - Assign content to screens with timing
5. **Deploy Pi Clients** - Run the Python script on each Pi

## API Endpoints

### For Pi Clients (require API key):
- `GET /api/screens/{screenId}/config` - Screen configuration
- `GET /api/screens/{screenId}/playlist` - Current playlist
- `POST /api/screens/{screenId}/heartbeat` - Status updates
- `GET /api/assets/{assetId}` - Asset metadata
- `GET /api/assets/{assetId}/download` - Download files

### For Web Admin:
- `GET /api/admin/screens` - Manage screens
- `GET /api/admin/assets` - Manage assets
- `POST /api/admin/assets` - Upload files

## Development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` and login with your configured password.

## License

MIT License - Feel free to use for personal or commercial projects.

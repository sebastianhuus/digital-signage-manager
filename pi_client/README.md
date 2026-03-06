# Signage Manager Pi Client

Python client for Raspberry Pi to display digital signage content.

## Setup on Raspberry Pi

### (Optional) Connect over SSH

Find your Pi on the network if connected directly over ethernet `arp -a | grep -a ".home"`

### 1. Clone Repository
```bash
cd /home/pi
git clone https://github.com/sebastianhuus/digital-signage-manager.git signage-manager
cd signage-manager/pi_client
```

### 2. Install Dependencies
```bash
sudo apt update
sudo apt install python3-requests code
```

### 3. Configure Client

Run the setup script to configure the environment:
```bash
./setup_env.sh
```

The script will prompt you for:
- API URL (e.g., https://your-app.vercel.app)
- API Key
- Screen ID
- Poll interval (optional, defaults to 30 seconds)
- Heartbeat interval (optional, defaults to 60 seconds)
- Inactive poll/heartbeat intervals (optional, defaults to 300 seconds)
- Active hours window (optional, defaults to 07:00 - 22:00)

You typically get the API URL, API Key, and Screen ID from the `/screens` page after adding your new screen.

**Manual Configuration (Alternative)**

If you prefer to configure manually:
```bash
cp .env.example .env
nano .env
```

Update these values:
```bash
SIGNAGE_API_URL=https://your-app.vercel.app
SIGNAGE_API_KEY=your-api-key-here
SIGNAGE_SCREEN_ID=tv-1
```

### 4. Run Client
```bash
python3 pi_client.py
```

### 5. Auto-start on Boot

Run the installation script to automatically create and enable the systemd service:
```bash
chmod +x install_service.sh
./install_service.sh
```

The script will:
- Automatically detect the working directory
- Prompt for the username to run the service (defaults to current user)
- Create the systemd service file with correct paths
- Enable and start the service

**Manual Installation (Alternative)**

If you prefer to create the service manually:
```bash
sudo nano /etc/systemd/system/signage.service
```

Add (replace `admin` and paths as needed):
```ini
[Unit]
Description=Signage Manager Client
After=network.target

[Service]
Type=simple
User=admin
WorkingDirectory=/home/admin/signage-manager/pi_client
ExecStart=/usr/bin/python3 /home/admin/signage-manager/pi_client/pi_client.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable signage.service
sudo systemctl start signage.service
```

## Features

- **Auto-polling**: Checks for playlist updates every 30 seconds (active hours) or 300 seconds (inactive hours)
- **Active hours scheduling**: Configurable time window to reduce polling during off-hours
- **Local caching**: Downloads and caches media files
- **Fullscreen display**: Uses Chromium in kiosk mode
- **Heartbeat monitoring**: Sends status updates every 60 seconds (active) or 300 seconds (inactive)
- **Auto-recovery**: Restarts on errors
- **Temperature monitoring**: Reports Pi CPU temperature

## Configuration

Create a `.env` file in the `pi_client` directory:
```bash
SIGNAGE_API_URL=https://your-app.vercel.app
SIGNAGE_API_KEY=your-api-key-here
SIGNAGE_SCREEN_ID=tv-1
SIGNAGE_POLL_INTERVAL=30
SIGNAGE_HEARTBEAT_INTERVAL=60
SIGNAGE_INACTIVE_POLL_INTERVAL=300
SIGNAGE_INACTIVE_HEARTBEAT_INTERVAL=300
SIGNAGE_ACTIVE_START=07:00
SIGNAGE_ACTIVE_END=22:00
```

## Troubleshooting

### Check logs:
```bash
sudo journalctl -u signage.service -f
```

### Manual testing:
```bash
python3 pi_client.py
```

### Browser issues:
Chromium Browser is pre-installed on Raspberry Pi OS. If it doesn't start, the client will try to launch it automatically. If you need to reinstall:
```bash
sudo apt install chromium --fix-missing
```

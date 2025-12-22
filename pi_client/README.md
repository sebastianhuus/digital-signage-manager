# Signage Manager Pi Client

Python client for Raspberry Pi to display digital signage content.

## Setup on Raspberry Pi

### 1. Install Dependencies
```bash
sudo apt update
sudo apt install python3-pip chromium-browser
pip3 install requests
```

### 2. Configure Client
Copy the environment file and edit:
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

### 3. Run Client
```bash
python3 pi_client.py
```

### 4. Auto-start on Boot
Create systemd service:
```bash
sudo nano /etc/systemd/system/signage.service
```

Add:
```ini
[Unit]
Description=Signage Manager Client
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/signage-manager/pi_client
ExecStart=/usr/bin/python3 /home/pi/signage-manager/pi_client/pi_client.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable service:
```bash
sudo systemctl enable signage.service
sudo systemctl start signage.service
```

## Features

- **Auto-polling**: Checks for playlist updates every 30 seconds
- **Local caching**: Downloads and caches media files
- **Fullscreen display**: Uses Chromium in kiosk mode
- **Heartbeat monitoring**: Sends status updates every 60 seconds
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
If Chromium doesn't start, try:
```bash
sudo apt install chromium-browser --fix-missing
```

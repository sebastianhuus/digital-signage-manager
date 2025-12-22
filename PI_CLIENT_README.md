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
Edit `pi_client.py` and update:
```python
API_BASE_URL = "https://your-app.vercel.app"  # Your Vercel URL
SCREEN_ID = "tv-1"  # Unique ID for this Pi
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
WorkingDirectory=/home/pi
ExecStart=/usr/bin/python3 /home/pi/pi_client.py
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

Edit these variables in `pi_client.py`:
- `API_BASE_URL`: Your signage manager URL
- `SCREEN_ID`: Unique identifier for this display
- `POLL_INTERVAL`: How often to check for updates (seconds)
- `HEARTBEAT_INTERVAL`: How often to send status (seconds)

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

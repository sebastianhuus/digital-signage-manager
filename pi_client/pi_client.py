#!/usr/bin/env python3
"""
Signage Manager Pi Client
Polls the signage manager API and displays content in fullscreen
"""

import os
import time
import json
import requests
import subprocess
import threading
from pathlib import Path

# Load environment variables from .env file if it exists
def load_env_file():
    env_file = Path(__file__).parent / '.env'
    print(f"Looking for .env file at: {env_file}")
    if env_file.exists():
        print("Found .env file, loading...")
        with open(env_file) as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value
                    print(f"Loaded: {key}={value}")
    else:
        print("No .env file found, using defaults")

load_env_file()

# Configuration
API_BASE_URL = os.getenv("SIGNAGE_API_URL", "https://your-app.vercel.app")
API_KEY = os.getenv("SIGNAGE_API_KEY", "signage-api-key-2025")
SCREEN_ID = os.getenv("SIGNAGE_SCREEN_ID", "tv-1")
CACHE_DIR = Path.home() / "signage_cache"
POLL_INTERVAL = int(os.getenv("SIGNAGE_POLL_INTERVAL", "30"))  # seconds
HEARTBEAT_INTERVAL = int(os.getenv("SIGNAGE_HEARTBEAT_INTERVAL", "60"))  # seconds

print(f"Configuration loaded:")
print(f"  API_BASE_URL: {API_BASE_URL}")
print(f"  SCREEN_ID: {SCREEN_ID}")
print(f"  API_KEY: {API_KEY[:10]}...")  # Only show first 10 chars

class SignageClient:
    def __init__(self):
        self.current_playlist = []
        self.current_item_index = 0
        self.item_start_time = 0
        self.browser_process = None
        self.setup_cache_dir()
        
    def setup_cache_dir(self):
        """Create cache directory if it doesn't exist"""
        CACHE_DIR.mkdir(exist_ok=True)
        print(f"Cache directory: {CACHE_DIR}")
        
    def make_api_request(self, endpoint):
        """Make authenticated API request"""
        headers = {"x-api-key": API_KEY}
        try:
            # Remove leading slash from endpoint to avoid double slashes
            endpoint = endpoint.lstrip('/')
            url = f"{API_BASE_URL}/api/{endpoint}"
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            # Debug: print response content
            print(f"API Response for {endpoint}: {response.text[:200]}...")
            
            if not response.text.strip():
                print(f"Empty response from {endpoint}")
                return None
                
            return response.json()
        except requests.RequestException as e:
            print(f"API request failed: {e}")
            return None
        except json.JSONDecodeError as e:
            print(f"JSON decode error for {endpoint}: {e}")
            print(f"Response content: {response.text}")
            return None
            
    def post_api_request(self, endpoint, data):
        """Make authenticated POST API request"""
        headers = {"x-api-key": API_KEY, "Content-Type": "application/json"}
        try:
            # Remove leading slash from endpoint to avoid double slashes
            endpoint = endpoint.lstrip('/')
            url = f"{API_BASE_URL}/api/{endpoint}"
            response = requests.post(url, headers=headers, json=data, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"API POST failed: {e}")
            return None
            
    def get_playlist(self):
        """Fetch current playlist from API"""
        return self.make_api_request(f"screens/{SCREEN_ID}/playlist")
        
    def get_asset_info(self, asset_id):
        """Get asset metadata"""
        return self.make_api_request(f"assets/{asset_id}")
        
    def download_asset(self, asset_id, url, filename):
        """Download and cache asset file"""
        cache_path = CACHE_DIR / filename
        
        # Skip if already cached
        if cache_path.exists():
            print(f"Asset {asset_id} already cached")
            return str(cache_path)
            
        print(f"Downloading {asset_id}...")
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            with open(cache_path, 'wb') as f:
                f.write(response.content)
                
            print(f"Downloaded {filename} to cache")
            return str(cache_path)
        except requests.RequestException as e:
            print(f"Download failed for {asset_id}: {e}")
            return None
            
    def update_playlist(self):
        """Check for playlist updates and download new assets"""
        playlist_data = self.get_playlist()
        if not playlist_data:
            return False
            
        new_playlist = playlist_data.get('items', [])
        
        # Check if playlist changed
        if new_playlist != self.current_playlist:
            print("Playlist updated!")
            self.current_playlist = new_playlist
            self.current_item_index = 0
            self.item_start_time = time.time()
            
            # Download all assets
            for item in self.current_playlist:
                asset_info = self.get_asset_info(item['assetId'])
                if asset_info and 'url' in asset_info:
                    self.download_asset(
                        item['assetId'], 
                        asset_info['url'], 
                        asset_info['filename']
                    )
            return True
        return False
        
    def get_current_item(self):
        """Get the current playlist item that should be displayed"""
        if not self.current_playlist:
            return None
            
        current_time = time.time()
        current_item = self.current_playlist[self.current_item_index]
        
        # Check if it's time to move to next item
        if current_time - self.item_start_time >= current_item['duration']:
            self.current_item_index = (self.current_item_index + 1) % len(self.current_playlist)
            self.item_start_time = current_time
            current_item = self.current_playlist[self.current_item_index]
            
        return current_item
        
    def display_content(self, asset_id, filename, content_type):
        """Display content in fullscreen browser"""
        cache_path = CACHE_DIR / filename
        
        if not cache_path.exists():
            print(f"Cached file not found: {filename}")
            return
            
        # Kill existing browser
        if self.browser_process:
            self.browser_process.terminate()
            
        # Create simple HTML for display
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ margin: 0; padding: 0; background: black; overflow: hidden; }}
                img, video {{ width: 100vw; height: 100vh; object-fit: cover; }}
            </style>
        </head>
        <body>
        """
        
        if content_type == 'image':
            html_content += f'<img src="file://{cache_path}" />'
        else:
            html_content += f'<video src="file://{cache_path}" autoplay muted loop></video>'
            
        html_content += """
        </body>
        </html>
        """
        
        # Write HTML file
        html_path = CACHE_DIR / "display.html"
        with open(html_path, 'w') as f:
            f.write(html_content)
            
        # Launch browser in fullscreen
        browsers_to_try = [
            # Pi/Linux
            ['chromium-browser', '--kiosk', '--no-sandbox', '--disable-infobars', '--disable-session-crashed-bubble'],
            # Windows Edge
            ['msedge', '--kiosk', '--no-first-run', '--disable-features=TranslateUI'],
            # Windows Chrome
            ['chrome', '--kiosk', '--no-first-run'],
            # Windows Chrome (alternative path)
            [r'C:\Program Files\Google\Chrome\Application\chrome.exe', '--kiosk', '--no-first-run'],
            # Mac Chrome
            ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '--kiosk', '--no-first-run'],
            # Generic Linux
            ['google-chrome', '--kiosk', '--no-first-run'],
            ['google-chrome-stable', '--kiosk', '--no-first-run'],
            # Firefox as fallback (no kiosk, but fullscreen)
            ['firefox', '--kiosk']
        ]
        
        for browser_cmd in browsers_to_try:
            try:
                self.browser_process = subprocess.Popen(browser_cmd + [f'file://{html_path}'])
                print(f"Displaying: {filename} using {browser_cmd[0]}")
                return
            except FileNotFoundError:
                continue
                
        print("No suitable browser found.")
        print("Windows: Edge should work automatically, or install Chrome")
        print("Pi: sudo apt install chromium-browser")
        print("Mac: Install Google Chrome")
        print(f"Content ready at: file://{html_path}")
            
    def send_heartbeat(self):
        """Send status update to server"""
        try:
            # Get system info
            uptime = int(time.time() - self.start_time)
            
            # Try to get CPU temperature (Pi specific)
            temp = None
            try:
                with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
                    temp = int(f.read()) / 1000.0
            except:
                pass
                
            current_item = self.get_current_item()
            current_asset = current_item['assetId'] if current_item else None
            
            heartbeat_data = {
                'status': 'online',
                'currentAsset': current_asset,
                'uptime': uptime,
                'temperature': temp
            }
            
            result = self.post_api_request(f"screens/{SCREEN_ID}/heartbeat", heartbeat_data)
            if result:
                print(f"Heartbeat sent - Asset: {current_asset}, Uptime: {uptime}s")
        except Exception as e:
            print(f"Heartbeat failed: {e}")
            
    def heartbeat_loop(self):
        """Background thread for sending heartbeats"""
        while True:
            self.send_heartbeat()
            time.sleep(HEARTBEAT_INTERVAL)
            
    def run(self):
        """Main client loop"""
        print(f"Starting Signage Client for {SCREEN_ID}")
        print(f"API: {API_BASE_URL}")
        
        self.start_time = time.time()
        
        # Start heartbeat thread
        heartbeat_thread = threading.Thread(target=self.heartbeat_loop, daemon=True)
        heartbeat_thread.start()
        
        # Initial playlist fetch
        self.update_playlist()
        
        # Main display loop
        while True:
            try:
                # Check for playlist updates
                self.update_playlist()
                
                # Display current content
                current_item = self.get_current_item()
                if current_item:
                    # Get asset info to find filename
                    asset_info = self.get_asset_info(current_item['assetId'])
                    if asset_info:
                        self.display_content(
                            current_item['assetId'],
                            asset_info['filename'],
                            current_item['type']
                        )
                
                time.sleep(POLL_INTERVAL)
                
            except KeyboardInterrupt:
                print("Shutting down...")
                if self.browser_process:
                    self.browser_process.terminate()
                break
            except Exception as e:
                print(f"Error in main loop: {e}")
                time.sleep(5)

if __name__ == "__main__":
    client = SignageClient()
    client.run()

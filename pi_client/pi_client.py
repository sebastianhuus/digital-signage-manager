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
from http.server import HTTPServer, SimpleHTTPRequestHandler
import socketserver

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
        self.browser_launched = False  # Simple flag instead of process checking
        self.http_server = None
        self.current_content_info = {}
        self.setup_cache_dir()
        self.start_http_server()
        
    def setup_cache_dir(self):
        """Create cache directory if it doesn't exist"""
        CACHE_DIR.mkdir(exist_ok=True)
        print(f"Cache directory: {CACHE_DIR}")
        
    def start_http_server(self):
        """Start local HTTP server to serve cached files"""
        os.chdir(CACHE_DIR)
        
        class CustomHandler(SimpleHTTPRequestHandler):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, directory=str(CACHE_DIR), **kwargs)
                
            def do_GET(self):
                if self.path == '/content-info.json':
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    # Get current content info from the client instance
                    import json
                    content_info = getattr(self.server, 'content_info', {})
                    response_data = json.dumps(content_info)
                    print(f"Serving content-info.json: {response_data}")
                    self.wfile.write(response_data.encode())
                else:
                    super().do_GET()
                    
            def log_message(self, format, *args):
                # Suppress default HTTP server logs except for content-info requests
                if 'content-info.json' in format % args:
                    print(f"HTTP: {format % args}")
                pass
        
        self.http_server = HTTPServer(('localhost', 8000), CustomHandler)
        self.http_server.content_info = self.current_content_info
        
        # Start server in background thread
        server_thread = threading.Thread(target=self.http_server.serve_forever, daemon=True)
        server_thread.start()
        print("Local HTTP server started on http://localhost:8000")
        
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
        
        # Convert to JSON strings for comparison to avoid dict comparison issues
        new_playlist_str = json.dumps(new_playlist, sort_keys=True)
        current_playlist_str = json.dumps(self.current_playlist, sort_keys=True)
        
        # Check if playlist changed
        if new_playlist_str != current_playlist_str:
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
            old_index = self.current_item_index
            self.current_item_index = (self.current_item_index + 1) % len(self.current_playlist)
            self.item_start_time = current_time
            current_item = self.current_playlist[self.current_item_index]
            print(f"Switching from item {old_index} to {self.current_item_index}: {current_item['assetId']}")
            
        return current_item
        
    def display_content(self, asset_id, filename, content_type):
        """Display content in fullscreen browser"""
        cache_path = CACHE_DIR / filename
        
        if not cache_path.exists():
            print(f"Cached file not found: {filename}")
            return
            
        # Update content info for HTTP server
        self.current_content_info = {
            "assetId": asset_id,
            "filename": filename,
            "type": content_type,
            "path": f"http://localhost:8000/{filename}"
        }
        self.http_server.content_info = self.current_content_info
            
        # Create HTML with proper crossfade using layered elements
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { margin: 0; padding: 0; background: black; overflow: hidden; cursor: none; }
                #content { width: 100vw; height: 100vh; object-fit: contain; }
            </style>
        </head>
        <body>
            <img id="content" />
            
            <script>
                let lastAssetId = '';
                const contentEl = document.getElementById('content');
                
                function checkForUpdates() {
                    fetch('http://localhost:8000/content-info.json')
                        .then(response => response.json())
                        .then(data => {
                            if (data.assetId !== lastAssetId) {
                                lastAssetId = data.assetId;
                                contentEl.src = data.path;
                            }
                        })
                        .catch(err => console.error('Update check failed:', err));
                }
                
                checkForUpdates();
                setInterval(checkForUpdates, 1000);
            </script>
        </body>
        </html>
        """
        
        # Write HTML file only once
        html_path = CACHE_DIR / "display.html"
        if not html_path.exists():
            with open(html_path, 'w') as f:
                f.write(html_content)
            
        # Only launch browser once
        if not self.browser_launched:
            self.launch_browser("http://localhost:8000/display.html")
            self.browser_launched = True
        
        print(f"Content updated: {filename} (Asset: {asset_id})")
        
    def launch_browser(self, url):
        """Launch browser in fullscreen (only called once)"""
        # Set display for Pi
        os.environ['DISPLAY'] = ':0'
        
        # Hide taskbar and cursor
        try:
            subprocess.run(['pcmanfm', '--desktop-off'], check=False)
            subprocess.run(['lxpanel', '--profile', 'LXDE-pi', '--command', 'exit'], check=False)
            subprocess.run(['unclutter', '-idle', '0.5', '-root'], check=False)
        except:
            pass
        
        browsers_to_try = [
            # Pi/Linux - try multiple approaches
            ['chromium-browser', '--kiosk', '--incognito', '--noerrdialogs', '--disable-infobars', '--user-data-dir=/tmp/signage-chrome'],
            ['chromium-browser', '--start-fullscreen', '--incognito', '--noerrdialogs', '--disable-infobars', '--user-data-dir=/tmp/signage-chrome'],
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
                # Launch browser as background process (non-blocking)
                self.browser_process = subprocess.Popen(
                    browser_cmd + [url],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                print(f"Browser launched: {browser_cmd[0]} (PID: {self.browser_process.pid})")
                return
            except FileNotFoundError:
                continue
                
        print("No suitable browser found.")
        print("Windows: Edge should work automatically, or install Chrome")
        print("Pi: sudo apt install chromium-browser")
        print("Mac: Install Google Chrome")
        print(f"Content ready at: {url}")
            
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
        last_displayed_asset = None
        
        while True:
            try:
                # Check for playlist updates
                self.update_playlist()
                
                # Check for content switching more frequently (every 1 second)
                for _ in range(POLL_INTERVAL):
                    # Get current content
                    current_item = self.get_current_item()
                    if current_item:
                        current_asset_id = current_item['assetId']
                        
                        # Only update display if content actually changed
                        if current_asset_id != last_displayed_asset:
                            # Get asset info to find filename
                            asset_info = self.get_asset_info(current_asset_id)
                            if asset_info:
                                self.display_content(
                                    current_asset_id,
                                    asset_info['filename'],
                                    current_item['type']
                                )
                                last_displayed_asset = current_asset_id
                    
                    time.sleep(1)  # Check every second for content switches
                
            except KeyboardInterrupt:
                print("Shutting down...")
                if self.browser_process:
                    self.browser_process.terminate()
                break
            except Exception as e:
                print(f"Error in main loop: {e}")
                print(f"Error type: {type(e)}")
                import traceback
                traceback.print_exc()
                time.sleep(5)

if __name__ == "__main__":
    client = SignageClient()
    client.run()

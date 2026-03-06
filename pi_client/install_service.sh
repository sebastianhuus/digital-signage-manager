#!/bin/bash

# Signage Manager Service Installer
# This script creates and enables the systemd service for the Pi client

set -e

echo "==================================="
echo "Signage Manager Service Installer"
echo "==================================="
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Verify pi_client.py exists in script directory
if [ ! -f "$SCRIPT_DIR/pi_client.py" ]; then
    echo "Error: pi_client.py not found in $SCRIPT_DIR"
    echo "Please run this script from the pi_client directory"
    exit 1
fi

# Get current user as default
CURRENT_USER=$(whoami)

# Prompt for username
read -p "Enter the username to run the service [$CURRENT_USER]: " USERNAME
USERNAME=${USERNAME:-$CURRENT_USER}

# Verify user exists
if ! id "$USERNAME" &>/dev/null; then
    echo "Error: User '$USERNAME' does not exist on this system"
    exit 1
fi

# Use script directory as working directory
WORKING_DIR="$SCRIPT_DIR"

echo ""
echo "Configuration Summary:"
echo "  User: $USERNAME"
echo "  Working Directory: $WORKING_DIR"
echo ""
read -p "Proceed with installation? (y/n): " CONFIRM

if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Installation cancelled"
    exit 0
fi

# Create service file content
SERVICE_CONTENT="[Unit]
Description=Signage Manager Client
After=network.target graphical-session.target
Wants=graphical-session.target

[Service]
Type=simple
User=$USERNAME
WorkingDirectory=$WORKING_DIR
ExecStartPre=/bin/sleep 10
ExecStart=/usr/bin/python3 $WORKING_DIR/pi_client.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target"

# Write service file
echo ""
echo "Creating service file..."
echo "$SERVICE_CONTENT" | sudo tee /etc/systemd/system/signage.service > /dev/null

# Reload systemd
echo "Reloading systemd daemon..."
sudo systemctl daemon-reload

# Enable service
echo "Enabling service to start on boot..."
sudo systemctl enable signage.service

# Start service
echo "Starting service..."
sudo systemctl start signage.service

# Wait a moment for service to start
sleep 2

# Check status
echo ""
echo "==================================="
echo "Service Status:"
echo "==================================="
sudo systemctl status signage.service --no-pager

echo ""
echo "==================================="
echo "Installation Complete!"
echo "==================================="
echo ""
echo "Useful commands:"
echo "  View logs:        sudo journalctl -u signage.service -f"
echo "  Restart service:  sudo systemctl restart signage.service"
echo "  Stop service:     sudo systemctl stop signage.service"
echo "  Disable service:  sudo systemctl disable signage.service"
echo ""

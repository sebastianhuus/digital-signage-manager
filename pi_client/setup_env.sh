#!/bin/bash

# Signage Manager Environment Setup
# This script helps configure the .env file for the Pi client

set -e

echo "======================================="
echo "Signage Manager Environment Setup"
echo "======================================="
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ENV_FILE="$SCRIPT_DIR/.env"

# Check if .env already exists
if [ -f "$ENV_FILE" ]; then
    echo "Warning: .env file already exists at $ENV_FILE"
    read -p "Do you want to overwrite it? (y/n): " OVERWRITE
    if [[ ! "$OVERWRITE" =~ ^[Yy]$ ]]; then
        echo "Setup cancelled"
        exit 0
    fi
    echo ""
fi

# Prompt for API URL
echo "Enter the Signage Manager API URL"
echo "Example: https://your-app.vercel.app"
read -p "API URL: " API_URL

# Validate URL format
if [[ ! "$API_URL" =~ ^https?:// ]]; then
    echo "Error: URL must start with http:// or https://"
    exit 1
fi

# Remove trailing slash if present
API_URL="${API_URL%/}"

echo ""
echo "Enter the API Key for this screen"
echo "(Get this from the /screens page in the web dashboard)"
read -p "API Key: " API_KEY

if [ -z "$API_KEY" ]; then
    echo "Error: API Key cannot be empty"
    exit 1
fi

echo ""
echo "Enter the Screen ID"
echo "Example: tv-1, lobby-display, etc."
read -p "Screen ID: " SCREEN_ID

if [ -z "$SCREEN_ID" ]; then
    echo "Error: Screen ID cannot be empty"
    exit 1
fi

echo ""
echo "Enter the poll interval in seconds (default: 30)"
read -p "Poll Interval [30]: " POLL_INTERVAL
POLL_INTERVAL=${POLL_INTERVAL:-30}

echo ""
echo "Enter the heartbeat interval in seconds (default: 60)"
read -p "Heartbeat Interval [60]: " HEARTBEAT_INTERVAL
HEARTBEAT_INTERVAL=${HEARTBEAT_INTERVAL:-60}

echo ""
echo "Enter the inactive poll interval in seconds (default: 300)"
read -p "Inactive Poll Interval [300]: " INACTIVE_POLL_INTERVAL
INACTIVE_POLL_INTERVAL=${INACTIVE_POLL_INTERVAL:-300}

echo ""
echo "Enter the inactive heartbeat interval in seconds (default: 300)"
read -p "Inactive Heartbeat Interval [300]: " INACTIVE_HEARTBEAT_INTERVAL
INACTIVE_HEARTBEAT_INTERVAL=${INACTIVE_HEARTBEAT_INTERVAL:-300}

echo ""
echo "Enter active hours start time in 24h format (default: 07:00)"
read -p "Active Start [07:00]: " ACTIVE_START
ACTIVE_START=${ACTIVE_START:-07:00}

echo ""
echo "Enter active hours end time in 24h format (default: 22:00)"
read -p "Active End [22:00]: " ACTIVE_END
ACTIVE_END=${ACTIVE_END:-22:00}

# Show summary
echo ""
echo "======================================="
echo "Configuration Summary:"
echo "======================================="
echo "API URL:             $API_URL"
echo "API Key:             ${API_KEY:0:8}...${API_KEY: -4}"
echo "Screen ID:           $SCREEN_ID"
echo "Poll Interval:       $POLL_INTERVAL seconds"
echo "Heartbeat Interval:  $HEARTBEAT_INTERVAL seconds"
echo "Inactive Poll:       $INACTIVE_POLL_INTERVAL seconds"
echo "Inactive Heartbeat:  $INACTIVE_HEARTBEAT_INTERVAL seconds"
echo "Active Hours:        $ACTIVE_START - $ACTIVE_END"
echo ""
read -p "Save this configuration? (y/n): " CONFIRM

if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Setup cancelled"
    exit 0
fi

# Create .env file
cat > "$ENV_FILE" <<EOF
# Signage Manager Configuration
# Generated on $(date)

# API Configuration
SIGNAGE_API_URL=$API_URL
SIGNAGE_API_KEY=$API_KEY
SIGNAGE_SCREEN_ID=$SCREEN_ID

# Polling Configuration
SIGNAGE_POLL_INTERVAL=$POLL_INTERVAL
SIGNAGE_HEARTBEAT_INTERVAL=$HEARTBEAT_INTERVAL
SIGNAGE_INACTIVE_POLL_INTERVAL=$INACTIVE_POLL_INTERVAL
SIGNAGE_INACTIVE_HEARTBEAT_INTERVAL=$INACTIVE_HEARTBEAT_INTERVAL

# Active Hours (uses Pi local time)
SIGNAGE_ACTIVE_START=$ACTIVE_START
SIGNAGE_ACTIVE_END=$ACTIVE_END
EOF

echo ""
echo "======================================="
echo "Setup Complete!"
echo "======================================="
echo ""
echo "Configuration saved to: $ENV_FILE"
echo ""
echo "Next steps:"
echo "  1. Test the client:  python3 pi_client.py"
echo "  2. Install service:  ./install_service.sh"
echo ""

"""
Tests for the Pi client logic.

Since pi_client.py has module-level side effects (env loading, prints, config),
we patch the environment before importing so the module initializes cleanly.
"""

import os
import time
import json
from pathlib import Path
from unittest.mock import patch, MagicMock, PropertyMock
from datetime import time as dt_time

import pytest


# ---------------------------------------------------------------------------
# Helpers to import pi_client with controlled environment
# ---------------------------------------------------------------------------

def _import_pi_client(**env_overrides):
    """Import pi_client module with patched environment and mocked side effects."""
    import importlib
    import sys

    env = {
        "SIGNAGE_API_URL": "http://test-server",
        "SIGNAGE_API_KEY": "test-key-12345",
        "SIGNAGE_SCREEN_ID": "test-screen-1",
        "SIGNAGE_POLL_INTERVAL": "30",
        "SIGNAGE_HEARTBEAT_INTERVAL": "60",
        "SIGNAGE_INACTIVE_POLL_INTERVAL": "300",
        "SIGNAGE_INACTIVE_HEARTBEAT_INTERVAL": "300",
        "SIGNAGE_ACTIVE_START": "07:00",
        "SIGNAGE_ACTIVE_END": "22:00",
        "SIGNAGE_SLEEP_WHEN_INACTIVE": "true",
        **env_overrides,
    }

    # Remove cached module so we get a fresh import
    sys.modules.pop("pi_client", None)

    with patch.dict(os.environ, env, clear=False), \
         patch("builtins.print"):  # suppress module-level prints
        mod = importlib.import_module("pi_client")

    return mod


# ---------------------------------------------------------------------------
# Module-level function tests (no SignageClient instance needed)
# ---------------------------------------------------------------------------

class TestParseTime:
    def test_normal(self):
        mod = _import_pi_client()
        assert mod._parse_time("07:00") == dt_time(7, 0)
        assert mod._parse_time("22:30") == dt_time(22, 30)
        assert mod._parse_time("00:00") == dt_time(0, 0)

    def test_single_digit(self):
        mod = _import_pi_client()
        assert mod._parse_time("9:05") == dt_time(9, 5)


class TestIsActiveHours:
    def test_during_active_hours(self):
        mod = _import_pi_client(
            SIGNAGE_ACTIVE_START="07:00",
            SIGNAGE_ACTIVE_END="22:00",
        )
        with patch.object(mod, "datetime") as mock_dt:
            mock_dt.now.return_value.time.return_value = dt_time(12, 0)
            assert mod.is_active_hours() is True

    def test_before_active_hours(self):
        mod = _import_pi_client(
            SIGNAGE_ACTIVE_START="07:00",
            SIGNAGE_ACTIVE_END="22:00",
        )
        with patch.object(mod, "datetime") as mock_dt:
            mock_dt.now.return_value.time.return_value = dt_time(3, 0)
            assert mod.is_active_hours() is False

    def test_after_active_hours(self):
        mod = _import_pi_client(
            SIGNAGE_ACTIVE_START="07:00",
            SIGNAGE_ACTIVE_END="22:00",
        )
        with patch.object(mod, "datetime") as mock_dt:
            mock_dt.now.return_value.time.return_value = dt_time(23, 0)
            assert mod.is_active_hours() is False

    def test_wraps_midnight(self):
        """Active from 22:00 to 06:00 (overnight)."""
        mod = _import_pi_client(
            SIGNAGE_ACTIVE_START="22:00",
            SIGNAGE_ACTIVE_END="06:00",
        )
        with patch.object(mod, "datetime") as mock_dt:
            # 23:00 should be active
            mock_dt.now.return_value.time.return_value = dt_time(23, 0)
            assert mod.is_active_hours() is True

            # 03:00 should be active
            mock_dt.now.return_value.time.return_value = dt_time(3, 0)
            assert mod.is_active_hours() is True

            # 12:00 should be inactive
            mock_dt.now.return_value.time.return_value = dt_time(12, 0)
            assert mod.is_active_hours() is False


class TestIntervals:
    def test_active_intervals(self):
        mod = _import_pi_client(
            SIGNAGE_POLL_INTERVAL="30",
            SIGNAGE_INACTIVE_POLL_INTERVAL="300",
            SIGNAGE_HEARTBEAT_INTERVAL="60",
            SIGNAGE_INACTIVE_HEARTBEAT_INTERVAL="300",
        )
        with patch.object(mod, "is_active_hours", return_value=True):
            assert mod.get_poll_interval() == 30
            assert mod.get_heartbeat_interval() == 60

    def test_inactive_intervals(self):
        mod = _import_pi_client(
            SIGNAGE_POLL_INTERVAL="30",
            SIGNAGE_INACTIVE_POLL_INTERVAL="300",
            SIGNAGE_HEARTBEAT_INTERVAL="60",
            SIGNAGE_INACTIVE_HEARTBEAT_INTERVAL="300",
        )
        with patch.object(mod, "is_active_hours", return_value=False):
            assert mod.get_poll_interval() == 300
            assert mod.get_heartbeat_interval() == 300


class TestSleepWhenInactiveConfig:
    def test_defaults_to_true(self):
        mod = _import_pi_client()
        assert mod.SLEEP_WHEN_INACTIVE is True

    def test_explicit_false(self):
        mod = _import_pi_client(SIGNAGE_SLEEP_WHEN_INACTIVE="false")
        assert mod.SLEEP_WHEN_INACTIVE is False

    def test_explicit_no(self):
        mod = _import_pi_client(SIGNAGE_SLEEP_WHEN_INACTIVE="no")
        assert mod.SLEEP_WHEN_INACTIVE is False

    def test_explicit_yes(self):
        mod = _import_pi_client(SIGNAGE_SLEEP_WHEN_INACTIVE="yes")
        assert mod.SLEEP_WHEN_INACTIVE is True

    def test_explicit_one(self):
        mod = _import_pi_client(SIGNAGE_SLEEP_WHEN_INACTIVE="1")
        assert mod.SLEEP_WHEN_INACTIVE is True

    def test_explicit_zero(self):
        mod = _import_pi_client(SIGNAGE_SLEEP_WHEN_INACTIVE="0")
        assert mod.SLEEP_WHEN_INACTIVE is False


# ---------------------------------------------------------------------------
# SignageClient instance tests (with mocked __init__ dependencies)
# ---------------------------------------------------------------------------

def _make_client(mod, playlist=None):
    """Create a SignageClient with mocked __init__ side effects."""
    with patch.object(mod.SignageClient, "fetch_orientation", return_value="landscape"), \
         patch.object(mod.SignageClient, "setup_cache_dir"), \
         patch.object(mod.SignageClient, "start_http_server"), \
         patch("builtins.print"):
        client = mod.SignageClient()

    if playlist:
        client.current_playlist = playlist
        client.current_item_index = 0
        client.item_start_time = time.time()

    return client


class TestGetCurrentItem:
    def test_empty_playlist_returns_none(self):
        mod = _import_pi_client()
        client = _make_client(mod)
        assert client.get_current_item() is None

    def test_returns_current_item(self):
        mod = _import_pi_client()
        playlist = [
            {"assetId": "a1", "duration": 10, "type": "image"},
            {"assetId": "a2", "duration": 10, "type": "image"},
        ]
        client = _make_client(mod, playlist)
        item = client.get_current_item()
        assert item["assetId"] == "a1"

    def test_advances_after_duration(self):
        mod = _import_pi_client()
        playlist = [
            {"assetId": "a1", "duration": 5, "type": "image"},
            {"assetId": "a2", "duration": 5, "type": "image"},
        ]
        client = _make_client(mod, playlist)
        # Set start time to 10 seconds ago so duration has elapsed
        client.item_start_time = time.time() - 10
        with patch("builtins.print"):
            item = client.get_current_item()
        assert item["assetId"] == "a2"
        assert client.current_item_index == 1

    def test_wraps_around_playlist(self):
        mod = _import_pi_client()
        playlist = [
            {"assetId": "a1", "duration": 5, "type": "image"},
            {"assetId": "a2", "duration": 5, "type": "image"},
        ]
        client = _make_client(mod, playlist)
        client.current_item_index = 1
        client.item_start_time = time.time() - 10
        with patch("builtins.print"):
            item = client.get_current_item()
        assert item["assetId"] == "a1"
        assert client.current_item_index == 0


class TestGetCachedFilename:
    def test_finds_cached_file(self, tmp_path):
        mod = _import_pi_client()
        client = _make_client(mod)

        # Create fake cached file
        (tmp_path / "asset-123-image.png").touch()
        (tmp_path / "asset-456-other.jpg").touch()

        with patch.object(mod, "CACHE_DIR", tmp_path):
            assert client._get_cached_filename("asset-123") == "asset-123-image.png"
            assert client._get_cached_filename("asset-456") == "asset-456-other.jpg"

    def test_returns_none_when_not_cached(self, tmp_path):
        mod = _import_pi_client()
        client = _make_client(mod)

        with patch.object(mod, "CACHE_DIR", tmp_path):
            assert client._get_cached_filename("nonexistent") is None


class TestUpdatePlaylist:
    def test_new_playlist_downloads_assets(self):
        mod = _import_pi_client()
        client = _make_client(mod)

        playlist_response = {
            "items": [
                {"assetId": "a1", "duration": 10, "type": "image"},
            ]
        }
        asset_response = {
            "asset_id": "a1",
            "filename": "photo.png",
            "url": "http://blob/photo.png",
        }

        with patch.object(client, "get_playlist", return_value=playlist_response), \
             patch.object(client, "get_asset_info", return_value=asset_response), \
             patch.object(client, "download_asset") as mock_download, \
             patch("builtins.print"):
            result = client.update_playlist()

        assert result is True
        assert client.current_playlist == playlist_response["items"]
        mock_download.assert_called_once_with("a1", "http://blob/photo.png", "photo.png")

    def test_same_playlist_no_download(self):
        mod = _import_pi_client()
        items = [{"assetId": "a1", "duration": 10, "type": "image"}]
        client = _make_client(mod, playlist=items)

        with patch.object(client, "get_playlist", return_value={"items": items}), \
             patch.object(client, "download_asset") as mock_download:
            result = client.update_playlist()

        assert result is False
        mock_download.assert_not_called()

    def test_api_failure_returns_false(self):
        mod = _import_pi_client()
        client = _make_client(mod)

        with patch.object(client, "get_playlist", return_value=None):
            result = client.update_playlist()

        assert result is False


class TestMakeApiRequest:
    def test_strips_leading_slash(self):
        mod = _import_pi_client()
        client = _make_client(mod)

        mock_response = MagicMock()
        mock_response.text = '{"ok": true}'
        mock_response.json.return_value = {"ok": True}

        with patch.object(mod.requests, "get", return_value=mock_response) as mock_get, \
             patch("builtins.print"):
            result = client.make_api_request("/screens/test-screen-1/playlist")

        # Should not have double slashes in URL
        called_url = mock_get.call_args[0][0]
        assert "//" not in called_url.replace("http://", "")

    def test_returns_none_on_error(self):
        mod = _import_pi_client()
        client = _make_client(mod)

        with patch.object(mod.requests, "get", side_effect=mod.requests.RequestException("timeout")), \
             patch("builtins.print"):
            result = client.make_api_request("screens/test/playlist")

        assert result is None


class TestHeartbeatSleepBehavior:
    """Test that heartbeats are skipped during inactive hours when SLEEP_WHEN_INACTIVE=true."""

    def test_heartbeat_skipped_when_sleeping(self):
        mod = _import_pi_client(SIGNAGE_SLEEP_WHEN_INACTIVE="true")
        client = _make_client(mod)
        client.start_time = time.time()

        with patch.object(mod, "is_active_hours", return_value=False), \
             patch.object(client, "send_heartbeat") as mock_hb, \
             patch.object(mod, "get_heartbeat_interval", return_value=0), \
             patch("builtins.print"):
            # Simulate one iteration of the heartbeat loop
            if not mod.SLEEP_WHEN_INACTIVE or mod.is_active_hours():
                client.send_heartbeat()

        mock_hb.assert_not_called()

    def test_heartbeat_sent_when_active(self):
        mod = _import_pi_client(SIGNAGE_SLEEP_WHEN_INACTIVE="true")
        client = _make_client(mod)
        client.start_time = time.time()

        with patch.object(mod, "is_active_hours", return_value=True), \
             patch.object(client, "send_heartbeat") as mock_hb:
            if not mod.SLEEP_WHEN_INACTIVE or mod.is_active_hours():
                client.send_heartbeat()

        mock_hb.assert_called_once()

    def test_heartbeat_sent_when_sleep_disabled(self):
        mod = _import_pi_client(SIGNAGE_SLEEP_WHEN_INACTIVE="false")
        client = _make_client(mod)
        client.start_time = time.time()

        with patch.object(mod, "is_active_hours", return_value=False), \
             patch.object(client, "send_heartbeat") as mock_hb:
            if not mod.SLEEP_WHEN_INACTIVE or mod.is_active_hours():
                client.send_heartbeat()

        mock_hb.assert_called_once()


class TestDisplayContent:
    def test_updates_content_info(self, tmp_path):
        mod = _import_pi_client()
        client = _make_client(mod)
        client.http_server = MagicMock()

        # Create fake cached file
        (tmp_path / "photo.png").touch()

        with patch.object(mod, "CACHE_DIR", tmp_path), \
             patch("builtins.print"):
            client.display_content("a1", "photo.png", "image")

        assert client.current_content_info["assetId"] == "a1"
        assert client.current_content_info["filename"] == "photo.png"

    def test_missing_file_does_nothing(self, tmp_path):
        mod = _import_pi_client()
        client = _make_client(mod)

        with patch.object(mod, "CACHE_DIR", tmp_path), \
             patch("builtins.print"):
            client.display_content("a1", "nonexistent.png", "image")

        assert client.current_content_info == {}

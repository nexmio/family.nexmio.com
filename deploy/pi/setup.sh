#!/usr/bin/env bash
# Sets up a Raspberry Pi (Raspberry Pi OS Lite, 64 bit, a Pi 4 or newer) to run Nexmio Family and to show
# the default dashboard full screen on the connected TV.
#
# NOT TESTED on a real Raspberry Pi yet (written on 19 Nov 2026). Read it first and expect to adjust it.
# Run it as the normal user:  bash setup.sh
set -euo pipefail

IMAGE="${IMAGE:-nexmio-family}"       # build the image on the Pi first:  podman build -t nexmio-family .
PORT=8080
DATA_DIR="$HOME/nexmio-family-data"
URL="http://localhost:${PORT}/"

sudo apt-get update
sudo apt-get install -y podman cage chromium-browser fonts-noto-color-emoji unclutter

mkdir -p "$DATA_DIR"
podman rm -f nexmio-family >/dev/null 2>&1 || true
podman run -d --name nexmio-family --restart unless-stopped -p "${PORT}:8080" \
  --userns=keep-id --user "$(id -u):$(id -g)" -v "${DATA_DIR}:/data:Z" "$IMAGE"

# the container must start with the Pi
mkdir -p "$HOME/.config/systemd/user"
podman generate systemd --new --files --name nexmio-family >/dev/null 2>&1 || true
cp container-nexmio-family.service "$HOME/.config/systemd/user/" 2>/dev/null || true
loginctl enable-linger "$USER"

# the screen: cage runs one program full screen. Chromium shows the dashboard without any buttons.
sudo tee /etc/systemd/system/nexmio-screen.service >/dev/null <<UNIT
[Unit]
Description=Nexmio Family dashboard on the screen
After=network-online.target
Wants=network-online.target

[Service]
User=$USER
PAMName=login
TTYPath=/dev/tty7
StandardInput=tty
Environment=XDG_RUNTIME_DIR=/run/user/$(id -u)
ExecStart=/usr/bin/cage -s -- /usr/bin/chromium-browser --kiosk --noerrdialogs --disable-infobars --no-first-run --check-for-update-interval=31536000 --disable-session-crashed-bubble ${URL}
Restart=always
RestartSec=5

[Install]
WantedBy=graphical.target
UNIT
sudo systemctl daemon-reload
sudo systemctl enable nexmio-screen.service
echo "Done. Set the family code with:  podman exec -it nexmio-family python -m app.cli set-code"
echo "Then reboot. The TV shows ${URL}"

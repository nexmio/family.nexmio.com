# Raspberry Pi as a wall dashboard (untested guide)

This is a first guide for phase 7. It has **not been tried on a real Pi yet**. It will probably need adjusting.

## What you need
- A Raspberry Pi 4 or newer with Raspberry Pi OS Lite (64 bit), on the same network as the family phones.
- A screen or TV on HDMI. Touch is optional.
- This repository on the Pi (`git clone`), so the image can be built there.

## Steps
1. `podman build -t nexmio-family .` in the repository folder (the first build takes a while on a Pi).
2. `bash deploy/pi/setup.sh`. It installs `podman`, `cage` (one program full screen) and Chromium, starts the app and makes the screen start at boot.
3. `podman exec -it nexmio-family python -m app.cli set-code` to choose the family code.
4. Reboot. The screen shows the default dashboard. Open `http://<the Pi's address>:8080/admin` from a phone to set everything up.

## Things to check on the real device
- Chromium in kiosk mode under `cage` (you have had trouble with Chromium kiosks before: if it flickers or freezes, try `--ozone-platform=wayland` or Firefox ESR).
- Rotation for a portrait screen (`wlr-randr` under cage) and the direction of touch.
- Screen blanking and brightness at night: the dashboard has a night mode (black screen with a dim clock), but the screen itself stays on.
- An SSD instead of an SD card if the Pi runs all day, and a daily copy of the data folder (Settings has a backup button).
- The code is sent over plain HTTP on the home network (assumption A7).

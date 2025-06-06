# MIDI to Blackmagic ATEM Controller

A Node.js application that connects a MIDI controller (e.g., Akai APC Mini) to a Blackmagic ATEM switcher, allowing you to control ATEM program, preview, macros, transitions, and audio mixer via MIDI. It also provides LED feedback on your MIDI device and a WebSocket interface to broadcast ATEM state changes in real time.

---

## Features

- Map MIDI note buttons to ATEM program/preview inputs and macros.
- Map MIDI control change (CC) knobs/sliders to ATEM audio mixer, transitions, and DVE positions.
- LED feedback on MIDI device buttons showing program/preview states.
- WebSocket server broadcasting ATEM state updates to connected clients.
- Express server serving frontend static files and mappings configuration.
- REST endpoint `/mappings` serving the MIDI-to-ATEM mappings JSON file.

---

## Requirements

- Node.js 16+
- Blackmagic ATEM switcher accessible on your network.
- MIDI controller (e.g., Akai APC Mini) connected to your computer.
- `midi` native bindings (you may need build tools installed).

---

## Setup

1. Clone this repository:

   ```bash
   git clone https://github.com/yourusername/atem-midi-controller.git
   cd atem-midi-controller

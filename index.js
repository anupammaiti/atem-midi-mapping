require('dotenv').config();
const { Atem } = require('atem-connection');
const midi = require('midi');
const fs = require('fs');

const mappings = JSON.parse(fs.readFileSync('mappings.json'));
const MIDI_INPUT_INDEX = parseInt(process.env.MIDI_INPUT_PORT_INDEX) || 0;
const MIDI_OUTPUT_INDEX = parseInt(process.env.MIDI_OUTPUT_PORT_INDEX) || 1;
const ATEM_IP = process.env.ATEM_IP || '192.168.0.116';

const atem = new Atem();
const midiInput = new midi.Input();
const midiOutput = new midi.Output();

// Connect to ATEM
atem.connect(ATEM_IP);
atem.on('connected', () => {
  console.log(`🎞 Connected to ATEM Switcher at ${ATEM_IP}`);
});

// List available MIDI ports
console.log('Available MIDI Input Ports:');
for (let i = 0; i < midiInput.getPortCount(); i++) {
  console.log(`  [${i}] ${midiInput.getPortName(i)}`);
}

console.log('Available MIDI Output Ports:');
for (let i = 0; i < midiOutput.getPortCount(); i++) {
  console.log(`  [${i}] ${midiOutput.getPortName(i)}`);
}

// Open MIDI ports
midiInput.openPort(MIDI_INPUT_INDEX);
console.log(`Opened MIDI Input Port: [${MIDI_INPUT_INDEX}] ${midiInput.getPortName(MIDI_INPUT_INDEX)}`);

midiOutput.openPort(MIDI_OUTPUT_INDEX);
console.log(`Opened MIDI Output Port: [${MIDI_OUTPUT_INDEX}] ${midiOutput.getPortName(MIDI_OUTPUT_INDEX)}`);

console.log('🎛 MIDI to ATEM Controller Running...');

// LED feedback function
function updateButtonLED(note, color) {
  let velocity = 0; // off by default
  if (color === 'red') velocity = 127 ;
  else if (color === 'green') velocity = 100 ;
  else if (color === 'amber') velocity = 127 ;

  midiOutput.sendMessage([0x90, note, velocity]);
}

// Handle Note Input
function handleNoteInput(note, velocity) {
  if (velocity === 0) return; // Note Off, ignore or handle if needed

  const mapping = mappings.noteMappings[note];
  if (!mapping) {
    console.log(`No mapping found for MIDI note ${note}`);
    return;
  }

  console.log(`MIDI Note ${note} pressed with velocity ${velocity}, mapped to action:`, mapping);

  switch (mapping.action) {
    case 'program':
      console.log(`Changing ATEM Program input to ${mapping.input}`);
      atem.changeProgramInput(mapping.input);
      break;

    case 'preview':
      console.log(`Changing ATEM Preview input to ${mapping.input}`);
      atem.changePreviewInput(mapping.input);
      break;

    case 'macro':
      console.log(`Running ATEM Macro #${mapping.macroIndex}`);
      atem.runMacro(mapping.macroIndex);
      break;
    case 'cut':
      console.log(`Performing CUT transition`);
      atem.cut();
    case 'auto':
      console.log(`Performing CUT transition`);
      atem.autoTransition();
    break;

    default:
      console.log(`Unknown action type: ${mapping.action} for MIDI note ${note}`);
  }
}

// Handle Control Change Input
function handleCCInput(controller, value) {
  if (!mappings.controlChangeMappings || !mappings.controlChangeMappings[controller]) {
    console.log(`No mapping found for CC controller ${controller}`);
    return;
  }

  const mapping = mappings.controlChangeMappings[controller];
  console.log(`MIDI CC ${controller} changed to value ${value}, mapped to action:`, mapping);

  switch (mapping.action) {
    case 'audioGain':
      const gain = (value / 127) * 6 - 60; // -60dB to +6dB
      atem.setAudioMixerInputGain(mapping.channel, gain);
      break;

    case 'transitionRate':
      const rate = Math.round((value / 127) * 250); // 0-250 frames
      atem.setTransitionRate(rate);
      console.log(`🎚 Set transition rate to ${rate} frames`);
      break;

    case 'dveX':
      const x = (value / 127) * 2 - 1; // -1 to +1
      atem.setUpstreamKeyerDVESettings(0, { positionX: x });
      console.log(`💆 DVE X position: ${x.toFixed(2)}`);
      break;

    case 'dveY':
      const y = (value / 127) * 2 - 1; // -1 to +1
      atem.setUpstreamKeyerDVESettings(0, { positionY: y });
      console.log(`💆 DVE Y position: ${y.toFixed(2)}`);
      break;

    case 'transitionPosition':
      const position = Math.round((value / 127) * 10000); // 0–10000 expected by ATEM
      console.log(`🎚 Setting manual transition position: ${position}`);
      atem.setTransitionPosition(position);
      if (value === 127) {
        console.log("🚀 Triggering auto transition");
        atem.autoTransition();
      }
      break;

    case 'swapPreviewProgram':
      const me = atem.state?.video?.mixEffects?.[0];
      if (!me) {
        console.log('⚠️ ATEM mix effect state not ready.');
        return;
      }
      console.log(`🔁 Swapping Program (${me.programInput}) <-> Preview (${me.previewInput})`);
      atem.changeProgramInput(me.previewInput);
      atem.changePreviewInput(me.programInput);
      break;

    default:
      console.log(`Unknown CC action type: ${mapping.action} for controller ${controller}`);
  }
}

// Single MIDI message handler with logging
midiInput.on('message', (deltaTime, message) => {
  const [status, data1, data2] = message;
  const messageType = status & 0xf0;

  let type = 'Unknown';
  if (messageType === 0x90 && data2 > 0) type = 'Note On';
  else if (messageType === 0x80 || (messageType === 0x90 && data2 === 0)) type = 'Note Off';
  else if (messageType === 0xb0) type = 'Control Change';

  console.log(`[MIDI IN] Type: ${type}, Status: 0x${status.toString(16)}, Data1: ${data1}, Data2: ${data2}`);

  if (type === 'Note On') {
    handleNoteInput(data1, data2);
  } else if (type === 'Control Change') {
    handleCCInput(data1, data2);
  }
});

// Update LEDs when ATEM state changes to reflect Program (red) and Preview (green)
atem.on('stateChanged', () => {
  const state = atem.state;
  if (!state || !state.video || !state.video.mixEffects || !state.video.mixEffects[0]) return;

  const me0 = state.video.mixEffects[0];

  for (const note in mappings.noteMappings) {
    const mapping = mappings.noteMappings[note];
    const noteNum = parseInt(note);

    if (mapping.action === 'program') {
      const isProgram = me0.programInput === mapping.input;
      updateButtonLED(noteNum, isProgram ? 'red' : null);
    } else if (mapping.action === 'preview') {
      const isPreview = me0.previewInput === mapping.input;
      updateButtonLED(noteNum, isPreview ? 'green' : null);
    }
  }

  const program = atem.state?.video?.mixEffects?.[0]?.programInput;
  const preview = atem.state?.video?.mixEffects?.[0]?.previewInput;
  broadcast({ type: 'atemUpdate', program, preview });
});


const express = require('express');
const app = express();
const http = require('http').createServer(app);
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server: http });
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

// WebSocket Broadcast Helper
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

module.exports = {
  server: http,
  wss,
  broadcast
};
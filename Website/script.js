//  INFO POP UP - A
// function for opening form and its display setting
function openForm() {
  document.getElementById("myForm").style.display = "block";
}
// function for closing form and its display setting
function closeForm() {
  document.getElementById("myForm").style.display = "none";
}

// EMILI
//  Palette for the bubbles 
const palette = [
  '#ff70ba',
  '#8a79b7',
  '#1989d8',
  '#8ec55e',
  '#ffde59',
  '#c61f72',
  '#ffad85'
];
// EMILI
let angle = 0;
let speed = 1;
let scaleFactor = 1;

// How many bubbles are visible before any beat is turned on
const startBubbles = 25;  //fewer balls at the start so it can be more intense afer varje beat
// How many extra bubbles each active beat adds
const bubblesPerBeat = 2;
// The most bubbles that can be on screen
const maxBubbles = 50;

// BEATS - A
// Set that holds which beats that are on, 0-7 button pad, 8-20 piano
let activeKeys = new Set();

// The beat the pots control. null = all beats that are on.
let selected = null;

// Which keyboard key belongs to which button (same order as the Arduino sketch)
// const buttonKeys = 'asdfghjk';
const buttonKeys = 'asdfghjklzxcvbnmqwert';   // keyboard backup for all 21 beats

// The speed pot picks one of these. The middle one is normal speed.
const speedSteps = [0.25, 0.5, 1, 2, 4];

// KEYBOARD BACKUP for the pots (number row)
// 1-5 = speed steps, 6-0 = pitch steps
const speedKeys = '12345';
const pitchKeys = '67890';
const pitchSteps = [-12, -6, 0, 6, 12];

// POTS (two linear pots on the Arduino Due, 12-bit: 0-4095)
// What each pot does, in the order of the Arduino pins (A0, A1).
// 'pitch' = pitch of the chosen beat(s)   (-12 to +12 semitones)
// 'speed' = speed of the chosen beat(s)   (picks one of the speedSteps)
// If a beat is clicked (selected) only that beat changes, otherwise all beats that are on.
// (Other option if you ever want it: 'tempo')
const potRoles = ['pitch', 'speed'];

// If a pot never quite reaches 0% / 100%, change these two numbers
const POT_LOW = 30;      // reading at the very bottom end
const POT_HIGH = 4065;   // reading at the very top end

const keysDisplay = document.getElementById('keys');
const targetDisplay = document.getElementById('target');
const statusDisplay = document.getElementById('status');
const bpmDisplay = document.getElementById('bpm');

function setup() {
  let cnv = createCanvas(window.innerWidth, window.innerHeight);
  cnv.parent('generativeCanvas');
  updateKeyList();

  document.getElementById('reset').addEventListener('click', (e) => {
    resetAll();
    e.target.blur();   // otherwise Space/Enter would "click" the button again
  });

  // The click also unlocks audio, which browsers require
  document.getElementById('connect').addEventListener('click', async (e) => {
    e.target.blur();
    startAudio();
    await connectArduino();
  });

  // // Pressing anywhere outside the controls/info popup deselects the chosen beat
  // document.addEventListener('pointerdown', (e) => {
  //   if (e.target.closest('.controls') || e.target.closest('.whyBean')) return;
  //   selected = null;
  //   updateKeyList();
  // });
  // document.getElementById('removeYes').addEventListener('click', () => {
  //   if (pendingRemove !== null && activeKeys.has(pendingRemove)) {
  //     toggleButton(pendingRemove);   // was on -> off
  //   }
  //   closeRemoveDialog();
  // });

  document.getElementById('removeYes').addEventListener('click', confirmRemove);
  document.getElementById('removeNo').addEventListener('click', closeRemoveDialog);

  // document.getElementById('removeNo').addEventListener('click', closeRemoveDialog);
  document.getElementById('removeYes').addEventListener('click', confirmRemove);

  document.getElementById('removeNo').addEventListener('click', cancelRemove);

  // Pressing anywhere outside the controls/info popup/dialog deselects the chosen beat
  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.controls') || e.target.closest('.whyBean') || e.target.closest('.confirm-popup')) return;
    selected = null;
    closeRemoveDialog();
    updateKeyList();
  });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

//  Toggling 
function toggleButton(i) {
  if (activeKeys.has(i)) {
    activeKeys.delete(i);   // was on -> off
    if (selected === i) selected = null;
  } else {
    activeKeys.add(i);    // was off -> on
  }
  updateKeyList();
}

function resetAll() {
  activeKeys.clear();
  selected = null;
  closeRemoveDialog();  //remove beat
  for (const inst of instruments) {   // back to normal speed and pitch
    inst.rate = 1;
    inst.pitch = 0;
  }
  updateKeyList();

}

// The chips showing active beats 
function updateKeyList() {
  keysDisplay.textContent = '';
  targetDisplay.textContent = (selected !== null) ? instruments[selected].name : 'Beats playing';

  if (activeKeys.size === 0) {
    keysDisplay.textContent = 'Choose your beat!';
    return;
  }

  for (const i of activeKeys) {
    const inst = instruments[i];

    // let label = buttonKeys[i].toUpperCase() + ' ' + inst.name;
    let label = inst.name;
    if (inst.rate !== 1) label += '  ×' + inst.rate;
    if (inst.pitch !== 0) label += '  ' + (inst.pitch > 0 ? '+' : '') + inst.pitch;

    const chip = document.createElement('span');
    chip.className = 'key-chip' + (i === selected ? ' selected' : '');
    chip.textContent = label;
    // chip.addEventListener('pointerdown', () => {
    //   selected = (selected === i) ? null : i;   // press again to deselect
    //   updateKeyList();
    // });

    // remove beat
    chip.addEventListener('pointerdown', (e) => {
      e.stopPropagation();        // so the document listener doesn't deselect it right away
      selected = i;
      updateKeyList();
      openRemoveDialog(i);
    });

    keysDisplay.appendChild(chip);
  }
}

// Applies a control value (v = 0.0 to 1.0) to the chosen beat(s) 
// Used by the pots
function applyControl(role, v) {
  if (!role) return;

  if (role === 'tempo') {
    bpm = Math.round(80 + v * 100);
    bpmDisplay.textContent = bpm;
    return;
  }

  // Which beats does this turn affect
  const targets = (selected !== null) ? [selected] : [...activeKeys];

  for (const i of targets) {
    if (role === 'speed') {
      const index = Math.min(Math.floor(v * speedSteps.length), speedSteps.length - 1);
      instruments[i].rate = speedSteps[index];
    }

    if (role === 'pitch') {
      instruments[i].pitch = Math.round(-12 + v * 24);
    }
  }
  updateKeyList();
}

// Sets speed or pitch from a keyboard step (index into speedSteps / pitchSteps)
function applyStep(role, index) {
  const targets = (selected !== null) ? [selected] : [...activeKeys];

  for (const i of targets) {
    if (role === 'speed') instruments[i].rate = speedSteps[index];
    if (role === 'pitch') instruments[i].pitch = pitchSteps[index];
  }
  updateKeyList();
}

// pots
const lastPotValue = [];   // last value that was actually used, per pot

function handlePot(id, value) {
  const role = potRoles[id];
  if (!role) return;   // a pot with no job

  // only reacts when the pot has really moved (48 on the 0-4095 scale)
  if (lastPotValue[id] !== undefined && Math.abs(value - lastPotValue[id]) < 48) return;
  lastPotValue[id] = value;

  // turn the raw reading into 0.0 - 1.0, trimming the ends
  const v = Math.min(Math.max((value - POT_LOW) / (POT_HIGH - POT_LOW), 0), 1);

  applyControl(role, v);
}

//ARDUINO

// Shows the connection status under the button.
// ok = true (green), false (red), null (neutral)
function setStatus(text, ok) {
  statusDisplay.textContent = text;
  statusDisplay.className = (ok === true) ? 'ok' : (ok === false) ? 'fail' : '';
}
// Reading the Arduino over serial (Web Serial, Chrome/Edge) 
async function connectArduino() {
  if (!('serial' in navigator)) {
    setStatus('Connection failed ✗', false);   // changed
    return;
  }
  try {
    const port = await navigator.serial.requestPort();   // browser shows a port picker
    await port.open({ baudRate: 115200 });                // must match Serial.begin()
    setStatus('Connected ✓', true);                       // changed

    const decoder = new TextDecoderStream();   // bytes -> text
    port.readable.pipeTo(decoder.writable);
    const reader = decoder.readable.getReader();

    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();

      if (done) break;
      buffer += value;
      const lines = buffer.split('\n');   // text can arrive in pieces,
      buffer = lines.pop();               // so keep the unfinished last piece
      for (const line of lines) handleLine(line.trim());
    }

  } catch (err) {
    setStatus('Connection failed ✗', false);   // changed
    console.log(err.message);                   // the technical reason is still visible in the console
  }
}

// "B3" = button 3 pressed (only sent by the serial-only Arduino sketch)
// "P0:2048" = pot 0 (pitch) has value 2048 (0-4095)
// "P1:1000" = pot 1 (speed) has value 1000 (0-4095)
function handleLine(line) {
  console.log(line);
  if (line.startsWith('B')) {
    const i = parseInt(line.slice(1));
    if (i >= 0 && i < instruments.length) toggleButton(i);
  } else if (line.startsWith('P')) {
    const [id, value] = line.slice(1).split(':').map(Number);
    if (!isNaN(id) && !isNaN(value)) handlePot(id, value);
  }
}

// Buttons keyboard, or the Arduino sketch that types these keys
function keyPressed() {
  startAudio();   // a key press also counts as the click browsers require for sound

  // if (keyCode === ESCAPE) {
  //   resetAll();
  //   return; }

  if (keyCode === ESCAPE) {
    if (pendingRemove !== null) {   // dialog open: Escape just cancels it
      closeRemoveDialog();
      return;
    }
    resetAll();
    return;
  }

  // Delete (or Backspace, which is the "delete" key on Mac) removes the chosen beat
  if (keyCode === DELETE || keyCode === BACKSPACE) {
    confirmRemove();
    return false;   // stops the browser from also going "back" on Backspace
  }

  if (key.length === 1) {
    const i = buttonKeys.indexOf(key.toLowerCase());
    if (i >= 0) toggleButton(i);
  }

  // Number keys: keyboard backup for speed (1-5) and pitch (6-0)
  if (key.length === 1) {
    const s = speedKeys.indexOf(key);
    const p = pitchKeys.indexOf(key);
    if (s >= 0) { applyStep('speed', s); return; }
    if (p >= 0) { applyStep('pitch', p); return; }
  }

  if (keyCode === ESCAPE) {
    if (pendingRemove !== null) {   // dialog open: Escape = Cancel
      cancelRemove();
      return;
    }
    resetAll();
    return;
  }
}

// Visuals
function draw() {
  clear();
  let n = activeKeys.size;

  // More active beats = faster, bigger animation
  let targetSpeed = 1 + n * 0.15;
  let targetScale = 1 + n * 0.12;

  speed = lerp(speed, targetSpeed, 0.1);
  scaleFactor = lerp(scaleFactor, targetScale, 0.1);

  // Centre of the visualisation
  let centerX = width / 2;
  let centerY = height / 2;

  // How far the bubbles travel
  let spaceX = min(width * 0.35, height * 0.55);
  let spaceY = height * 0.32;

  // start with a few bubbels and with every active beat more bubbles get added 
  let bubbleCount = min(startBubbles + n * bubblesPerBeat, maxBubbles);

  for (let i = 0; i < bubbleCount; i++) { // draws one bubble 

    // Each bubble has its own movement
    let x = centerX + sin(angle * (0.5 + i * 0.03) + i * 2.4) * spaceX;
    let y = centerY + cos(angle * (0.4 + i * 0.025) + i * 3.1) * spaceY;

    // Different bubble sizes
    let baseSize;
    if (i % 8 === 0) {
      baseSize = 90;
    } else if (i % 4 === 0) {
      baseSize = 55;
    } else {
      baseSize = 18 + (i % 5) * 13;
    }

    let pulse = sin(angle * 2 + i) * 8;

    // Some bubbles grow extra when more beats are on
    let extraGrowth = (i % 4 === 0) ? n * 12 : n * 3;
    let ballSize = (baseSize + pulse + extraGrowth) * scaleFactor;

    let ballColor = color(palette[i % palette.length]);
    push();

    // Every third bubble is outline only
    if (i % 3 === 0) {
      noFill();
      stroke(ballColor);
      strokeWeight(3);
    } else {
      ballColor.setAlpha(150);
      fill(ballColor);
      noStroke();
    }
    circle(x, y, ballSize);
    pop();
  }

  angle += 0.01 * speed;
}

// Remove beat 
const removeDialog = document.getElementById('removeDialog');
const removeText = document.getElementById('removeText');
let pendingRemove = null;   // the beat the dialog is about

function openRemoveDialog(i) {
  pendingRemove = i;
  removeText.textContent = 'Remove "' + instruments[i].name + '"?';
  removeDialog.style.display = 'block';
}

function closeRemoveDialog() {
  pendingRemove = null;
  removeDialog.style.display = 'none';
}

// Cancel: close the dialog and deselect the beat
function cancelRemove() {
  selected = null;
  closeRemoveDialog();
  updateKeyList();   // redraws the chips, so the yellow/pink one goes back to normal
}

// Removes the beat the dialog is about (or the selected beat, if the dialog was cancelled)
function confirmRemove() {
  const i = (pendingRemove !== null) ? pendingRemove : selected;
  if (i !== null && activeKeys.has(i)) {
    toggleButton(i);   // was on -> off
  }
  closeRemoveDialog();
}
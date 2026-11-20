//  Settings 
let bpm = 150;            // global tempo
const STEPS = 16;         // 16 steps = 1 bar (4 steps per beat)

// Internal state 
let audioCtx = null;
let bus = null;           // every sound passes through this filter
let noiseBuf = null;      // white noise, used for hats and claps
let tickCount = 0;        // how many 16th-note ticks have passed
let nextStepTime = 0;     // when (on the audio clock) the next tick sounds

// Melodies: semitones above the base note for each step
const ACID_NOTES = [0, 0, 0, 3, 0, 0, 7, 0, 0, 5, 0, 0, 10, 0, 0, 0];   // base 110 Hz
const PLUCK_NOTES = [0, 3, 0, 0, 7, 0, 0, 5, 0, 0, 10, 0, 0, 12, 0, 0]; // base 220 Hz

// Instruments: 21 in total
// Index 0-7   = the 8 buttons (B0-B7)
// Index 8-20  = the 13 piano keys (B8-B20)
// "steps": 16 slots, 1 = play, 0 = silent. Every 4 slots is one beat.
// "rate":  speed multiplier (0.25 - 4). "pitch": semitones (-12 - +12).
// The play functions get: time, step, length of one step, pitch ratio (p).
const instruments = [
    // ----- Buttons -----
    // {
    //     name: 'Kick', rate: 1, pitch: 0, steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    //     play: (t, s, len, p) => playKick(t, p)
    // },
    // {
    //     name: 'Hat', rate: 1, pitch: 0, steps: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    //     play: (t, s, len, p) => playNoise(t, 'highpass', 7000 * p, 0.05, 0.3)
    // },
    // {
    //     name: 'Open hat', rate: 1, pitch: 0, steps: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    //     play: (t, s, len, p) => playNoise(t, 'highpass', 7000 * p, 0.25, 0.3)
    // },
    // {
    //     name: 'Clap', rate: 1, pitch: 0, steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    //     play: (t, s, len, p) => playNoise(t, 'bandpass', 1500 * p, 0.15, 0.7)
    // },
    // {
    //     name: 'Bass', rate: 1, pitch: 0, steps: [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1],
    //     play: (t, s, len, p) => playTone(t, 'sawtooth', 55 * p, 0.18, 0.5, 400 * p)
    // },
    // {
    //     name: 'Perc', rate: 1, pitch: 0, steps: [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0],
    //     play: (t, s, len, p) => playTone(t, 'triangle', 600 * p, 0.08, 0.4, 5000 * p)
    // },
    // {
    //     name: 'Acid', rate: 1, pitch: 0, steps: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
    //     play: (t, s, len, p) => {
    //         const freq = 110 * Math.pow(2, ACID_NOTES[s] / 12) * p;
    //         playTone(t, 'sawtooth', freq, 0.12, 0.3, 1800 * p);
    //     }
    // },
    // {
    //     name: 'Pad', rate: 1, pitch: 0, steps: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    //     play: (t, s, len, p) => playPad(t, len * STEPS, p)
    // },

    // // ----- Piano keys -----
    // {
    //     name: 'Snare', rate: 1, pitch: 0, steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    //     play: (t, s, len, p) => {
    //         playNoise(t, 'bandpass', 2200 * p, 0.12, 0.6);
    //         playTone(t, 'triangle', 190 * p, 0.1, 0.5, 2500 * p);
    //     }
    // },
    // {
    //     name: 'Rim', rate: 1, pitch: 0, steps: [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
    //     play: (t, s, len, p) => playTone(t, 'square', 800 * p, 0.04, 0.2, 4000 * p)
    // },
    // {
    //     name: 'Tom', rate: 1, pitch: 0, steps: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    //     play: (t, s, len, p) => playTone(t, 'sine', 110 * p, 0.3, 0.7, 800 * p)
    // },
    // {
    //     name: 'Cowbell', rate: 1, pitch: 0, steps: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    //     play: (t, s, len, p) => playTone(t, 'square', 560 * p, 0.15, 0.2, 3000 * p)
    // },
    // {
    //     name: 'Pluck', rate: 1, pitch: 0, steps: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
    //     play: (t, s, len, p) => {
    //         const freq = 220 * Math.pow(2, PLUCK_NOTES[s] / 12) * p;
    //         playTone(t, 'triangle', freq, 0.25, 0.35, 2500 * p);
    //     }
    // },

    // // ----- New rave sounds (piano keys 6-13) -----
    // {   // deep offbeat rumble, the classic techno low end
    //     name: 'Rumble', rate: 1, pitch: 0, steps: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    //     play: (t, s, len, p) => playTone(t, 'sine', 48 * p, 0.22, 0.9, 200 * p)
    // },
    // {   // fast soft shaker
    //     name: 'Shaker', rate: 1, pitch: 0, steps: [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
    //     play: (t, s, len, p) => playNoise(t, 'highpass', 9000 * p, 0.04, 0.15)
    // },
    // {   // minor chord stab
    //     name: 'Stab', rate: 1, pitch: 0, steps: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    //     play: (t, s, len, p) => [220, 161.63, 329.63].forEach(f =>
    //         playTone(t, 'sawtooth', f * p, 0.15, 0.18, 2500 * p))
    // },
    // {   // detuned "hoover" that falls in pitch
    //     name: 'Hoover', rate: 1, pitch: 0, steps: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    //     play: (t, s, len, p) => {
    //         playSweep(t, 'sawtooth', 330 * p, 165 * p, 0.35, 0.18, 3000 * p);
    //         playSweep(t, 'sawtooth', 336 * p, 168 * p, 0.35, 0.18, 3000 * p);
    //     }
    // },
    // {   // laser zap
    //     name: 'Zap', rate: 1, pitch: 0, steps: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0],
    //     play: (t, s, len, p) => playSweep(t, 'sine', 2400 * p, 120 * p, 0.15, 0.4, 6000 * p)
    // },
    // {   // rave siren, one rising whoop per bar
    //     name: 'Siren', rate: 1, pitch: 0, steps: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    //     play: (t, s, len, p) => playSweep(t, 'square', 400 * p, 1800 * p, len * 8, 0.1, 3000 * p)
    // },
    // {   // noise riser building up over a whole bar
    //     name: 'Riser', rate: 1, pitch: 0, steps: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    //     play: (t, s, len, p) => playRiser(t, len * STEPS, p)
    // },
    // {   // crash cymbal on the one
    //     name: 'Crash', rate: 1, pitch: 0, steps: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    //     play: (t, s, len, p) => playNoise(t, 'highpass', 3500 * p, 0.9, 0.4)
    // },

    {   // 1: four-on-the-floor kick, the heartbeat of techno
        name: 'Kick', rate: 1, pitch: 0,
        steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        play: (t, s, len, p) => {
            playSweep(t, 'sine', 220 * p, 40 * p, 0.12, 1.0, 250 * p);
            playNoise(t, 'highpass', 3000 * p, 0.015, 0.35);   // short click = harder punch
        }
    },
    {   // 2: closed hat on every 16th, a bit louder on the beat
        name: 'Hat', rate: 1, pitch: 0,
        steps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        play: (t, s, len, p) => {
            const vol = 0.08 + Math.random() * 0.2;
            playNoise(t, 'highpass', 9500 * p, 0.03, vol);
        }
    },
    {   // 3: open hat on the offbeat (between the kicks)
        name: 'Open Hat', rate: 1, pitch: 0,
        steps: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
        play: (t, s, len, p) => {
            playNoise(t, 'highpass', 7500 * p, 0.18, 0.35);
        }
    },
    {   // 4: clap on beat 2 and 4
        name: 'Clap', rate: 1, pitch: 0,
        steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        play: (t, s, len, p) => {
            playNoise(t, 'bandpass', 1800 * p, 0.12, 0.75);
            playNoise(t, 'highpass', 5000 * p, 0.045, 0.3);
        }
    },
    {   // 5: rolling techno bass, every 16th note except the kick
        name: 'Bassline', rate: 1, pitch: 0,
        steps: [0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1],
        play: (t, s, len, p) => {
            playTone(t, 'sawtooth', 55 * p, 0.11, 0.6, 350 * p);
        }
    },
    {   // 6: deep offbeat rumble
        name: 'Rumble', rate: 1, pitch: 0,
        steps: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
        play: (t, s, len, p) => {
            playTone(t, 'sawtooth', 48 * p, 0.22, 0.65, 180 * p);
        }
    },
    {   // 7: acid line (uses ACID_NOTES)
        name: 'Acid', rate: 1, pitch: 0,
        steps: [1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0],
        play: (t, s, len, p) => {
            const freq = 110 * Math.pow(2, ACID_NOTES[s] / 12) * p;
            playTone(t, 'sawtooth', freq, 0.11, 0.45, 2600 * p);
        }
    },
    {   // 8: busier pattern, and every hit has a random pitch
        name: 'Blip', rate: 1, pitch: 0,
        steps: [0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1],
        play: (t, s, len, p) => {
            playTone(t, 'triangle', (600 + Math.random() * 900) * p, 0.05, 0.5, 7000 * p);
        }
    },

    // ===== PIANO KEYS 9-21: extras and effects =====

    {   // 9
        name: 'Snare', rate: 1, pitch: 0,   // snare
        steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        play: (t, s, len, p) => {
            playNoise(t, 'bandpass', 2400 * p, 0.09, 0.7);
            playTone(t, 'triangle', 175 * p, 0.08, 0.5, 3500 * p);
        }
    },
    {   // 10
        name: 'Rim', rate: 1, pitch: 0,   // rim shot
        steps: [0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0],
        play: (t, s, len, p) => {
            playTone(t, 'square', 1200 * p, 0.035, 0.35, 6000 * p);
        }
    },
    {   // 11
        name: 'Tom', rate: 1, pitch: 0,    // tom
        steps: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
        play: (t, s, len, p) => {
            playSweep(t, 'sine', 180 * p, 55 * p, 0.22, 0.7, 600 * p);
        }
    },
    {   // 12
        name: 'Shake', rate: 1, pitch: 0,   // shaker
        steps: [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
        play: (t, s, len, p) => {
            playNoise(t, 'highpass', 11000 * p, 0.025, 0.22);
        }
    },
    {   // 13
        name: 'Stab', rate: 1, pitch: 0,
        steps: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0],
        play: (t, s, len, p) => {
            [220, 261.63, 329.63, 392].forEach(f => {
                playTone(t, 'sawtooth', f * p, 0.14, 0.16, 4500 * p);
            });
        }
    },
    {   // 14
        name: 'Pluck', rate: 1, pitch: 0,    // plucked melody (uses PLUCK_NOTES)
        steps: [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0],
        play: (t, s, len, p) => {
            const freq = 110 * Math.pow(2, PLUCK_NOTES[s] / 12) * p;
            playTone(t, 'sawtooth', freq, 0.09, 0.35, 3500 * p);
        }
    },
    {   // 15
        name: 'Haze', rate: 1, pitch: 0,     // pad
        steps: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        play: (t, s, len, p) => {
            playPad(t, len * STEPS, p);
        }
    },
    {   // 16
        name: 'Drop', rate: 1, pitch: 0,
        steps: [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
        play: (t, s, len, p) => {
            playSweep(t, 'sawtooth', 440 * p, 110 * p, 0.3, 0.3, 4000 * p);
            playSweep(t, 'sawtooth', 448 * p, 112 * p, 0.3, 0.3, 4000 * p);
        }
    },
    {   // 17 laser with a random start pitch every time
        name: 'Zap', rate: 1, pitch: 0,
        steps: [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1],
        play: (t, s, len, p) => {
            const start = 1500 + Math.random() * 3500;
            playSweep(t, 'sine', start * p, 90 * p, 0.13, 0.5, 7000 * p);
        }
    },
    {   // 18  shorter, more frequent siren whoops
        name: 'Boing', rate: 1, pitch: 0,
        steps: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
        play: (t, s, len, p) => {
            playSweep(t, 'square', 350 * p, 1600 * p, len * 2, 0.12, 3200 * p);
        }
    },
    {   // 19
        name: 'Swoosh', rate: 1, pitch: 0,      // riser
        steps: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        play: (t, s, len, p) => {
            playRiser(t, len * STEPS, p);
        }
    },
    {   // 20
        name: 'Smash', rate: 1, pitch: 0,     // crash cymbal
        steps: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        play: (t, s, len, p) => {
            playNoise(t, 'highpass', 4000 * p, 0.7, 0.55);
        }
    },
    {   // 21
        name: 'Sub', rate: 1, pitch: 0,        // deep sub bass
        steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        play: (t, s, len, p) => {
            playTone(t, 'sine', 43 * p, 0.22, 0.9, 80 * p);
        }
    }
];

// Distortion curve: the higher the amount, the more grit
function makeDriveCurve(amount) {
    const n = 44100;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const x = (i * 2) / n - 1;
        curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
}
// ---------- Start the audio engine ----------
// Browsers only allow sound after a user action; script.js calls this on key presses.

function startAudio() {
    if (audioCtx) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return;
    }
    audioCtx = new AudioContext();

    // All sounds -> bus (lowpass filter) -> master volume -> speakers
    bus = audioCtx.createBiquadFilter();
    bus.type = 'lowpass';
    bus.frequency.value = 18000;

    const master = audioCtx.createGain();
    master.gain.value = 0.35;      // lower than before,because distortion makes everything louder 

    // Distortion: adds grit and energy to every sound
    const drive = audioCtx.createWaveShaper();
    drive.curve = makeDriveCurve(20);   // 5 = a little grit, 50 = very harsh
    drive.oversample = '4x';
    bus.connect(drive).connect(master).connect(audioCtx.destination);

    // One second of random noise
    noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    nextStepTime = audioCtx.currentTime + 0.1;
    setInterval(scheduler, 25);    // check the clock every 25 ms
}

// ---------- The sequencer clock ----------
// One tick = one 16th note. Every beat that is on gets its turn on every tick.
function scheduler() {
    while (nextStepTime < audioCtx.currentTime + 0.1) {
        const stepDur = 60 / bpm / 4;   // length of one 16th note in seconds

        for (const i of activeKeys) scheduleBeat(instruments[i], nextStepTime, stepDur);

        nextStepTime += stepDur;
        tickCount++;
    }
}

// Plays the right step(s) of one beat for this tick.
// The step is calculated from the global tick count, so every beat stays locked to
// the same grid, whatever its speed.
function scheduleBeat(inst, t, stepDur) {
    const p = Math.pow(2, inst.pitch / 12);   // semitones -> frequency ratio

    if (inst.rate >= 1) {
        // Faster: several steps fit into one tick
        const stepLen = stepDur / inst.rate;
        for (let k = 0; k < inst.rate; k++) {
            const s = (tickCount * inst.rate + k) % STEPS;
            if (inst.steps[s]) inst.play(t + k * stepLen, s, stepLen, p);
        }
    } else {
        // Slower: a new step only starts every 2nd or 4th tick
        const period = 1 / inst.rate;
        if (tickCount % period === 0) {
            const s = (tickCount / period) % STEPS;
            if (inst.steps[s]) inst.play(t, s, stepDur * period, p);
        }
    }
}

// ---------- Sound building blocks (p = pitch ratio, 1 = unchanged) ----------
function playKick(t, p) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.frequency.setValueAtTime(150 * p, t);
    osc.frequency.exponentialRampToValueAtTime(40 * p, t + 0.15);   // pitch drop = "thump"
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(g).connect(bus);
    osc.start(t);
    osc.stop(t + 0.4);
}

function playNoise(t, filterType, freq, len, vol) {
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuf;
    const filter = audioCtx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(filter).connect(g).connect(bus);
    src.start(t);
    src.stop(t + len);
}

function playTone(t, type, freq, len, vol, cutoff) {
    const osc = audioCtx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    osc.connect(filter).connect(g).connect(bus);
    osc.start(t);
    osc.stop(t + len);
}

// Like playTone, but the pitch slides from f0 to f1 during the sound
function playSweep(t, type, f0, f1, len, vol, cutoff) {
    const osc = audioCtx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + len);
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    osc.connect(filter).connect(g).connect(bus);
    osc.start(t);
    osc.stop(t + len);
}

// Noise that gets higher and louder, then stops (builds tension)
function playRiser(t, len, p) {
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;                       // the noise buffer is only 1 s long
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2;
    filter.frequency.setValueAtTime(300 * p, t);
    filter.frequency.exponentialRampToValueAtTime(6000 * p, t + len);
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.01, t);
    g.gain.linearRampToValueAtTime(0.5, t + len);
    g.gain.linearRampToValueAtTime(0.0001, t + len + 0.05);
    src.connect(filter).connect(g).connect(bus);
    src.start(t);
    src.stop(t + len + 0.05);
}

function playPad(t, len, p) {
    [220, 261.63, 329.63].forEach((freq) => {   // A minor chord
        const osc = audioCtx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq * p;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1200 * p;
        const g = audioCtx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.08, t + 0.4);        // slow fade in
        g.gain.exponentialRampToValueAtTime(0.0001, t + len); // fade out over the bar
        osc.connect(filter).connect(g).connect(bus);
        osc.start(t);
        osc.stop(t + len);
    });
}
(() => {
  const $ = (id) => document.getElementById(id);

  const state = {
    audioCtx: null,
    micStream: null,
    micSource: null,
    analyser: null,
    monitorGain: null,
    toneOsc: null,
    toneGain: null,
    raf: 0,
    history: [],
    targetHz: 440,
    lastPitch: null,
    micActive: false,
    toneActive: false,
    songTimer: null,
    songIndex: -1,
    songPlaying: false,
    selectedDeviceId: "",
    pitchBuffer: null
  };

  const noteNames = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const intervalNames = ["Unison","m2","M2","m3","M3","P4","Tritone","P5","m6","M6","m7","M7"];
  const song = [
    {n:"E4",b:1},{n:"D4",b:1},{n:"C4",b:1},{n:"D4",b:1},
    {n:"E4",b:1},{n:"E4",b:1},{n:"E4",b:2},
    {n:"D4",b:1},{n:"D4",b:1},{n:"D4",b:2},
    {n:"E4",b:1},{n:"G4",b:1},{n:"G4",b:2},
    {n:"E4",b:1},{n:"D4",b:1},{n:"C4",b:1},{n:"D4",b:1},
    {n:"E4",b:1},{n:"E4",b:1},{n:"E4",b:1},{n:"E4",b:1},
    {n:"D4",b:1},{n:"D4",b:1},{n:"E4",b:1},{n:"D4",b:1},{n:"C4",b:3}
  ];

  function noteToMidi(name) {
    const m = /^([A-G])(#?)(-?\d+)$/.exec(name);
    if (!m) return null;
    const letter = m[1] + m[2];
    const octave = Number(m[3]);
    const idx = noteNames.indexOf(letter);
    return 12 * (octave + 1) + idx;
  }
  function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function freqToMidi(f) { return 69 + 12 * Math.log2(f / 440); }
  function freqToNote(f) {
    if (!(f > 0)) return {name:"—", cents:0, midi:null};
    const mf = freqToMidi(f);
    const m = Math.round(mf);
    const cents = (mf - m) * 100;
    return { name: noteNames[(m % 12 + 12) % 12] + (Math.floor(m/12)-1), cents, midi:m };
  }
  function clamp(n,min,max){ return Math.min(max,Math.max(min,n)); }
  function ensureAudio() {
    if (!state.audioCtx) state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (state.audioCtx.state === "suspended") state.audioCtx.resume();
    return state.audioCtx;
  }

  function populateNotes() {
    const select = $("noteSelect");
    select.innerHTML = "";
    for (let o=0;o<=8;o++) {
      for (const n of noteNames) {
        const name = n + o;
        const midi = noteToMidi(name);
        const f = midiToFreq(midi);
        if (f < 16 || f > 8000) continue;
        const opt = document.createElement("option");
        opt.value = String(f);
        opt.textContent = name + " — " + f.toFixed(2) + " Hz";
        if (name === "A4") opt.selected = true;
        select.appendChild(opt);
      }
    }
  }

  function renderIntervals() {
    const strip = $("intervalStrip");
    strip.innerHTML = "";
    intervalNames.forEach((n,i) => {
      const d = document.createElement("div");
      d.className = "interval-step";
      d.dataset.i = String(i);
      d.textContent = i;
      d.title = n;
      strip.appendChild(d);
    });
  }

  function renderSong() {
    const wrap = $("songNotes");
    wrap.innerHTML = "";
    song.forEach((x,i) => {
      const d = document.createElement("div");
      d.className = "song-note";
      d.textContent = x.n;
      d.dataset.i = String(i);
      wrap.appendChild(d);
    });
  }

  function setTargetHz(v, opts={}) {
    let hz = Number(v);
    if (!Number.isFinite(hz)) hz = 0;
    hz = clamp(hz, 0, 20000);
    state.targetHz = hz;
    $("freqInput").value = hz.toFixed(hz < 100 ? 2 : 2);
    $("targetReadout").textContent = hz.toFixed(2);
    const note = freqToNote(hz);
    $("targetNoteReadout").textContent = hz > 0 ? "Hz • " + note.name : "Hz • silence";
    if (hz <= 0) {
      $("targetDelta").textContent = "0 Hz is silence; no audible oscillator is generated.";
    } else if (hz < 20) {
      $("targetDelta").textContent = "Sub-audible reference selected. Ordinary speakers may not reproduce it.";
    } else {
      $("targetDelta").textContent = "Target note " + note.name + " • sing near this pitch to match.";
    }
    if (!opts.skipSelectSync && hz > 0) {
      let best = null, diff = Infinity;
      [...$("noteSelect").options].forEach(o => {
        const d = Math.abs(Math.log2(Number(o.value)/hz));
        if (d < diff) { diff = d; best = o; }
      });
      if (best) $("noteSelect").value = best.value;
    }
    if (state.toneActive) restartTone();
  }

  async function listMics() {
    const select = $("micSelect");
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const ins = devices.filter(d => d.kind === "audioinput");
      const current = select.value;
      select.innerHTML = '<option value="">Default microphone</option>';
      ins.forEach((d,i) => {
        const o = document.createElement("option");
        o.value = d.deviceId;
        o.textContent = d.label || ("Microphone " + (i+1));
        select.appendChild(o);
      });
      if ([...select.options].some(o=>o.value===current)) select.value = current;
    } catch {}
  }

  function stopMic() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
    if (state.micSource) try { state.micSource.disconnect(); } catch {}
    if (state.monitorGain) try { state.monitorGain.disconnect(); } catch {}
    if (state.micStream) state.micStream.getTracks().forEach(t=>t.stop());
    state.micStream = state.micSource = state.analyser = state.monitorGain = null;
    state.micActive = false;
    $("micButton").textContent = "Start microphone";
    $("micButton").classList.remove("danger");
    $("micStatus").className = "mic-status";
    $("micStatus").textContent = "Microphone is off.";
    $("levelBar").style.width = "0%";
    $("levelText").textContent = "0%";
  }

  async function startMic() {
    if (state.micActive) { stopMic(); return; }
    if (!navigator.mediaDevices?.getUserMedia) {
      $("micStatus").className = "mic-status bad";
      $("micStatus").textContent = "This browser does not expose microphone access here.";
      return;
    }
    try {
      const ctx = ensureAudio();
      const deviceId = $("micSelect").value;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? {exact:deviceId} : undefined,
          echoCancellation:false,
          noiseSuppression:false,
          autoGainControl:false,
          channelCount:1
        }
      });
      state.micStream = stream;
      state.micSource = ctx.createMediaStreamSource(stream);
      state.analyser = ctx.createAnalyser();
      state.analyser.fftSize = 4096;
      state.analyser.smoothingTimeConstant = 0.05;
      state.pitchBuffer = new Float32Array(state.analyser.fftSize);
      state.micSource.connect(state.analyser);

      state.monitorGain = ctx.createGain();
      state.monitorGain.gain.value = $("monitorToggle").checked ? 0.9 : 0;
      state.micSource.connect(state.monitorGain);
      state.monitorGain.connect(ctx.destination);

      state.micActive = true;
      $("micButton").textContent = "Stop microphone";
      $("micButton").classList.add("danger");
      $("micStatus").className = "mic-status good";
      $("micStatus").textContent = "Microphone open. Listening for a stable pitch…";
      await listMics();
      detectLoop();
    } catch (err) {
      $("micStatus").className = "mic-status bad";
      $("micStatus").textContent = "Microphone could not start: " + (err?.message || err);
    }
  }

  function autocorrelate(buf, sampleRate) {
    const size = buf.length;
    let rms = 0;
    for (let i=0;i<size;i++) rms += buf[i]*buf[i];
    rms = Math.sqrt(rms/size);
    if (rms < 0.006) return {freq:null,rms};

    let start = 0, end = size - 1;
    const threshold = 0.18;
    for (let i=0;i<size/2;i++){ if (Math.abs(buf[i]) < threshold) { start=i; break; } }
    for (let i=1;i<size/2;i++){ if (Math.abs(buf[size-i]) < threshold) { end=size-i; break; } }
    const trimmed = buf.slice(start,end);
    const n = trimmed.length;
    const c = new Float32Array(n);
    for (let lag=0;lag<n;lag++) {
      let sum=0;
      for (let i=0;i<n-lag;i++) sum += trimmed[i]*trimmed[i+lag];
      c[lag]=sum;
    }
    let d=0;
    while (d+1<c.length && c[d] > c[d+1]) d++;
    let max=-1, pos=-1;
    const minLag = Math.floor(sampleRate/1200);
    const maxLag = Math.min(c.length-2, Math.ceil(sampleRate/55));
    for (let i=Math.max(d,minLag);i<=maxLag;i++) {
      if (c[i] > max) { max=c[i]; pos=i; }
    }
    if (pos <= 0 || c[0] <= 0 || max/c[0] < 0.28) return {freq:null,rms};
    const x1=c[pos-1], x2=c[pos], x3=c[pos+1];
    const a=(x1+x3-2*x2)/2;
    const b=(x3-x1)/2;
    const shift = a ? -b/(2*a) : 0;
    const period = pos + clamp(shift,-1,1);
    const freq = sampleRate/period;
    if (freq < 55 || freq > 1200) return {freq:null,rms};
    return {freq,rms};
  }

  function detectLoop() {
    if (!state.micActive || !state.analyser) return;
    state.analyser.getFloatTimeDomainData(state.pitchBuffer);
    const {freq,rms} = autocorrelate(state.pitchBuffer, state.audioCtx.sampleRate);
    const level = clamp(rms * 700, 0, 100);
    $("levelBar").style.width = level.toFixed(0) + "%";
    $("levelText").textContent = level.toFixed(0) + "%";

    if (rms < 0.004) {
      $("micStatus").className = "mic-status warn";
      $("micStatus").textContent = "Mic is open, but almost no signal is arriving.";
    } else if (rms < 0.012) {
      $("micStatus").className = "mic-status warn";
      $("micStatus").textContent = "Weak microphone signal detected. Sing a little closer or louder.";
    } else {
      $("micStatus").className = "mic-status good";
      $("micStatus").textContent = freq ? "Audio signal + pitch detected." : "Audio signal detected; listening for a stable sung pitch.";
    }

    if (freq) {
      state.lastPitch = freq;
      updatePitchUI(freq);
      state.history.push(freq);
    } else {
      state.history.push(null);
    }
    if (state.history.length > 220) state.history.shift();
    drawGraph();
    state.raf = requestAnimationFrame(detectLoop);
  }

  function updatePitchUI(freq) {
    const n = freqToNote(freq);
    $("voiceNote").textContent = n.name;
    $("voiceHz").textContent = freq.toFixed(2) + " Hz";
    const sign = n.cents >= 0 ? "+" : "";
    $("nearestCents").textContent = sign + n.cents.toFixed(1) + " cents from " + n.name;

    const badge = $("matchBadge");
    badge.className = "match";
    if (state.targetHz > 0) {
      const cents = 1200 * Math.log2(freq/state.targetHz);
      const abs = Math.abs(cents);
      if (abs <= 5) { badge.classList.add("locked"); badge.textContent = "Locked in"; }
      else if (abs <= 18) { badge.classList.add("close"); badge.textContent = cents > 0 ? "Slightly sharp" : "Slightly flat"; }
      else { badge.classList.add("off"); badge.textContent = cents > 0 ? "Sharp" : "Flat"; }
      $("targetDelta").textContent = (cents>=0?"+":"") + cents.toFixed(1) + " cents from target.";
      updateHarmony(freq,state.targetHz);
    } else {
      badge.textContent = "Pitch detected";
      updateHarmony(null,null);
    }
  }

  function updateHarmony(voice,target) {
    document.querySelectorAll(".interval-step").forEach(x=>x.classList.remove("active"));
    if (!(voice>0) || !(target>0)) {
      $("intervalName").textContent = "—";
      $("intervalCents").textContent = "Sing + choose a target";
      $("harmonyDetail").textContent = "This compares your detected pitch with the currently selected reference frequency, octave-equivalent.";
      return;
    }
    let semis = 12*Math.log2(voice/target);
    let octaveReduced = ((semis % 12)+12)%12;
    const nearest = Math.round(octaveReduced)%12;
    let cents = (octaveReduced-nearest)*100;
    if (cents > 50) cents -= 100;
    if (cents < -50) cents += 100;
    $("intervalName").textContent = intervalNames[nearest];
    $("intervalCents").textContent = (cents>=0?"+":"") + cents.toFixed(1) + " cents";
    document.querySelector('.interval-step[data-i="'+nearest+'"]')?.classList.add("active");
    $("harmonyDetail").textContent = "Voice is " + semis.toFixed(2) + " semitones from the target; octave-equivalent interval: " + intervalNames[nearest] + ".";
  }

  function drawGraph() {
    const canvas = $("pitchCanvas");
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(300, Math.round(rect.width*dpr));
    const h = Math.max(220, Math.round(rect.height*dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width=w; canvas.height=h; }
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = "rgba(1,7,13,.01)";
    ctx.fillRect(0,0,w,h);

    const target = state.targetHz > 0 ? state.targetHz : 220;
    const centerMidi = freqToMidi(target);
    const span = 18;
    const yForFreq = f => h/2 - ((freqToMidi(f)-centerMidi)/span)*h;

    ctx.lineWidth = Math.max(1,dpr);
    ctx.strokeStyle = "rgba(125,247,255,.10)";
    ctx.fillStyle = "rgba(143,185,192,.65)";
    ctx.font = (10*dpr)+"px sans-serif";
    ctx.textBaseline="middle";
    for (let s=-9;s<=9;s+=3) {
      const m = centerMidi+s;
      const y = h/2-(s/span)*h;
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();
      const nn = freqToNote(midiToFreq(Math.round(m))).name;
      ctx.fillText(nn,6*dpr,y);
    }
    if (state.targetHz>0) {
      const y = yForFreq(state.targetHz);
      ctx.strokeStyle = "rgba(255,171,82,.85)";
      ctx.setLineDash([7*dpr,6*dpr]);
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = "rgba(125,247,255,.95)";
    ctx.lineWidth = 2*dpr;
    ctx.beginPath();
    let started=false;
    const hist=state.history;
    for(let i=0;i<hist.length;i++){
      const f=hist[i];
      const x = hist.length<=1 ? 0 : (i/(hist.length-1))*w;
      if (!(f>0)) { started=false; continue; }
      const y=yForFreq(f);
      if (y<0 || y>h) { started=false; continue; }
      if(!started){ctx.moveTo(x,y);started=true;} else ctx.lineTo(x,y);
    }
    ctx.stroke();
  }

  function stopTone() {
    if (state.toneOsc) { try { state.toneOsc.stop(); } catch {} try { state.toneOsc.disconnect(); } catch {} }
    if (state.toneGain) try { state.toneGain.disconnect(); } catch {}
    state.toneOsc = state.toneGain = null;
    state.toneActive=false;
    $("toneButton").textContent="▶ Play target tone";
  }
  function startTone() {
    if (state.targetHz <= 0) { stopTone(); return; }
    const ctx=ensureAudio();
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.type=$("waveform").value;
    osc.frequency.value=state.targetHz;
    gain.gain.value=(Number($("toneVolume").value)/100)*0.22;
    osc.connect(gain);gain.connect(ctx.destination);osc.start();
    state.toneOsc=osc;state.toneGain=gain;state.toneActive=true;
    $("toneButton").textContent="■ Stop target tone";
  }
  function restartTone(){ stopTone(); startTone(); }

  function stopSong() {
    if (state.songTimer) clearTimeout(state.songTimer);
    state.songTimer=null;state.songPlaying=false;state.songIndex=-1;
    $("songButton").textContent="♪ Mary Had a Little Lamb";
    document.querySelectorAll(".song-note").forEach(x=>x.classList.remove("active","done"));
    $("songStatus").textContent="Press the song button to hear the target notes and sing along while the pitch trace continues.";
  }
  function playSongStep() {
    if (!state.songPlaying) return;
    if (state.songIndex >= song.length) {
      stopTone(); stopSong();
      $("songStatus").textContent="Song complete. You can run it again at another tempo.";
      return;
    }
    document.querySelectorAll(".song-note").forEach((x,i)=>{
      x.classList.toggle("active",i===state.songIndex);
      x.classList.toggle("done",i<state.songIndex);
    });
    const item=song[state.songIndex];
    const hz=midiToFreq(noteToMidi(item.n));
    setTargetHz(hz);
    if (state.toneActive) restartTone(); else startTone();
    const bpm=Number($("tempoSelect").value);
    const ms=(60000/bpm)*item.b;
    $("songStatus").textContent="Target: "+item.n+" • note "+(state.songIndex+1)+" of "+song.length;
    state.songIndex++;
    state.songTimer=setTimeout(playSongStep,ms);
  }
  function startSong() {
    if (state.songPlaying) { stopTone(); stopSong(); return; }
    state.songPlaying=true;state.songIndex=0;
    $("songButton").textContent="■ Stop song";
    playSongStep();
  }

  $("micButton").addEventListener("click",startMic);
  $("refreshMics").addEventListener("click",listMics);
  $("monitorToggle").addEventListener("change",()=>{ if(state.monitorGain) state.monitorGain.gain.value=$("monitorToggle").checked?0.9:0; });
  $("micSelect").addEventListener("change",()=>{ if(state.micActive){ stopMic(); startMic(); } });

  $("freqInput").addEventListener("change",e=>setTargetHz(e.target.value,{skipSelectSync:false}));
  $("freqInput").addEventListener("input",e=>{ const v=Number(e.target.value); if(Number.isFinite(v)) setTargetHz(v,{skipSelectSync:true}); });
  $("noteSelect").addEventListener("change",e=>setTargetHz(Number(e.target.value),{skipSelectSync:true}));
  $("octaveDown").addEventListener("click",()=>setTargetHz(state.targetHz/2));
  $("octaveUp").addEventListener("click",()=>setTargetHz(Math.min(20000,state.targetHz*2)));
  $("toneButton").addEventListener("click",()=>{ state.toneActive?stopTone():startTone(); });
  $("waveform").addEventListener("change",()=>{ if(state.toneActive) restartTone(); });
  $("toneVolume").addEventListener("input",e=>{
    $("toneVolumeText").textContent=e.target.value+"%";
    if(state.toneGain) state.toneGain.gain.value=(Number(e.target.value)/100)*0.22;
  });
  document.querySelectorAll(".preset").forEach(b=>b.addEventListener("click",()=>setTargetHz(Number(b.dataset.freq))));
  $("songButton").addEventListener("click",startSong);

  window.addEventListener("resize",drawGraph);
  window.addEventListener("beforeunload",()=>{stopMic();stopTone();stopSong();});

  populateNotes();
  renderIntervals();
  renderSong();
  setTargetHz(440);
  listMics();
  $("secureLabel").textContent = window.isSecureContext ? "HTTPS • microphone-ready" : "Microphone may require HTTPS";
  if (!window.isSecureContext) $("secureLabel").style.color = "var(--yellow)";
  drawGraph();
})();
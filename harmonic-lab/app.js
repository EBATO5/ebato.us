(() => {
  const $ = (id) => document.getElementById(id);
  const noteNames = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

  const intervalDefs = [
    {name:"Unison", short:"1", s:0},
    {name:"Minor 2nd", short:"m2", s:1},
    {name:"Major 2nd", short:"M2", s:2},
    {name:"Minor 3rd", short:"m3", s:3},
    {name:"Major 3rd", short:"M3", s:4},
    {name:"Perfect 4th", short:"P4", s:5},
    {name:"Tritone", short:"TT", s:6},
    {name:"Perfect 5th", short:"P5", s:7},
    {name:"Minor 6th", short:"m6", s:8},
    {name:"Major 6th", short:"M6", s:9},
    {name:"Minor 7th", short:"m7", s:10},
    {name:"Major 7th", short:"M7", s:11},
    {name:"Octave", short:"8ve", s:12},
    {name:"Minor 9th", short:"m9", s:13},
    {name:"Major 9th", short:"M9", s:14},
    {name:"Minor 10th", short:"m10", s:15},
    {name:"Major 10th", short:"M10", s:16},
    {name:"Perfect 11th", short:"P11", s:17},
    {name:"Aug. 11th", short:"#11", s:18},
    {name:"Perfect 12th", short:"P12", s:19},
    {name:"Minor 13th", short:"m13", s:20},
    {name:"Major 13th", short:"M13", s:21},
    {name:"Minor 14th", short:"m14", s:22},
    {name:"Major 14th", short:"M14", s:23},
    {name:"Double Octave", short:"15", s:24}
  ];

  const recipes = [
    {name:"Major", semis:[4,7], desc:"1 • 3 • 5"},
    {name:"Minor", semis:[3,7], desc:"1 • ♭3 • 5"},
    {name:"Sus2", semis:[2,7], desc:"1 • 2 • 5"},
    {name:"Sus4", semis:[5,7], desc:"1 • 4 • 5"},
    {name:"Major 7", semis:[4,7,11], desc:"1 • 3 • 5 • 7"},
    {name:"Dominant 7", semis:[4,7,10], desc:"1 • 3 • 5 • ♭7"},
    {name:"Minor 7", semis:[3,7,10], desc:"1 • ♭3 • 5 • ♭7"},
    {name:"Add 9", semis:[4,7,14], desc:"1 • 3 • 5 • 9"},
    {name:"Major 9", semis:[4,7,11,14], desc:"1 • 3 • 5 • 7 • 9"},
    {name:"Minor 9", semis:[3,7,10,14], desc:"1 • ♭3 • 5 • ♭7 • 9"},
    {name:"11th", semis:[4,7,10,14,17], desc:"1 • 3 • 5 • ♭7 • 9 • 11"},
    {name:"13th", semis:[4,7,10,14,17,21], desc:"1 • 3 • 5 • ♭7 • 9 • 11 • 13"}
  ];

  const state = {
    ctx:null,
    master:null,
    compressor:null,
    rootHz:440,
    rootVoice:null,
    layers:new Map(),
    nextId:1,
    maxLayers:64
  };

  const clamp = (n,min,max) => Math.min(max,Math.max(min,n));
  const midiToFreq = m => 440 * Math.pow(2,(m-69)/12);
  const freqToMidi = f => 69 + 12*Math.log2(f/440);
  const noteToMidi = name => {
    const m = /^([A-G])(#?)(-?\d+)$/.exec(name);
    if (!m) return null;
    return 12*(Number(m[3])+1)+noteNames.indexOf(m[1]+m[2]);
  };
  const freqToNote = f => {
    if (!(f>0)) return {name:"—", cents:0, midi:null};
    const mf=freqToMidi(f), m=Math.round(mf);
    const name=noteNames[(m%12+12)%12]+(Math.floor(m/12)-1);
    return {name,cents:(mf-m)*100,midi:m};
  };
  const intervalFreq = semis => state.rootHz * Math.pow(2,semis/12);
  const fmtHz = f => f < 100 ? f.toFixed(3).replace(/0+$/,"").replace(/\.$/,"") : f.toFixed(2);

  function ensureAudio(){
    if (!state.ctx) {
      state.ctx = new (window.AudioContext || window.webkitAudioContext)();
      state.master = state.ctx.createGain();
      state.compressor = state.ctx.createDynamicsCompressor();
      state.compressor.threshold.value = -12;
      state.compressor.knee.value = 18;
      state.compressor.ratio.value = 4;
      state.compressor.attack.value = 0.008;
      state.compressor.release.value = 0.18;
      state.master.connect(state.compressor);
      state.compressor.connect(state.ctx.destination);
      updateMasterGain();
    }
    if (state.ctx.state === "suspended") state.ctx.resume();
    return state.ctx;
  }

  function updateMasterGain(){
    if (!state.master || !state.ctx) return;
    const v=Number($("masterVolume").value)/100;
    state.master.gain.setTargetAtTime(v,state.ctx.currentTime,0.015);
  }

  function activeVoices(){
    const voices=[];
    if (state.rootVoice) voices.push({voice:state.rootVoice,volume:Number($("rootVolume").value)});
    state.layers.forEach(l=>{ if(l.voice) voices.push({voice:l.voice,volume:l.volume}); });
    return voices;
  }

  function rebalance(){
    if (!state.ctx) return;
    const voices=activeVoices();
    const n=Math.max(1,voices.length);
    const scale=0.42/Math.sqrt(n);
    voices.forEach(({voice,volume})=>{
      const v=(volume/100)*scale;
      try{voice.gain.gain.setTargetAtTime(v,state.ctx.currentTime,0.012);}catch{voice.gain.gain.value=v;}
    });
    $("audioStatus").textContent=voices.length ? voices.length+" voice"+(voices.length===1?"":"s")+" playing" : "Audio idle";
    $("audioStatus").style.color=voices.length ? "var(--green)" : "";
  }

  function makeVoice(freq,wave){
    if (!(freq>0) || freq>20000) return null;
    const ctx=ensureAudio();
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.type=wave;
    osc.frequency.value=freq;
    gain.gain.value=0;
    osc.connect(gain);
    gain.connect(state.master);
    osc.start();
    return {osc,gain};
  }

  function stopVoice(voice){
    if (!voice) return;
    try{voice.osc.stop();}catch{}
    try{voice.osc.disconnect();}catch{}
    try{voice.gain.disconnect();}catch{}
  }

  function startRoot(){
    if (!$("rootEnabled").checked || state.rootVoice || !(state.rootHz>0) || state.rootHz>20000) return;
    state.rootVoice=makeVoice(state.rootHz,$("rootWave").value);
    rebalance();
    updateRootButton();
  }

  function stopRoot(){
    if (state.rootVoice) stopVoice(state.rootVoice);
    state.rootVoice=null;
    rebalance();
    updateRootButton();
  }

  function updateRootButton(){
    $("playRoot").textContent=state.rootVoice ? "■ Stop Root" : "▶ Play Root";
  }

  function retuneRoot(){
    if (state.rootVoice && state.ctx) {
      state.rootVoice.osc.frequency.setTargetAtTime(state.rootHz,state.ctx.currentTime,0.012);
    }
    state.layers.forEach(layer=>{
      if(layer.type==="derived"){
        layer.freq=intervalFreq(layer.semitones);
        if(layer.voice && layer.freq>0 && layer.freq<=20000){
          layer.voice.osc.frequency.setTargetAtTime(layer.freq,state.ctx.currentTime,0.012);
        } else if(layer.voice && layer.freq>20000){
          stopLayer(layer);
        }
      }
    });
    renderRoot();
    renderIntervals();
    renderLayers();
  }

  function setRootHz(value,{syncSelect=true}={}){
    let hz=Number(value);
    if(!Number.isFinite(hz)) return;
    hz=clamp(hz,0.01,20000);
    state.rootHz=hz;
    $("rootFrequency").value=fmtHz(hz);
    if(syncSelect){
      let best=null,bestDiff=Infinity;
      [...$("rootNoteSelect").options].forEach(o=>{
        const d=Math.abs(Math.log2(Number(o.value)/hz));
        if(d<bestDiff){bestDiff=d;best=o;}
      });
      if(best) $("rootNoteSelect").value=best.value;
    }
    retuneRoot();
  }

  function renderRoot(){
    const n=freqToNote(state.rootHz);
    const cents=n.cents;
    $("rootNote").textContent=n.name;
    $("rootHzReadout").textContent=fmtHz(state.rootHz);
    $("rootDetail").textContent="Nearest "+n.name+" • "+(cents>=0?"+":"")+cents.toFixed(1)+" cents";
  }

  function populateNotes(){
    const select=$("rootNoteSelect");
    select.innerHTML="";
    for(let o=0;o<=9;o++){
      for(const n of noteNames){
        const name=n+o, midi=noteToMidi(name), f=midiToFreq(midi);
        if(f<8 || f>20000) continue;
        const opt=document.createElement("option");
        opt.value=String(f);
        opt.textContent=name+" — "+f.toFixed(2)+" Hz";
        if(name==="A4") opt.selected=true;
        select.appendChild(opt);
      }
    }
  }

  function renderIntervals(){
    const grid=$("intervalGrid");
    grid.innerHTML="";
    intervalDefs.forEach(def=>{
      const f=intervalFreq(def.s);
      const note=freqToNote(f).name;
      const b=document.createElement("button");
      b.type="button";
      b.className="interval-btn";
      b.innerHTML="<strong>"+def.short+" — "+def.name+"</strong><span>"+def.s+" semitone"+(def.s===1?"":"s")+" from root</span><em>"+fmtHz(f)+" Hz • "+note+"</em>";
      b.addEventListener("click",()=>addDerived(def.s,def.name));
      grid.appendChild(b);
    });
  }

  function renderRecipes(){
    const grid=$("recipeGrid");
    grid.innerHTML="";
    recipes.forEach(r=>{
      const b=document.createElement("button");
      b.type="button"; b.className="recipe";
      b.innerHTML="<strong>"+r.name+"</strong><span>"+r.desc+"</span>";
      b.addEventListener("click",()=>{
        r.semis.forEach(s=>addDerived(s,r.name+" voice"));
        renderLayers();
      });
      grid.appendChild(b);
    });
  }

  function canAdd(){
    if(state.layers.size>=state.maxLayers){
      $("audioStatus").textContent="64-layer safety limit reached";
      $("audioStatus").style.color="var(--yellow)";
      return false;
    }
    return true;
  }

  function addDerived(semitones,label){
    if(!canAdd()) return;
    const s=Number(semitones);
    if(!Number.isFinite(s)) return;
    const id=state.nextId++;
    state.layers.set(id,{
      id,type:"derived",semitones:s,
      label:label || ((s>=0?"+":"")+s+" semitones"),
      freq:intervalFreq(s),
      waveform:"sine",volume:28,voice:null
    });
    renderLayers();
  }

  function addAbsolute(freq,label){
    if(!canAdd()) return;
    let hz=Number(freq);
    if(!Number.isFinite(hz) || hz<=0) return;
    hz=clamp(hz,0.01,20000);
    const id=state.nextId++;
    state.layers.set(id,{
      id,type:"absolute",semitones:null,
      label:label || ("Custom "+fmtHz(hz)+" Hz"),
      freq:hz,waveform:"sine",volume:28,voice:null
    });
    renderLayers();
  }

  function startLayer(layer){
    if(!layer || layer.voice || !(layer.freq>0) || layer.freq>20000) return;
    layer.voice=makeVoice(layer.freq,layer.waveform);
    rebalance();
  }

  function stopLayer(layer){
    if(!layer) return;
    if(layer.voice) stopVoice(layer.voice);
    layer.voice=null;
    rebalance();
  }

  function playAll(){
    ensureAudio();
    if($("rootEnabled").checked) startRoot();
    state.layers.forEach(startLayer);
    rebalance();
    renderLayers();
  }

  function stopAll(){
    stopRoot();
    state.layers.forEach(stopLayer);
    rebalance();
    renderLayers();
  }

  function clearAll(){
    stopAll();
    state.layers.clear();
    renderLayers();
  }

  function clearDerived(){
    [...state.layers.entries()].forEach(([id,l])=>{
      if(l.type==="derived"){
        stopLayer(l);
        state.layers.delete(id);
      }
    });
    renderLayers();
  }

  function renderLayers(){
    const list=$("layerList");
    list.innerHTML="";
    $("layerCount").textContent=state.layers.size+" layer"+(state.layers.size===1?"":"s");
    $("emptyState").style.display=state.layers.size ? "none" : "block";

    state.layers.forEach((layer,id)=>{
      const row=document.createElement("div");
      row.className="layer-row"+(layer.voice?"":" paused");
      const note=freqToNote(layer.freq).name;
      const relation=layer.type==="derived"
        ? ((layer.semitones>=0?"+":"")+layer.semitones+" st • root-derived")
        : "independent frequency";

      row.innerHTML=
        '<div class="layer-title"><strong></strong><span></span></div>'+
        '<select class="wave" aria-label="Waveform"><option value="sine">Sine</option><option value="triangle">Triangle</option><option value="square">Square</option><option value="sawtooth">Saw</option></select>'+
        '<div class="layer-vol"><input type="range" min="0" max="100" value="'+layer.volume+'" aria-label="Layer volume"><span>'+layer.volume+'%</span></div>'+
        '<button class="btn icon-btn toggle" type="button" aria-label="'+(layer.voice?"Stop":"Play")+' layer">'+(layer.voice?"■":"▶")+'</button>'+
        '<button class="btn icon-btn danger remove" type="button" aria-label="Remove layer">×</button>';

      row.querySelector(".layer-title strong").textContent=layer.label;
      row.querySelector(".layer-title span").textContent=fmtHz(layer.freq)+" Hz • "+note+" • "+relation;

      const wave=row.querySelector(".wave");
      wave.value=layer.waveform;
      wave.addEventListener("change",()=>{
        layer.waveform=wave.value;
        if(layer.voice) layer.voice.osc.type=layer.waveform;
      });

      const vol=row.querySelector('.layer-vol input');
      const volText=row.querySelector('.layer-vol span');
      vol.addEventListener("input",()=>{
        layer.volume=Number(vol.value);
        volText.textContent=layer.volume+"%";
        rebalance();
      });

      row.querySelector(".toggle").addEventListener("click",()=>{
        if(layer.voice) stopLayer(layer); else startLayer(layer);
        renderLayers();
      });

      row.querySelector(".remove").addEventListener("click",()=>{
        stopLayer(layer); state.layers.delete(id); renderLayers();
      });

      list.appendChild(row);
    });
    rebalance();
  }

  $("rootFrequency").addEventListener("change",e=>setRootHz(e.target.value));
  $("rootFrequency").addEventListener("input",e=>{
    const v=Number(e.target.value);
    if(Number.isFinite(v) && v>0) setRootHz(v,{syncSelect:false});
  });
  $("rootNoteSelect").addEventListener("change",e=>setRootHz(Number(e.target.value),{syncSelect:false}));
  $("rootOctDown").addEventListener("click",()=>setRootHz(state.rootHz/2));
  $("rootOctUp").addEventListener("click",()=>setRootHz(state.rootHz*2));
  $("rootWave").addEventListener("change",()=>{if(state.rootVoice) state.rootVoice.osc.type=$("rootWave").value;});
  $("rootVolume").addEventListener("input",e=>{$("rootVolumeText").textContent=e.target.value+"%";rebalance();});
  $("rootEnabled").addEventListener("change",()=>{if(!$("rootEnabled").checked) stopRoot();});
  $("playRoot").addEventListener("click",()=>state.rootVoice?stopRoot():startRoot());
  $("addRootLayer").addEventListener("click",()=>addDerived(0,"Root duplicate"));

  $("addCustomInterval").addEventListener("click",()=>{
    const s=Number($("customSemitones").value);
    if(Number.isFinite(s)) addDerived(s,(s>=0?"+":"")+s+" semitone interval");
  });

  document.querySelectorAll(".set-root").forEach(b=>b.addEventListener("click",()=>setRootHz(Number(b.dataset.freq))));
  document.querySelectorAll(".add-preset").forEach(b=>b.addEventListener("click",()=>addAbsolute(Number(b.dataset.freq),b.dataset.label)));
  $("addCustomFrequency").addEventListener("click",()=>addAbsolute(Number($("customFrequency").value)));

  $("playAll").addEventListener("click",playAll);
  $("playAll2").addEventListener("click",playAll);
  $("stopAll").addEventListener("click",stopAll);
  $("stopAll2").addEventListener("click",stopAll);
  $("clearAll").addEventListener("click",clearAll);
  $("clearDerived").addEventListener("click",clearDerived);
  $("masterVolume").addEventListener("input",e=>{$("masterVolumeText").textContent=e.target.value+"%";updateMasterGain();});

  window.addEventListener("beforeunload",stopAll);

  populateNotes();
  renderRoot();
  renderIntervals();
  renderRecipes();
  renderLayers();
  $("rootNoteSelect").value=String(midiToFreq(69));
})();
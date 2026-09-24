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
    {name:"Major", semis:[0,4,7], desc:"1 • 3 • 5"},
    {name:"Minor", semis:[0,3,7], desc:"1 • ♭3 • 5"},
    {name:"Sus2", semis:[0,2,7], desc:"1 • 2 • 5"},
    {name:"Sus4", semis:[0,5,7], desc:"1 • 4 • 5"},
    {name:"Major 7", semis:[0,4,7,11], desc:"1 • 3 • 5 • 7"},
    {name:"Dominant 7", semis:[0,4,7,10], desc:"1 • 3 • 5 • ♭7"},
    {name:"Minor 7", semis:[0,3,7,10], desc:"1 • ♭3 • 5 • ♭7"},
    {name:"Add 9", semis:[0,4,7,14], desc:"1 • 3 • 5 • 9"},
    {name:"Major 9", semis:[0,4,7,11,14], desc:"1 • 3 • 5 • 7 • 9"},
    {name:"Minor 9", semis:[0,3,7,10,14], desc:"1 • ♭3 • 5 • ♭7 • 9"},
    {name:"11th", semis:[0,4,7,10,14,17], desc:"1 • 3 • 5 • ♭7 • 9 • 11"},
    {name:"13th", semis:[0,4,7,10,14,17,21], desc:"1 • 3 • 5 • ♭7 • 9 • 11 • 13"}
  ];

  const state = {
    ctx:null,
    master:null,
    compressor:null,
    rootHz:440,
    rootLabel:"A4",
    current:null,
    currentVoice:null,
    history:[],
    historyIndex:-1,
    editingLayerId:null,
    editingBackup:null,
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
    if (!(f>0)) return {name:"—",cents:0,midi:null};
    const mf=freqToMidi(f), m=Math.round(mf);
    return {
      name:noteNames[(m%12+12)%12]+(Math.floor(m/12)-1),
      cents:(mf-m)*100,
      midi:m
    };
  };
  const fmtHz = f => f < 100 ? f.toFixed(3).replace(/0+$/,"").replace(/\.$/,"") : f.toFixed(2);
  const intervalFreq = semis => state.rootHz * Math.pow(2,Number(semis)/12);

  function ensureAudio(){
    if(!state.ctx){
      state.ctx=new (window.AudioContext||window.webkitAudioContext)();
      state.master=state.ctx.createGain();
      state.compressor=state.ctx.createDynamicsCompressor();
      state.compressor.threshold.value=-12;
      state.compressor.knee.value=18;
      state.compressor.ratio.value=4;
      state.compressor.attack.value=.008;
      state.compressor.release.value=.18;
      state.master.connect(state.compressor);
      state.compressor.connect(state.ctx.destination);
      updateMasterGain();
    }
    if(state.ctx.state==="suspended") state.ctx.resume();
    return state.ctx;
  }

  function updateMasterGain(){
    if(!state.master||!state.ctx) return;
    state.master.gain.setTargetAtTime(Number($("masterVolume").value)/100,state.ctx.currentTime,.015);
  }

  function makeVoice(freq,wave){
    if(!(freq>0)||freq>20000) return null;
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

  function stopVoice(v){
    if(!v) return;
    try{v.osc.stop();}catch{}
    try{v.osc.disconnect();}catch{}
    try{v.gain.disconnect();}catch{}
  }

  function activeVoices(){
    const out=[];
    if(state.currentVoice && state.current) out.push({voice:state.currentVoice,volume:state.current.volume});
    state.layers.forEach(l=>{if(l.voice) out.push({voice:l.voice,volume:l.volume});});
    return out;
  }

  function rebalance(){
    if(!state.ctx) {
      $("audioStatus").textContent="Nothing playing";
      $("audioStatus").style.color="";
      return;
    }
    const voices=activeVoices();
    const n=Math.max(1,voices.length);
    const scale=.42/Math.sqrt(n);
    voices.forEach(({voice,volume})=>{
      const target=(volume/100)*scale;
      try{voice.gain.gain.setTargetAtTime(target,state.ctx.currentTime,.012);}
      catch{voice.gain.gain.value=target;}
    });
    $("audioStatus").textContent=voices.length ? voices.length+" voice"+(voices.length===1?"":"s")+" playing" : "Nothing playing";
    $("audioStatus").style.color=voices.length?"var(--green)":"";
  }

  function currentFreq(){
    if(!state.current) return null;
    return state.current.mode==="derived"
      ? intervalFreq(state.current.semitones)
      : state.current.freq;
  }

  function currentSnapshot(){
    if(!state.current) return null;
    return {
      mode:state.current.mode,
      semitones:state.current.semitones,
      freq:state.current.freq,
      label:state.current.label,
      volume:state.current.volume,
      waveform:state.current.waveform
    };
  }

  function pushHistory(){
    const snap=currentSnapshot();
    if(!snap) return;
    const last=state.history[state.historyIndex];
    const same=last &&
      last.mode===snap.mode &&
      Math.abs((last.semitones??0)-(snap.semitones??0))<.0001 &&
      Math.abs((last.freq??0)-(snap.freq??0))<.0001 &&
      last.label===snap.label;
    if(same){updateHistoryButtons();return;}
    state.history=state.history.slice(0,state.historyIndex+1);
    state.history.push(snap);
    if(state.history.length>60) state.history.shift();
    state.historyIndex=state.history.length-1;
    updateHistoryButtons();
  }

  function updateHistoryButtons(){
    $("historyBack").disabled=state.historyIndex<=0;
    $("historyForward").disabled=state.historyIndex<0||state.historyIndex>=state.history.length-1;
  }

  function applyHistory(index){
    if(index<0||index>=state.history.length) return;
    state.historyIndex=index;
    const snap=state.history[index];
    state.current={...snap};
    syncCurrentControls();
    startCurrent();
    renderIntervals();
    updateHistoryButtons();
  }

  function renderRoot(){
    const n=freqToNote(state.rootHz);
    $("rootNote").textContent=n.name;
    $("rootHzReadout").textContent=fmtHz(state.rootHz);
    $("rootDetail").textContent="Nearest "+n.name+" • "+(n.cents>=0?"+":"")+n.cents.toFixed(1)+" cents";
  }

  function populateNotes(){
    const select=$("rootNoteSelect");
    select.innerHTML="";
    for(let o=0;o<=9;o++){
      for(const n of noteNames){
        const name=n+o,midi=noteToMidi(name),f=midiToFreq(midi);
        if(f<8||f>20000) continue;
        const opt=document.createElement("option");
        opt.value=String(f);
        opt.textContent=name+" — "+f.toFixed(2)+" Hz";
        if(name==="A4") opt.selected=true;
        select.appendChild(opt);
      }
    }
  }

  function syncRootSelect(){
    let best=null,bestDiff=Infinity;
    [...$("rootNoteSelect").options].forEach(o=>{
      const d=Math.abs(Math.log2(Number(o.value)/state.rootHz));
      if(d<bestDiff){bestDiff=d;best=o;}
    });
    if(best) $("rootNoteSelect").value=best.value;
  }

  function retuneDerived(){
    if(state.current && state.current.mode==="derived" && state.currentVoice && state.ctx){
      const f=currentFreq();
      if(f>0&&f<=20000) state.currentVoice.osc.frequency.setTargetAtTime(f,state.ctx.currentTime,.012);
      else stopCurrent();
    }
    state.layers.forEach(layer=>{
      if(layer.type!=="derived") return;
      layer.freq=intervalFreq(layer.semitones);
      if(layer.voice && layer.freq>0 && layer.freq<=20000){
        layer.voice.osc.frequency.setTargetAtTime(layer.freq,state.ctx.currentTime,.012);
      }else if(layer.voice){
        stopLayer(layer);
      }
    });
    renderCurrent();
    renderIntervals();
    renderLayers();
  }

  function setRootHz(value,{syncSelect=true}={}){
    let hz=Number(value);
    if(!Number.isFinite(hz)) return;
    hz=clamp(hz,.01,20000);
    state.rootHz=hz;
    $("rootFrequency").value=fmtHz(hz);
    if(syncSelect) syncRootSelect();
    renderRoot();
    retuneDerived();
  }

  function renderCurrent(){
    const enabled=!!state.current;
    $("auditionToggle").disabled=!enabled;
    $("addAuditionToStack").disabled=!enabled;
    $("currentOctDown").disabled=!enabled;
    $("currentOctUp").disabled=!enabled;
    $("currentWave").disabled=!enabled;
    $("currentVolume").disabled=!enabled;

    if(!state.current){
      $("auditionInterval").textContent="Nothing selected";
      $("auditionNote").textContent="—";
      $("auditionHz").textContent="— Hz";
      $("auditionRelation").textContent="Choose a preset, interval, or frequency to begin.";
      $("auditionToggle").textContent="▶ Play Current Note";
      $("addAuditionToStack").textContent="＋ Add Current Note to Stack";
      return;
    }

    const f=currentFreq();
    const note=freqToNote(f).name;
    $("auditionInterval").textContent=state.current.label;
    $("auditionNote").textContent=note;
    $("auditionHz").textContent=fmtHz(f)+" Hz";
    $("auditionRelation").textContent=state.current.mode==="derived"
      ? (state.current.semitones>=0?"+":"")+state.current.semitones+" semitones from root ("+fmtHz(state.rootHz)+" Hz)"
      : "Independent frequency";
    $("auditionToggle").textContent=state.currentVoice?"■ Stop Current Note":"▶ Play Current Note";
    $("addAuditionToStack").textContent=state.editingLayerId!==null?"✓ Update Layer in Stack":"＋ Add Current Note to Stack";
  }

  function syncCurrentControls(){
    if(!state.current){renderCurrent();return;}
    $("currentWave").value=state.current.waveform;
    $("currentVolume").value=String(state.current.volume);
    $("currentVolumeText").textContent=state.current.volume+"%";
    renderCurrent();
  }

  function startCurrent(){
    if(!state.current) return;
    const f=currentFreq();
    if(!(f>0)||f>20000) return;
    if(state.currentVoice){
      state.currentVoice.osc.type=state.current.waveform;
      state.currentVoice.osc.frequency.setTargetAtTime(f,state.ctx.currentTime,.012);
    }else{
      state.currentVoice=makeVoice(f,state.current.waveform);
    }
    rebalance();
    renderCurrent();
  }

  function stopCurrent(){
    if(state.currentVoice) stopVoice(state.currentVoice);
    state.currentVoice=null;
    rebalance();
    renderCurrent();
  }

  function setCurrent(next,{autoplay=true,record=true}={}){
    const volume=state.current?.volume ?? 28;
    const waveform=state.current?.waveform ?? "sine";
    state.current={
      mode:next.mode,
      semitones:next.semitones ?? null,
      freq:next.freq ?? null,
      label:next.label || "Current Note",
      volume:next.volume ?? volume,
      waveform:next.waveform ?? waveform
    };
    syncCurrentControls();
    if(record) pushHistory();
    renderIntervals();
    if(autoplay) startCurrent();
  }

  function useAsRootAndCurrent(freq,label){
    if(state.editingLayerId!==null) restoreEditingLayer();
    setRootHz(freq);
    state.rootLabel=label;
    setCurrent({mode:"derived",semitones:0,label:"Root — "+label},{autoplay:true,record:true});
  }

  function selectInterval(semitones,label){
    if(!state.current){
      setCurrent({mode:"derived",semitones:Number(semitones),label},{autoplay:true,record:true});
      return;
    }
    setCurrent({
      mode:"derived",
      semitones:Number(semitones),
      label
    },{autoplay:true,record:true});
  }

  function shiftCurrentOctave(direction){
    if(!state.current) return;
    const step=direction*12;
    if(state.current.mode==="derived"){
      selectInterval(state.current.semitones+step,
        (direction>0?"Octave up — ":"Octave down — ")+state.current.label);
    }else{
      const f=clamp(state.current.freq*Math.pow(2,direction),.01,20000);
      setCurrent({
        mode:"absolute",
        freq:f,
        label:(direction>0?"Octave up — ":"Octave down — ")+state.current.label
      },{autoplay:true,record:true});
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
      b.className="interval-btn"+(
        state.current &&
        state.current.mode==="derived" &&
        Math.abs(state.current.semitones-def.s)<.0001 ? " active":""
      );
      b.innerHTML="<strong>"+def.short+" — "+def.name+"</strong><span>"+def.s+" semitone"+(def.s===1?"":"s")+" from root</span><em>"+fmtHz(f)+" Hz • "+note+"</em>";
      b.addEventListener("click",()=>selectInterval(def.s,def.name));
      grid.appendChild(b);
    });
  }

  function renderRecipes(){
    const grid=$("recipeGrid");
    grid.innerHTML="";
    recipes.forEach(r=>{
      const b=document.createElement("button");
      b.type="button";
      b.className="recipe";
      b.innerHTML="<strong>"+r.name+"</strong><span>"+r.desc+"</span>";
      b.addEventListener("click",()=>{
        r.semis.forEach(s=>{
          if(state.layers.size>=state.maxLayers) return;
          const def=intervalDefs.find(x=>x.s===s);
          addDerivedLayer(s,(def?.name||((s>=0?"+":"")+s+" st"))+" • "+r.name,{start:true});
        });
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

  function startLayer(layer){
    if(!layer||layer.voice||layer.id===state.editingLayerId) return;
    if(!(layer.freq>0)||layer.freq>20000) return;
    layer.voice=makeVoice(layer.freq,layer.waveform);
    rebalance();
  }

  function stopLayer(layer){
    if(!layer) return;
    if(layer.voice) stopVoice(layer.voice);
    layer.voice=null;
    rebalance();
  }

  function addDerivedLayer(semitones,label,{start=false,volume=28,waveform="sine"}={}){
    if(!canAdd()) return null;
    const id=state.nextId++;
    const layer={
      id,
      type:"derived",
      semitones:Number(semitones),
      freq:intervalFreq(Number(semitones)),
      label,
      volume,
      waveform,
      voice:null
    };
    state.layers.set(id,layer);
    if(start) startLayer(layer);
    return layer;
  }

  function addAbsoluteLayer(freq,label,{start=false,volume=28,waveform="sine"}={}){
    if(!canAdd()) return null;
    const id=state.nextId++;
    const layer={
      id,
      type:"absolute",
      semitones:null,
      freq:clamp(Number(freq),.01,20000),
      label,
      volume,
      waveform,
      voice:null
    };
    state.layers.set(id,layer);
    if(start) startLayer(layer);
    return layer;
  }

  function commitCurrent(){
    if(!state.current) return;

    if(state.editingLayerId!==null){
      const layer=state.layers.get(state.editingLayerId);
      if(layer){
        layer.type=state.current.mode;
        layer.semitones=state.current.mode==="derived"?state.current.semitones:null;
        layer.freq=currentFreq();
        layer.label=state.current.label;
        layer.volume=state.current.volume;
        layer.waveform=state.current.waveform;
        stopCurrent();
        startLayer(layer);
      }
      state.editingLayerId=null;
      state.editingBackup=null;
      renderLayers();
      renderCurrent();
      return;
    }

    const opts={
      start:true,
      volume:state.current.volume,
      waveform:state.current.waveform
    };
    if(state.current.mode==="derived"){
      addDerivedLayer(state.current.semitones,state.current.label,opts);
    }else{
      addAbsoluteLayer(state.current.freq,state.current.label,opts);
    }
    stopCurrent();
    renderLayers();
  }

  function restoreEditingLayer(){
    if(state.editingLayerId===null||!state.editingBackup) return;
    const layer=state.layers.get(state.editingLayerId);
    if(layer){
      Object.assign(layer,{...state.editingBackup.snapshot,voice:null});
      if(state.editingBackup.wasPlaying) startLayer(layer);
    }
    state.editingLayerId=null;
    state.editingBackup=null;
  }

  function loadLayerForEdit(id){
    if(state.editingLayerId!==null && state.editingLayerId!==id){
      restoreEditingLayer();
    }
    const layer=state.layers.get(id);
    if(!layer) return;

    const wasPlaying=!!layer.voice;
    stopLayer(layer);
    stopCurrent();

    state.editingLayerId=id;
    state.editingBackup={
      wasPlaying,
      snapshot:{
        type:layer.type,
        semitones:layer.semitones,
        freq:layer.freq,
        label:layer.label,
        volume:layer.volume,
        waveform:layer.waveform
      }
    };

    state.current={
      mode:layer.type,
      semitones:layer.semitones,
      freq:layer.type==="absolute"?layer.freq:null,
      label:layer.label,
      volume:layer.volume,
      waveform:layer.waveform
    };
    syncCurrentControls();
    pushHistory();
    startCurrent();
    renderIntervals();
    renderLayers();
  }

  function playStack(){
    ensureAudio();
    state.layers.forEach((layer,id)=>{
      if(id!==state.editingLayerId) startLayer(layer);
    });
    renderLayers();
  }

  function stopAll(){
    stopCurrent();
    state.layers.forEach(stopLayer);
    renderLayers();
  }

  function clearStack(){
    stopAll();
    state.layers.clear();
    state.editingLayerId=null;
    state.editingBackup=null;
    renderLayers();
    renderCurrent();
  }

  function clearDerived(){
    [...state.layers.entries()].forEach(([id,l])=>{
      if(l.type==="derived"){
        if(id===state.editingLayerId){
          stopCurrent();
          state.editingLayerId=null;
          state.editingBackup=null;
        }
        stopLayer(l);
        state.layers.delete(id);
      }
    });
    renderLayers();
    renderCurrent();
  }

  function renderLayers(){
    const list=$("layerList");
    list.innerHTML="";
    $("layerCount").textContent=state.layers.size+" layer"+(state.layers.size===1?"":"s");
    $("emptyState").style.display=state.layers.size?"none":"block";

    state.layers.forEach((layer,id)=>{
      const row=document.createElement("div");
      row.className="layer-row"+(layer.voice?"":" paused")+(id===state.editingLayerId?" editing":"");
      row.tabIndex=0;
      row.setAttribute("role","button");
      row.setAttribute("aria-label","Edit "+layer.label+" in Current Note");

      const note=freqToNote(layer.freq).name;
      const relation=layer.type==="derived"
        ? (layer.semitones>=0?"+":"")+layer.semitones+" st • root-derived"
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
      wave.addEventListener("click",e=>e.stopPropagation());
      wave.addEventListener("change",e=>{
        e.stopPropagation();
        layer.waveform=wave.value;
        if(layer.voice) layer.voice.osc.type=layer.waveform;
      });

      const vol=row.querySelector('.layer-vol input');
      const volText=row.querySelector('.layer-vol span');
      vol.addEventListener("click",e=>e.stopPropagation());
      vol.addEventListener("input",e=>{
        e.stopPropagation();
        layer.volume=Number(vol.value);
        volText.textContent=layer.volume+"%";
        rebalance();
      });

      const toggle=row.querySelector(".toggle");
      toggle.addEventListener("click",e=>{
        e.stopPropagation();
        if(id===state.editingLayerId) return;
        if(layer.voice) stopLayer(layer); else startLayer(layer);
        renderLayers();
      });

      row.querySelector(".remove").addEventListener("click",e=>{
        e.stopPropagation();
        if(id===state.editingLayerId){
          stopCurrent();
          state.editingLayerId=null;
          state.editingBackup=null;
        }
        stopLayer(layer);
        state.layers.delete(id);
        renderLayers();
        renderCurrent();
      });

      row.addEventListener("click",()=>loadLayerForEdit(id));
      row.addEventListener("keydown",e=>{
        if(e.key==="Enter"||e.key===" "){e.preventDefault();loadLayerForEdit(id);}
      });

      list.appendChild(row);
    });
    rebalance();
  }

  $("rootFrequency").addEventListener("change",e=>setRootHz(e.target.value));
  $("rootFrequency").addEventListener("input",e=>{
    const v=Number(e.target.value);
    if(Number.isFinite(v)&&v>0) setRootHz(v,{syncSelect:false});
  });
  $("rootNoteSelect").addEventListener("change",e=>setRootHz(Number(e.target.value),{syncSelect:false}));
  $("rootOctDown").addEventListener("click",()=>setRootHz(state.rootHz/2));
  $("rootOctUp").addEventListener("click",()=>setRootHz(state.rootHz*2));

  $("currentOctDown").addEventListener("click",()=>shiftCurrentOctave(-1));
  $("currentOctUp").addEventListener("click",()=>shiftCurrentOctave(1));
  $("currentWave").addEventListener("change",()=>{
    if(!state.current) return;
    state.current.waveform=$("currentWave").value;
    if(state.currentVoice) state.currentVoice.osc.type=state.current.waveform;
  });
  $("currentVolume").addEventListener("input",e=>{
    if(!state.current) return;
    state.current.volume=Number(e.target.value);
    $("currentVolumeText").textContent=state.current.volume+"%";
    rebalance();
  });
  $("auditionToggle").addEventListener("click",()=>state.currentVoice?stopCurrent():startCurrent());
  $("addAuditionToStack").addEventListener("click",commitCurrent);

  $("previewCustomInterval").addEventListener("click",()=>{
    const s=Number($("customSemitones").value);
    if(Number.isFinite(s)) selectInterval(s,(s>=0?"+":"")+s+" semitone interval");
  });

  $("historyBack").addEventListener("click",()=>applyHistory(state.historyIndex-1));
  $("historyForward").addEventListener("click",()=>applyHistory(state.historyIndex+1));

  document.querySelectorAll(".preset-current").forEach(b=>{
    b.addEventListener("click",()=>useAsRootAndCurrent(Number(b.dataset.freq),b.dataset.label));
  });

  $("useCustomFrequency").addEventListener("click",()=>{
    const hz=Number($("customFrequency").value);
    if(Number.isFinite(hz)&&hz>0) useAsRootAndCurrent(hz,"Custom "+fmtHz(hz)+" Hz");
  });

  $("playAll").addEventListener("click",playStack);
  $("playAll2").addEventListener("click",playStack);
  $("stopAll").addEventListener("click",stopAll);
  $("stopAll2").addEventListener("click",stopAll);
  $("clearAll").addEventListener("click",clearStack);
  $("clearDerived").addEventListener("click",clearDerived);
  $("masterVolume").addEventListener("input",e=>{
    $("masterVolumeText").textContent=e.target.value+"%";
    updateMasterGain();
  });

  window.addEventListener("beforeunload",()=>{
    stopCurrent();
    state.layers.forEach(stopLayer);
  });

  populateNotes();
  renderRoot();
  renderCurrent();
  renderIntervals();
  renderRecipes();
  renderLayers();
  updateHistoryButtons();
  $("rootNoteSelect").value=String(midiToFreq(69));
})();
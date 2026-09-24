(() => {
  const $ = id => document.getElementById(id);
  const noteNames=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

  const intervals=[
    {name:"Octave Down",short:"8ve ↓",s:-12,degree:"octave"},

    {name:"Minor 2nd",short:"m2",s:1,degree:"2nd"},
    {name:"Major 2nd",short:"M2",s:2,degree:"2nd"},

    {name:"Minor 3rd",short:"m3",s:3,degree:"3rd"},
    {name:"Major 3rd",short:"M3",s:4,degree:"3rd"},

    {name:"Perfect 4th",short:"P4",s:5,degree:"4th"},
    {name:"Augmented 4th / Tritone",short:"#4 / TT",s:6,degree:"4th"},

    {name:"Perfect 5th",short:"P5",s:7,degree:"5th"},

    {name:"Minor 6th",short:"m6",s:8,degree:"6th"},
    {name:"Major 6th",short:"M6",s:9,degree:"6th"},

    {name:"Minor 7th",short:"m7",s:10,degree:"7th"},
    {name:"Major 7th",short:"M7",s:11,degree:"7th"},

    {name:"Perfect Octave",short:"P8",s:12,degree:"8th"},

    {name:"Minor 9th",short:"m9",s:13,degree:"9th"},
    {name:"Major 9th",short:"M9",s:14,degree:"9th"},

    {name:"Minor 10th",short:"m10",s:15,degree:"10th"},
    {name:"Major 10th",short:"M10",s:16,degree:"10th"},

    {name:"Perfect 11th",short:"P11",s:17,degree:"11th"},
    {name:"Augmented 11th",short:"#11",s:18,degree:"11th"},

    {name:"Perfect 12th",short:"P12",s:19,degree:"12th"},

    {name:"Minor 13th",short:"m13",s:20,degree:"13th"},
    {name:"Major 13th",short:"M13",s:21,degree:"13th"}
  ];

  const state={
    ctx:null,master:null,compressor:null,currentVoice:null,
    currentHz:440,currentLabel:"A440 — Standard",
    intervalRootHz:null,intervalRootLabel:null,
    history:[],manualStart:null,
    stack:new Map(),nextId:1,maxLayers:64
  };

  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const fmt=f=>f<100?f.toFixed(3).replace(/0+$/,"").replace(/\.$/,""):f.toFixed(2);
  const transformed=(f,s)=>f*Math.pow(2,s/12);

  const freqToNote=f=>{
    const mf=69+12*Math.log2(f/440),m=Math.round(mf);
    return {
      name:noteNames[(m%12+12)%12]+(Math.floor(m/12)-1),
      cents:(mf-m)*100
    };
  };

  function snapshotCurrent(){
    return {
      hz:state.currentHz,
      label:state.currentLabel,
      waveform:$("currentWave").value,
      volume:Number($("currentVolume").value)
    };
  }

  function snapshotsEqual(a,b){
    return !!a && !!b &&
      Math.abs(a.hz-b.hz)<0.000001 &&
      a.label===b.label &&
      a.waveform===b.waveform &&
      a.volume===b.volume;
  }

  function pushHistory(snap=snapshotCurrent()){
    const last=state.history[state.history.length-1];
    if(!snapshotsEqual(last,snap)) state.history.push({...snap});
    if(state.history.length>80) state.history.shift();
    updateBackButton();
  }

  function updateBackButton(){
    $("currentBack").disabled=state.history.length===0;
  }

  function goBack(){
    if(!state.history.length) return;
    const snap=state.history.pop();
    state.currentHz=snap.hz;
    state.currentLabel=snap.label;
    $("currentWave").value=snap.waveform;
    $("currentVolume").value=String(snap.volume);
    $("currentVolumeText").textContent=snap.volume+"%";
    if(state.currentVoice&&state.ctx){
      state.currentVoice.osc.type=snap.waveform;
      state.currentVoice.osc.frequency.setTargetAtTime(state.currentHz,state.ctx.currentTime,.012);
    }
    renderCurrent();
    rebalance();
    updateBackButton();
  }

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
      updateMaster();
    }
    if(state.ctx.state==="suspended") state.ctx.resume();
    return state.ctx;
  }

  function makeVoice(freq,wave){
    if(!(freq>0)||freq>20000) return null;
    const ctx=ensureAudio();
    const osc=ctx.createOscillator(),gain=ctx.createGain();
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
    const voices=[];
    if(state.currentVoice) voices.push({voice:state.currentVoice,volume:Number($("currentVolume").value)});
    state.stack.forEach(layer=>{if(layer.voice) voices.push({voice:layer.voice,volume:layer.volume});});
    return voices;
  }

  function rebalance(){
    if(!state.ctx){
      $("audioStatus").textContent="Nothing playing";
      $("audioStatus").style.color="";
      return;
    }
    const voices=activeVoices();
    const scale=.42/Math.sqrt(Math.max(1,voices.length));
    voices.forEach(({voice,volume})=>{
      const v=(volume/100)*scale;
      try{voice.gain.gain.setTargetAtTime(v,state.ctx.currentTime,.012);}
      catch{voice.gain.gain.value=v;}
    });
    $("audioStatus").textContent=voices.length
      ? voices.length+" voice"+(voices.length===1?"":"s")+" playing"
      : "Nothing playing";
    $("audioStatus").style.color=voices.length?"var(--green)":"";
  }

  function updateMaster(){
    if(state.master&&state.ctx){
      state.master.gain.setTargetAtTime(Number($("masterVolume").value)/100,state.ctx.currentTime,.015);
    }
  }

  function intervalBaseHz(){
    return state.intervalRootHz ?? state.currentHz;
  }

  function intervalBaseLabel(){
    return state.intervalRootLabel ?? state.currentLabel;
  }

  function renderIntervalRoot(){
    if(state.intervalRootHz===null){
      $("intervalRootStatus").textContent=fmt(state.currentHz)+" Hz • current (not yet committed)";
    }else{
      $("intervalRootStatus").textContent=fmt(state.intervalRootHz)+" Hz • "+state.intervalRootLabel;
    }
  }

  function renderCurrent(){
    $("currentFrequency").value=fmt(state.currentHz);
    $("currentHzDisplay").textContent=fmt(state.currentHz);
    const note=freqToNote(state.currentHz);
    $("currentNote").textContent=note.name;
    $("currentCents").textContent=(note.cents>=0?"+":"")+note.cents.toFixed(1)+" cents";
    $("currentSource").textContent=state.currentLabel;
    $("currentWarning").textContent=state.currentHz<20
      ?"Below the usual audible range. Use an octave interval to move it higher."
      :"";
    $("playCurrent").textContent=state.currentVoice
      ?"■ Stop Current Frequency"
      :"▶ Play Current Frequency";
    renderIntervalRoot();
    renderIntervals();
  }

  function setCurrent(freq,label,{autoplay=false,record=true}={}){
    const hz=Number(freq);
    if(!Number.isFinite(hz)||hz<=0) return;
    if(record) pushHistory();
    state.currentHz=clamp(hz,.01,20000);
    state.currentLabel=label||"Custom Frequency";
    if(state.currentVoice&&state.ctx){
      state.currentVoice.osc.frequency.setTargetAtTime(state.currentHz,state.ctx.currentTime,.012);
    }
    renderCurrent();
    if(autoplay) startCurrent();
  }

  function startCurrent(){
    if(state.currentVoice){
      state.currentVoice.osc.type=$("currentWave").value;
      state.currentVoice.osc.frequency.setTargetAtTime(state.currentHz,state.ctx.currentTime,.012);
      renderCurrent();
      return;
    }
    state.currentVoice=makeVoice(state.currentHz,$("currentWave").value);
    rebalance();
    renderCurrent();
  }

  function stopCurrent(){
    if(state.currentVoice) stopVoice(state.currentVoice);
    state.currentVoice=null;
    rebalance();
    renderCurrent();
  }

  function applyInterval(def){
    const root=intervalBaseHz();
    const next=transformed(root,def.s);
    const rootLabel=intervalBaseLabel();
    setCurrent(
      next,
      def.name+" of "+rootLabel,
      {autoplay:!!state.currentVoice,record:true}
    );
  }

  function renderIntervals(){
    const grid=$("intervalGrid");
    grid.innerHTML="";
    const root=intervalBaseHz();
    intervals.forEach(def=>{
      const next=transformed(root,def.s);
      const button=document.createElement("button");
      button.type="button";
      button.className="interval-btn";
      button.innerHTML=
        "<strong>"+def.short+" — "+def.name+"</strong>"+
        "<span>"+def.degree+" • "+(def.s>=0?"+":"")+def.s+" semitones from interval root</span>"+
        "<em>"+fmt(next)+" Hz</em>";
      button.addEventListener("click",()=>applyInterval(def));
      grid.appendChild(button);
    });
  }

  function setIntervalRoot(freq,label){
    state.intervalRootHz=Number(freq);
    state.intervalRootLabel=label||("Stack root "+fmt(freq)+" Hz");
    renderIntervalRoot();
    renderIntervals();
  }

  function addToStack(){
    if(state.stack.size>=state.maxLayers) return;
    const id=state.nextId++;
    const layer={
      id,
      freq:state.currentHz,
      label:state.currentLabel,
      waveform:$("currentWave").value,
      volume:Number($("currentVolume").value),
      voice:null
    };
    state.stack.set(id,layer);
    setIntervalRoot(layer.freq,layer.label);
    startLayer(layer);
    renderStack();
  }

  function startLayer(layer){
    if(layer.voice) return;
    layer.voice=makeVoice(layer.freq,layer.waveform);
    rebalance();
  }

  function stopLayer(layer){
    if(layer.voice) stopVoice(layer.voice);
    layer.voice=null;
    rebalance();
  }

  function playStack(){
    state.stack.forEach(startLayer);
    renderStack();
  }

  function stopAll(){
    stopCurrent();
    state.stack.forEach(stopLayer);
    renderStack();
  }

  function clearStack(){
    stopAll();
    state.stack.clear();
    state.intervalRootHz=null;
    state.intervalRootLabel=null;
    renderStack();
    renderCurrent();
  }

  function loadLayer(layer){
    setCurrent(layer.freq,layer.label,{record:true});
    $("currentWave").value=layer.waveform;
    $("currentVolume").value=String(layer.volume);
    $("currentVolumeText").textContent=layer.volume+"%";
    if(state.currentVoice){
      state.currentVoice.osc.type=layer.waveform;
      rebalance();
    }
    setIntervalRoot(layer.freq,layer.label);
    renderCurrent();
  }

  function renderStack(){
    const list=$("stackList");
    list.innerHTML="";
    $("stackCount").textContent=state.stack.size+" layer"+(state.stack.size===1?"":"s");
    $("emptyState").style.display=state.stack.size?"none":"block";

    state.stack.forEach((layer,id)=>{
      const row=document.createElement("div");
      row.className="stack-row";
      const note=freqToNote(layer.freq);
      row.innerHTML=
        '<div class="stack-info"><strong></strong><span></span></div>'+
        '<select class="wave"><option value="sine">Sine</option><option value="triangle">Triangle</option><option value="square">Square</option><option value="sawtooth">Saw</option></select>'+
        '<div class="stack-vol"><input type="range" min="0" max="100" value="'+layer.volume+'"><span>'+layer.volume+'%</span></div>'+
        '<button class="btn icon-btn load" type="button" title="Load into Current Frequency and make interval root">↗</button>'+
        '<button class="btn icon-btn toggle" type="button">'+(layer.voice?"■":"▶")+'</button>'+
        '<button class="btn icon-btn danger remove" type="button">×</button>';

      row.querySelector(".stack-info strong").textContent=layer.label;
      row.querySelector(".stack-info span").textContent=fmt(layer.freq)+" Hz • "+note.name;

      const wave=row.querySelector(".wave");
      wave.value=layer.waveform;
      wave.addEventListener("change",()=>{
        layer.waveform=wave.value;
        if(layer.voice) layer.voice.osc.type=layer.waveform;
      });

      const vol=row.querySelector(".stack-vol input");
      const volText=row.querySelector(".stack-vol span");
      vol.addEventListener("input",()=>{
        layer.volume=Number(vol.value);
        volText.textContent=layer.volume+"%";
        rebalance();
      });

      row.querySelector(".load").addEventListener("click",()=>loadLayer(layer));
      row.querySelector(".toggle").addEventListener("click",()=>{
        layer.voice?stopLayer(layer):startLayer(layer);
        renderStack();
      });
      row.querySelector(".remove").addEventListener("click",()=>{
        stopLayer(layer);
        state.stack.delete(id);
        renderStack();
      });

      list.appendChild(row);
    });
    rebalance();
  }

  $("currentBack").addEventListener("click",goBack);

  $("currentFrequency").addEventListener("focus",()=>{
    state.manualStart=snapshotCurrent();
  });

  $("currentFrequency").addEventListener("input",e=>{
    const value=Number(e.target.value);
    if(!Number.isFinite(value)||value<=0) return;
    state.currentHz=clamp(value,.01,20000);
    state.currentLabel="Manual Frequency";
    if(state.currentVoice&&state.ctx){
      state.currentVoice.osc.frequency.setTargetAtTime(state.currentHz,state.ctx.currentTime,.012);
    }
    $("currentHzDisplay").textContent=fmt(state.currentHz);
    const note=freqToNote(state.currentHz);
    $("currentNote").textContent=note.name;
    $("currentCents").textContent=(note.cents>=0?"+":"")+note.cents.toFixed(1)+" cents";
    $("currentSource").textContent=state.currentLabel;
    $("currentWarning").textContent=state.currentHz<20
      ?"Below the usual audible range. Use an octave interval to move it higher."
      :"";
    renderIntervalRoot();
    renderIntervals();
  });

  $("currentFrequency").addEventListener("change",e=>{
    if(state.manualStart && !snapshotsEqual(state.manualStart,snapshotCurrent())){
      pushHistory(state.manualStart);
    }
    state.manualStart=null;
    setCurrent(e.target.value,"Manual Frequency",{record:false});
  });

  $("currentWave").addEventListener("change",()=>{
    if(state.currentVoice) state.currentVoice.osc.type=$("currentWave").value;
  });

  $("currentVolume").addEventListener("input",e=>{
    $("currentVolumeText").textContent=e.target.value+"%";
    rebalance();
  });

  $("playCurrent").addEventListener("click",()=>{
    state.currentVoice?stopCurrent():startCurrent();
  });

  $("addToStack").addEventListener("click",addToStack);

  document.querySelectorAll(".preset").forEach(button=>{
    button.addEventListener("click",()=>{
      setCurrent(
        Number(button.dataset.freq),
        button.dataset.label,
        {autoplay:!!state.currentVoice,record:true}
      );
    });
  });

  $("playStack").addEventListener("click",playStack);
  $("playStackTop").addEventListener("click",playStack);
  $("stopAll").addEventListener("click",stopAll);
  $("stopAllTop").addEventListener("click",stopAll);
  $("clearStack").addEventListener("click",clearStack);
  $("masterVolume").addEventListener("input",e=>{
    $("masterVolumeText").textContent=e.target.value+"%";
    updateMaster();
  });

  window.addEventListener("beforeunload",()=>{
    stopCurrent();
    state.stack.forEach(stopLayer);
  });

  renderCurrent();
  renderStack();
  updateBackButton();
})();
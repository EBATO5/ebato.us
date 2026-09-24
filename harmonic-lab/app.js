(() => {
  const $ = id => document.getElementById(id);
  const noteNames=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const intervals=[
    {name:"Octave Down",short:"8ve ↓",s:-12},
    {name:"Minor 3rd",short:"m3",s:3},
    {name:"Major 3rd",short:"M3",s:4},
    {name:"Perfect 4th",short:"P4",s:5},
    {name:"Perfect 5th",short:"P5",s:7},
    {name:"Minor 7th",short:"m7",s:10},
    {name:"Major 7th",short:"M7",s:11},
    {name:"Octave Up",short:"8ve ↑",s:12},
    {name:"Major 9th",short:"9th",s:14},
    {name:"Perfect 11th",short:"11th",s:17},
    {name:"Augmented 11th",short:"#11",s:18},
    {name:"Major 13th",short:"13th",s:21}
  ];

  const state={
    ctx:null,master:null,compressor:null,currentVoice:null,
    currentHz:440,currentLabel:"A440 — Standard",
    stack:new Map(),nextId:1,maxLayers:64
  };

  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const fmt=f=>f<100?f.toFixed(3).replace(/0+$/,"").replace(/\.$/,""):f.toFixed(2);
  const freqToNote=f=>{
    const mf=69+12*Math.log2(f/440),m=Math.round(mf);
    return {name:noteNames[(m%12+12)%12]+(Math.floor(m/12)-1),cents:(mf-m)*100};
  };
  const transformed=(f,s)=>f*Math.pow(2,s/12);

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
    osc.type=wave; osc.frequency.value=freq; gain.gain.value=0;
    osc.connect(gain); gain.connect(state.master); osc.start();
    return {osc,gain};
  }

  function stopVoice(v){
    if(!v)return;
    try{v.osc.stop();}catch{}
    try{v.osc.disconnect();}catch{}
    try{v.gain.disconnect();}catch{}
  }

  function activeVoices(){
    const a=[];
    if(state.currentVoice)a.push({voice:state.currentVoice,volume:Number($("currentVolume").value)});
    state.stack.forEach(x=>{if(x.voice)a.push({voice:x.voice,volume:x.volume});});
    return a;
  }

  function rebalance(){
    if(!state.ctx){
      $("audioStatus").textContent="Nothing playing";
      return;
    }
    const a=activeVoices(),n=Math.max(1,a.length),scale=.42/Math.sqrt(n);
    a.forEach(({voice,volume})=>{
      const v=(volume/100)*scale;
      try{voice.gain.gain.setTargetAtTime(v,state.ctx.currentTime,.012);}catch{voice.gain.gain.value=v;}
    });
    $("audioStatus").textContent=a.length?a.length+" voice"+(a.length===1?"":"s")+" playing":"Nothing playing";
    $("audioStatus").style.color=a.length?"var(--green)":"";
  }

  function updateMaster(){
    if(state.master&&state.ctx) state.master.gain.setTargetAtTime(Number($("masterVolume").value)/100,state.ctx.currentTime,.015);
  }

  function renderCurrent(){
    $("currentFrequency").value=fmt(state.currentHz);
    $("currentHzDisplay").textContent=fmt(state.currentHz);
    const n=freqToNote(state.currentHz);
    $("currentNote").textContent=n.name;
    $("currentCents").textContent=(n.cents>=0?"+":"")+n.cents.toFixed(1)+" cents";
    $("currentSource").textContent=state.currentLabel;
    $("currentWarning").textContent=state.currentHz<20
      ?"Below the usual audible range. Try Octave ↑ until you can hear it."
      :"";
    $("playCurrent").textContent=state.currentVoice?"■ Stop Current Frequency":"▶ Play Current Frequency";
    renderIntervals();
  }

  function setCurrent(freq,label,{autoplay=false}={}){
    const hz=Number(freq);
    if(!Number.isFinite(hz)||hz<=0)return;
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
      state.currentVoice.osc.frequency.setTargetAtTime(state.currentHz,state.ctx.currentTime,.012);
      renderCurrent(); return;
    }
    state.currentVoice=makeVoice(state.currentHz,$("currentWave").value);
    rebalance(); renderCurrent();
  }

  function stopCurrent(){
    if(state.currentVoice)stopVoice(state.currentVoice);
    state.currentVoice=null; rebalance(); renderCurrent();
  }

  function applyInterval(def){
    const next=transformed(state.currentHz,def.s);
    setCurrent(next,def.name+" from "+state.currentLabel,{autoplay:!!state.currentVoice});
  }

  function renderIntervals(){
    const grid=$("intervalGrid");
    grid.innerHTML="";
    intervals.forEach(def=>{
      const next=transformed(state.currentHz,def.s);
      const b=document.createElement("button");
      b.type="button"; b.className="interval-btn";
      b.innerHTML="<strong>"+def.short+" — "+def.name+"</strong><span>"+(def.s>=0?"+":"")+def.s+" semitones from current</span><em>"+fmt(next)+" Hz</em>";
      b.addEventListener("click",()=>applyInterval(def));
      grid.appendChild(b);
    });
  }

  function addToStack(){
    if(state.stack.size>=state.maxLayers)return;
    const id=state.nextId++;
    const layer={
      id,freq:state.currentHz,label:state.currentLabel,
      waveform:$("currentWave").value,volume:Number($("currentVolume").value),voice:null
    };
    state.stack.set(id,layer);
    startLayer(layer);
    renderStack();
  }

  function startLayer(layer){
    if(layer.voice)return;
    layer.voice=makeVoice(layer.freq,layer.waveform);
    rebalance();
  }

  function stopLayer(layer){
    if(layer.voice)stopVoice(layer.voice);
    layer.voice=null; rebalance();
  }

  function playStack(){state.stack.forEach(startLayer);renderStack();}
  function stopAll(){stopCurrent();state.stack.forEach(stopLayer);renderStack();}
  function clearStack(){stopAll();state.stack.clear();renderStack();}

  function loadLayer(layer){
    setCurrent(layer.freq,layer.label);
    $("currentWave").value=layer.waveform;
    $("currentVolume").value=String(layer.volume);
    $("currentVolumeText").textContent=layer.volume+"%";
  }

  function renderStack(){
    const list=$("stackList");
    list.innerHTML="";
    $("stackCount").textContent=state.stack.size+" layer"+(state.stack.size===1?"":"s");
    $("emptyState").style.display=state.stack.size?"none":"block";

    state.stack.forEach((layer,id)=>{
      const row=document.createElement("div");
      row.className="stack-row";
      const n=freqToNote(layer.freq);
      row.innerHTML=
        '<div class="stack-info"><strong></strong><span></span></div>'+
        '<select class="wave"><option value="sine">Sine</option><option value="triangle">Triangle</option><option value="square">Square</option><option value="sawtooth">Saw</option></select>'+
        '<div class="stack-vol"><input type="range" min="0" max="100" value="'+layer.volume+'"><span>'+layer.volume+'%</span></div>'+
        '<button class="btn icon-btn load" type="button" title="Load into Current Frequency">↗</button>'+
        '<button class="btn icon-btn toggle" type="button">'+(layer.voice?"■":"▶")+'</button>'+
        '<button class="btn icon-btn danger remove" type="button">×</button>';
      row.querySelector(".stack-info strong").textContent=layer.label;
      row.querySelector(".stack-info span").textContent=fmt(layer.freq)+" Hz • "+n.name;

      const wave=row.querySelector(".wave"); wave.value=layer.waveform;
      wave.addEventListener("change",()=>{layer.waveform=wave.value;if(layer.voice)layer.voice.osc.type=layer.waveform;});

      const vol=row.querySelector(".stack-vol input"),volText=row.querySelector(".stack-vol span");
      vol.addEventListener("input",()=>{layer.volume=Number(vol.value);volText.textContent=layer.volume+"%";rebalance();});

      row.querySelector(".load").addEventListener("click",()=>loadLayer(layer));
      row.querySelector(".toggle").addEventListener("click",()=>{layer.voice?stopLayer(layer):startLayer(layer);renderStack();});
      row.querySelector(".remove").addEventListener("click",()=>{stopLayer(layer);state.stack.delete(id);renderStack();});
      list.appendChild(row);
    });
    rebalance();
  }

  $("currentFrequency").addEventListener("change",e=>setCurrent(e.target.value,"Manual Frequency"));
  $("currentFrequency").addEventListener("input",e=>{
    const v=Number(e.target.value);
    if(Number.isFinite(v)&&v>0){
      state.currentHz=clamp(v,.01,20000);
      state.currentLabel="Manual Frequency";
      if(state.currentVoice&&state.ctx)state.currentVoice.osc.frequency.setTargetAtTime(state.currentHz,state.ctx.currentTime,.012);
      $("currentHzDisplay").textContent=fmt(state.currentHz);
      const n=freqToNote(state.currentHz);
      $("currentNote").textContent=n.name;
      $("currentCents").textContent=(n.cents>=0?"+":"")+n.cents.toFixed(1)+" cents";
      $("currentSource").textContent=state.currentLabel;
      $("currentWarning").textContent=state.currentHz<20?"Below the usual audible range. Try Octave ↑ until you can hear it.":"";
      renderIntervals();
    }
  });

  $("currentWave").addEventListener("change",()=>{if(state.currentVoice)state.currentVoice.osc.type=$("currentWave").value;});
  $("currentVolume").addEventListener("input",e=>{$("currentVolumeText").textContent=e.target.value+"%";rebalance();});
  $("playCurrent").addEventListener("click",()=>state.currentVoice?stopCurrent():startCurrent());
  $("addToStack").addEventListener("click",addToStack);

  document.querySelectorAll(".preset").forEach(b=>b.addEventListener("click",()=>{
    setCurrent(Number(b.dataset.freq),b.dataset.label,{autoplay:!!state.currentVoice});
  }));

  $("playStack").addEventListener("click",playStack);
  $("playStackTop").addEventListener("click",playStack);
  $("stopAll").addEventListener("click",stopAll);
  $("stopAllTop").addEventListener("click",stopAll);
  $("clearStack").addEventListener("click",clearStack);
  $("masterVolume").addEventListener("input",e=>{$("masterVolumeText").textContent=e.target.value+"%";updateMaster();});

  window.addEventListener("beforeunload",()=>{stopCurrent();state.stack.forEach(stopLayer);});

  renderCurrent();
  renderStack();
})();
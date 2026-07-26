export class AudioManager {
  constructor(muted=false) { this.muted=muted; this.context=null; }
  unlock() { if(!this.context) this.context=new (window.AudioContext||window.webkitAudioContext)(); if(this.context.state==="suspended") this.context.resume().catch(()=>{}); }
  tone(freq=440,duration=.06,type="sine") {
    if(this.muted) return; try { this.unlock(); const o=this.context.createOscillator(),g=this.context.createGain(); o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.09,this.context.currentTime);g.gain.exponentialRampToValueAtTime(.001,this.context.currentTime+duration);o.connect(g).connect(this.context.destination);o.start();o.stop(this.context.currentTime+duration); } catch(error) { console.warn("Audio playback failed:",error); }
  }
  toggle() { this.muted=!this.muted; return this.muted; }
}

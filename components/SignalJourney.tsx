"use client";
import { useEffect, useState } from 'react';
export default function SignalJourney() {
  const [mode,setMode]=useState(0);
  useEffect(()=>{
    const reset=()=>setMode(0);
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    window.addEventListener('motion-change',reset);media.addEventListener('change',reset);
    return()=>{window.removeEventListener('motion-change',reset);media.removeEventListener('change',reset);};
  },[]);
  return <section className="signal-journey" aria-labelledby="signal-title">
    <div className="signal-stage" data-scene="portal">
      <div className="portal-poster" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{width:`${18+i*9}%`,height:`${18+i*9}%`,rotate:`${i*8}deg`}}/>)}</div>
    </div>
    <div className="signal-overlay">
      <div className="signal-top"><span className="eyebrow">FROM THOUGHT TO IMPACT</span><a href="#contact">Skip to contact ↘</a></div>
      <div className="signal-copy"><h2 id="signal-title">Follow<br/><em>the signal.</em></h2><p className="signal-arrival" aria-hidden="true">Make it<br/><em>matter.</em></p></div>
      <div className="signal-bottom"><p>From an idea to a system.<br/>From a system to something useful.</p><div className="signal-modes" role="group" aria-label="Particle formation">{['Tunnel','Orbit'].map((label,i)=><button key={label} aria-pressed={mode===i} onClick={()=>{setMode(i);window.dispatchEvent(new CustomEvent('scene-step',{detail:{id:'portal',step:i}}));}}>{label} <span aria-hidden="true">{i?'◉':'◎'}</span></button>)}</div></div>
      <div className="signal-meter" aria-hidden="true"><span/></div>
    </div>
  </section>;
}


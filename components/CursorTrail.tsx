"use client";
import { useEffect, useRef } from "react";

export default function CursorTrail() {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!matchMedia('(pointer: fine)').matches) return;
    const dots = Array.from(ref.current?.querySelectorAll('circle') || []);
    const points = dots.map(() => ({x:0,y:0}));
    let x=0,y=0,last=0,frame=0,started=false;
    const tick = (now:number) => {
      const fade=Math.max(0,1-(now-last)/650);
      points.forEach((p,i) => {
        const target=i ? points[i-1] : {x,y};
        p.x+=(target.x-p.x)*.32; p.y+=(target.y-p.y)*.32;
        dots[i].setAttribute('cx',String(p.x)); dots[i].setAttribute('cy',String(p.y));
        dots[i].setAttribute('opacity',String(fade*(1-i/points.length)*.5));
      });
      frame=fade>0 ? requestAnimationFrame(tick) : 0;
    };
    const move=(event:PointerEvent) => {
      if(event.pointerType!=='mouse') return;
      x=event.clientX;y=event.clientY;last=performance.now();
      if(!started) { points.forEach(p=>{p.x=x;p.y=y;});started=true; }
      if(!frame) frame=requestAnimationFrame(tick);
    };
    const clear=()=> { cancelAnimationFrame(frame);frame=0;started=false;dots.forEach(dot=>dot.setAttribute('opacity','0')); };
    window.addEventListener('pointermove',move,{passive:true});
    window.addEventListener('blur',clear);
    document.addEventListener('pointerleave',clear);
    return()=>{clear();window.removeEventListener('pointermove',move);window.removeEventListener('blur',clear);document.removeEventListener('pointerleave',clear);};
  },[]);
  return <svg ref={ref} className="cursor-trail" aria-hidden="true">{Array.from({length:16},(_,i)=><circle key={i} r={2.8-i*.12} fill="#688bff" opacity="0"/>)}</svg>;
}

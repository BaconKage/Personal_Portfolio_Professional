"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { gsap } from "gsap";

export default function RouteTransition({ reduced }: { reduced: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const panel = useRef<HTMLDivElement>(null);
  const zoom = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const mode = useRef<'curtain' | 'project'>('curtain');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    if (!pending.current) return;
    if (timer.current) clearTimeout(timer.current);
    const finish = () => {
      pending.current = false;
      if (zoom.current) { zoom.current.replaceChildren(); gsap.set(zoom.current, {autoAlpha:0}); }
      gsap.set(panel.current, {yPercent:100});
    };
    if(mode.current === 'project') {
      gsap.to(zoom.current, {opacity:0, scale:1.08, duration:.65, ease:'power2.inOut', onComplete:finish});
    } else gsap.to(panel.current, {yPercent:-100,duration:.75,ease:'expo.inOut',onComplete:finish});
  }, [path]);
  useEffect(() => {
    const curtain = panel.current, stage = zoom.current;
    gsap.set(curtain, {y:0,yPercent:100});
    if(reduced) return;
    let disposed = false;
    const click = async (event:MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('a') : null;
      if(!anchor || anchor.target || anchor.hasAttribute('download') || event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const url = new URL(anchor.href,location.href);
      if(url.origin!==location.origin || url.pathname===location.pathname || url.hash) return;
      event.preventDefault(); event.stopPropagation();
      if(pending.current) return;
      pending.current = true;
      anchor.closest('dialog')?.close();
      const token=++generation.current;
      const playground = anchor.hasAttribute('data-playground-project') ? anchor.closest('.playground')?.querySelector<HTMLElement>('.playground-stage') : null;
      const fallback = playground ? Array.from(playground.querySelectorAll<HTMLElement>('[data-project-title]')).find(el => el.dataset.projectTitle === anchor.dataset.playgroundProject) : null;
      const card = (playground?.dataset.ready === 'true' ? playground : fallback) || anchor.closest<HTMLElement>('.project,.index-project,[data-project-zoom]');
      const navigate = () => router.push(url.pathname+url.search);
      router.prefetch(url.pathname);
      const release = () => {
        pending.current=false; generation.current++;
        gsap.to(stage,{autoAlpha:0,duration:.3,onComplete:()=>stage?.replaceChildren()});
        gsap.to(curtain,{yPercent:-100,duration:.3});
      };
      timer.current=setTimeout(release,5000);
      if(card && url.pathname.startsWith('/work/') && stage) {
        mode.current='project';
        const rect=card.getBoundingClientRect();
        const computed=getComputedStyle(card);
        const poster=card.querySelector<HTMLImageElement>('img.artwork');
        const image = poster?.cloneNode(true) as HTMLImageElement | undefined;
        stage.replaceChildren();
        stage.style.background=computed.background;
        if(image) { image.removeAttribute('class'); image.removeAttribute('loading'); image.alt=''; image.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:contain;'; stage.append(image); }
        // A bounded, one-frame capture preserves the actual live project world.
        if(card.dataset.ready==='true') {
          await new Promise<void>(resolve=>{
            let complete=false;
            const timeout=setTimeout(()=>{complete=true;resolve();},140);
            window.dispatchEvent(new CustomEvent('project-frame',{detail:(source:HTMLCanvasElement)=>{
              if(complete || disposed || token!==generation.current) return;
              complete=true;clearTimeout(timeout);
              try {
                const canvas=document.createElement('canvas');
                const ratio=Math.min(source.width/innerWidth,1.5);
                canvas.width=Math.ceil(rect.width*ratio);canvas.height=Math.ceil(rect.height*ratio);
                const context=canvas.getContext('2d');
                if(context) {
                  context.drawImage(source,0,0,source.width,source.height,-rect.left*ratio,-rect.top*ratio,innerWidth*ratio,innerHeight*ratio);
                  canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
                  image?.remove();stage.append(canvas);
                }
              } catch { /* The local poster remains available if GPU copying fails. */ }
              resolve();
            }}));
          });
        }
        if(disposed || token!==generation.current) return;
        const title=document.createElement('span');
        title.className='project-zoom-title';
        title.textContent=anchor.dataset.playgroundProject || card.dataset.projectTitle || card.querySelector('h2,h3')?.textContent?.replace('case study','').replace('↗','').trim() || 'Inside the work.';
        // Kinetic headings duplicate visible letters; their accessible text is canonical.
        const accessible=card.querySelector('h3 .sr-only');
        if(accessible) title.textContent=accessible.textContent;
        stage.append(title);
        gsap.set(stage,{left:rect.left,top:rect.top,width:rect.width,height:rect.height,borderRadius:computed.borderRadius,scale:1,autoAlpha:1});
        gsap.to(stage,{left:0,top:0,width:innerWidth,height:innerHeight,borderRadius:0,duration:.72,ease:'power3.inOut',onComplete:navigate});
      } else {
        mode.current='curtain';
        const label=curtain?.querySelector('span');
        if(label) label.textContent=url.pathname==='/work' ? 'Selected work.' : 'Back to the core.';
        gsap.fromTo(curtain,{yPercent:100},{yPercent:0,duration:.4,ease:'power3.inOut',onComplete:navigate});
      }
    };
    document.addEventListener('click',click,true);
    return()=>{
      disposed=true;
      document.removeEventListener('click',click,true);
      if(timer.current)clearTimeout(timer.current);
      gsap.killTweensOf(curtain);gsap.killTweensOf(stage);
      stage?.replaceChildren();
    };
  },[router,reduced]);
  return <>
    <div ref={panel} className="route-curtain" aria-hidden="true"><span>Inside the work.</span></div>
    <div ref={zoom} className="project-zoom" aria-hidden="true" />
  </>;
}


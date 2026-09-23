"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { gsap } from "gsap";
import { lockScroll, unlockScroll } from "@/lib/scroll";
import { projectZoom } from "@/lib/zoom";

/** Grab the canvas's next frame (bounded), or null if it never comes. */
function captureFrame(isCurrent: () => boolean) {
  return new Promise<HTMLCanvasElement | null>((resolve) => {
    let complete = false;
    const timeout = setTimeout(() => { complete = true; resolve(null); }, 160);
    window.dispatchEvent(new CustomEvent('project-frame', { detail: (source: HTMLCanvasElement) => {
      if (complete || !isCurrent()) return;
      complete = true; clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = source.width; canvas.height = source.height;
        canvas.getContext('2d')?.drawImage(source, 0, 0);
        canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
        resolve(canvas);
      } catch { resolve(null); }
    } }));
  });
}

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
      // Hold the page still under the curtain; SmoothScroll releases on arrival.
      lockScroll('route');
      anchor.closest('dialog')?.close();
      const token=++generation.current;
      const playground = anchor.hasAttribute('data-playground-project') ? anchor.closest('.playground')?.querySelector<HTMLElement>('.playground-stage') : null;
      const fallback = playground ? Array.from(playground.querySelectorAll<HTMLElement>('[data-project-title]')).find(el => el.dataset.projectTitle === anchor.dataset.playgroundProject) : null;
      const card = (playground?.dataset.ready === 'true' ? playground : fallback) || anchor.closest<HTMLElement>('.project,.index-project,[data-project-zoom]');
      const navigate = () => router.push(url.pathname+url.search);
      router.prefetch(url.pathname);
      let undoZoom = () => {};
      const release = () => {
        pending.current=false; generation.current++;
        undoZoom();
        unlockScroll('route');
        gsap.to(stage,{autoAlpha:0,duration:.3,onComplete:()=>stage?.replaceChildren()});
        gsap.to(curtain,{yPercent:-100,duration:.3});
      };
      timer.current=setTimeout(release,6500);
      if(card && url.pathname.startsWith('/work/') && stage) {
        mode.current='project';
        const isCurrent = () => !disposed && token===generation.current;
        // Like lusion.co: the page itself zooms around the chosen card until
        // it overfills the screen, neighbours sweeping out of frame, while the
        // card's own world pushes in. Then the frame freezes and the route
        // changes underneath it.
        const layer = card.closest<HTMLElement>('.selected,.work-list,section') || card.parentElement;
        const rect = card.getBoundingClientRect();
        const background = card.dataset.sheetBg || getComputedStyle(card).background;
        const copy = Array.from(card.children).filter(child => !child.matches('.project-art,.index-art,.project-hit-area,.artwork') && !child.querySelector('img.artwork'));
        const fill = Math.max(innerWidth/rect.width, innerHeight/rect.height) * 1.2;
        const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
        undoZoom = () => {
          projectZoom.element = null; projectZoom.amount = 0;
          if(layer) gsap.set(layer, {clearProps:'transform,transformOrigin,willChange'});
          gsap.set(copy, {clearProps:'opacity,visibility'});
          window.dispatchEvent(new Event('scene-measure'));
        };
        gsap.to(copy, {autoAlpha:0, duration:.35, ease:'power2.in'});
        if(layer) {
          const origin = layer.getBoundingClientRect();
          gsap.set(layer, {transformOrigin:`${cx-origin.left}px ${cy-origin.top}px`, willChange:'transform'});
          projectZoom.element = card;
          const zoomTween = {u:0};
          await new Promise<void>(resolve => gsap.to(zoomTween, {u:1, duration:1.15, ease:'power2.inOut', onComplete:resolve, onUpdate:() => {
            if(!isCurrent()) return;
            const u = zoomTween.u;
            gsap.set(layer, {x:(innerWidth/2-cx)*u, y:(innerHeight/2-cy)*u, scale:1+(fill-1)*u});
            projectZoom.amount = u;
            window.dispatchEvent(new Event('scene-measure'));
          }}));
        }
        if(!isCurrent()) return;
        // Freeze what is on screen so the route can change beneath it.
        stage.replaceChildren();
        stage.style.background = background;
        const frame = card.dataset.ready==='true' ? await captureFrame(isCurrent) : null;
        if(!isCurrent()) return;
        if(frame) stage.append(frame);
        else {
          const poster = card.querySelector<HTMLImageElement>('img.artwork')?.cloneNode(true) as HTMLImageElement | undefined;
          if(poster) { poster.removeAttribute('class'); poster.removeAttribute('loading'); poster.alt=''; poster.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;'; stage.append(poster); }
        }
        gsap.set(stage, {left:0, top:0, width:innerWidth, height:innerHeight, borderRadius:0, scale:1, autoAlpha:1});
        projectZoom.element = null; projectZoom.amount = 0;
        navigate();
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


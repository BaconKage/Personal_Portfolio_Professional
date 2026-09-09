/* eslint-disable react-hooks/immutability -- Three.js buffers and instance matrices are mutable GPU state. */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneProps } from "./types";

/** A living neural field: somata, branching dendrites and travelling synaptic signals. */
export default function HeroWorld({ quality }: SceneProps) {
  const nodes = useRef<THREE.InstancedMesh>(null);
  const halos = useRef<THREE.InstancedMesh>(null);
  const ripple = useRef<THREE.Mesh>(null);
  const pending = useRef(false);
  const wave = useRef({ started: -10, origin: new THREE.Vector3(), next: .5, serial: 0 });
  const sparks = useRef<THREE.InstancedMesh>(null);
  const cursor = useRef({ x: 0, y: 0, active: false, aspect: 2.5 });
  const elapsed = useRef(0);
  const network = useMemo(() => {
    const count = quality < 0.75 ? 38 : 68;
    const seed = (i: number) => { const n = Math.sin(i * 127.1 + 12) * 43758.5453; return n - Math.floor(n); };
    const cells = Array.from({ length: count }, (_, i) => {
      const home = new THREE.Vector3((seed(i + 1) - .5) * 2, (seed(i + 80) - .5) * 5.8, (seed(i + 160) - .5) * 2.5);
      return { home, position: new THREE.Vector3(), activation: 0 };
    });
    const edges: [number, number][] = [];
    cells.forEach((cell, i) => {
      cells.map((other, j) => ({ j, d: Math.hypot((cell.home.x - other.home.x) * 7, cell.home.y - other.home.y) }))
        .filter(v => v.j !== i).sort((a,b) => a.d-b.d).slice(0,4).forEach(({j}) => { if (j > i) edges.push([i,j]); });
    });
    const positions = new Float32Array(edges.length * 8 * 6);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    const colors = new Float32Array(positions.length);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
    const arrivals = new Float32Array(count).fill(-100);
    const adjacency = cells.map(() => [] as number[]);
    edges.forEach(([a,b]) => { adjacency[a].push(b); adjacency[b].push(a); });
    return { cells, edges, positions, colors, geometry, arrivals, adjacency };
  }, [quality]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const activeColor = useMemo(() => new THREE.Color("#d7f5ff"), []);
  useEffect(() => {
    const element = document.querySelector('.hero-art');
    const move = (event: PointerEvent) => {
      if (!element || event.pointerType !== 'mouse') return;
      const r = element.getBoundingClientRect();
      cursor.current = { x: ((event.clientX-r.left)/r.width-.5)*2, y: -((event.clientY-r.top)/r.height-.5)*2, active: event.clientX>=r.left && event.clientX<=r.right && event.clientY>=r.top && event.clientY<=r.bottom, aspect:r.width/r.height };
    };
    const signal = () => { pending.current = true; };
    const click = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('.hero-art') || event.target.closest('button')) return;
      const r = element!.getBoundingClientRect();
      cursor.current.x = ((event.clientX-r.left)/r.width-.5)*2;
      cursor.current.y = -((event.clientY-r.top)/r.height-.5)*2;
      pending.current = true;
    };
    window.addEventListener('neural-signal', signal);
    window.addEventListener('pointerdown', click);
    const leave = () => { cursor.current.active = false; };
    window.addEventListener('pointermove', move, {passive:true});
    document.addEventListener('pointerleave', leave);
    return () => { window.removeEventListener('neural-signal', signal); window.removeEventListener('pointerdown', click); window.removeEventListener('pointermove',move); document.removeEventListener('pointerleave',leave); network.geometry.dispose(); };
  }, [network]);
  useFrame((_, delta) => {
    if (!nodes.current || !sparks.current) return;
    elapsed.current += Math.min(delta,.035);
    const time = elapsed.current;
    // Camera projection is updated by the shared scissor renderer.
    const r = document.querySelector('.hero-art')?.getBoundingClientRect();
    const halfWidth = 2.99 * (r ? r.width/r.height : cursor.current.aspect);
    const mx = cursor.current.x * halfWidth, my = cursor.current.y * 2.99;
    if (pending.current || time > wave.current.next) {
      let source = wave.current.serial++ * 17 % network.cells.length;
      if (pending.current || cursor.current.active) {
        let nearest = Infinity;
        network.cells.forEach((cell,i) => { const d = Math.hypot(cell.position.x-mx,cell.position.y-my); if(d<nearest) {nearest=d;source=i;} });
      }
      network.arrivals.fill(Infinity);
      network.arrivals[source] = time;
      const visited = new Set<number>();
      for (let k=0;k<network.cells.length;k++) {
        let current=-1, earliest=Infinity;
        network.arrivals.forEach((t,i)=>{if(!visited.has(i)&&t<earliest){earliest=t;current=i;}});
        if(current<0) break;
        visited.add(current);
        network.adjacency[current].forEach(next=>{
          const delay=.14+network.cells[current].position.distanceTo(network.cells[next].position)*.12;
          network.arrivals[next]=Math.min(network.arrivals[next],earliest+delay);
        });
      }
      wave.current.started=time;
      wave.current.origin.copy(network.cells[source].position);
      wave.current.next=time+4.5;
      pending.current=false;
    }
    const waveAge=time-wave.current.started;
    if(ripple.current) {
      ripple.current.position.copy(wave.current.origin);
      ripple.current.scale.setScalar(.2+waveAge*1.4);
      (ripple.current.material as THREE.MeshBasicMaterial).opacity=Math.max(0, .24*(1-waveAge/1.4));
      ripple.current.visible=waveAge<1.4;
    }
    network.cells.forEach((cell,i) => {
      const x = cell.home.x * halfWidth * .95 + Math.sin(time*.28+i)*.13;
      const y = cell.home.y + Math.cos(time*.35+i)*.13;
      const distance = Math.hypot(x-mx,y-my);
      const influence = cursor.current.active ? Math.max(0,1-distance/2.2) : 0;
      const age=time-network.arrivals[i];
      const firing=age>=0 ? Math.exp(-age*2.1) : 0;
      cell.activation += (Math.max(influence*.8,firing)-cell.activation)*.14;
      cell.position.set(x+(mx-x)*influence*.18,y+(my-y)*influence*.18,cell.home.z + Math.sin(time*.4+i)*.18);
      dummy.position.copy(cell.position);
      dummy.scale.setScalar(.045 + (i%5)*.009 + cell.activation*.055);
      dummy.updateMatrix(); nodes.current!.setMatrixAt(i,dummy.matrix);
      color.set('#7396e8').lerp(activeColor,cell.activation);
      nodes.current!.setColorAt(i,color);
      if(halos.current) {
        dummy.scale.setScalar(.14+cell.activation*.28);
        dummy.updateMatrix();halos.current.setMatrixAt(i,dummy.matrix);
        halos.current.setColorAt(i,color);
      }
    });
    network.edges.forEach(([a,b],i) => {
      const start = network.cells[a].position, end = network.cells[b].position;
      const bend = .15 + Math.sin(i*4.3)*.13;
      for(let step=0;step<8;step++) {
        for(let endPoint=0;endPoint<2;endPoint++) {
          const t=(step+endPoint)/8, offset=(i*8+step)*6+endPoint*3;
          network.positions[offset]=THREE.MathUtils.lerp(start.x,end.x,t)+Math.sin(t*Math.PI)*bend;
          network.positions[offset+1]=THREE.MathUtils.lerp(start.y,end.y,t)+Math.sin(t*Math.PI*2)*bend;
          network.positions[offset+2]=THREE.MathUtils.lerp(start.z,end.z,t);
          const energy=Math.max(network.cells[a].activation,network.cells[b].activation);
          network.colors[offset]=.12+energy*.45;
          network.colors[offset+1]=.24+energy*.55;
          network.colors[offset+2]=.5+energy*.5;
        }
      }
      const fireAt=Math.min(network.arrivals[a],network.arrivals[b]);
      const travel=Math.max(.2,Math.abs(network.arrivals[a]-network.arrivals[b]));
      const pulse=(time-fireAt)/travel;
      const travelling=pulse>=0&&pulse<=1;
      const phase=travelling ? pulse : (time*.12+i*.137)%1;
      const t=network.arrivals[a]<=network.arrivals[b] ? phase : 1-phase;
      dummy.position.lerpVectors(start,end,t);
      dummy.position.x+=Math.sin(t*Math.PI)*bend;
      dummy.position.y+=Math.sin(t*Math.PI*2)*bend;
      dummy.scale.setScalar(travelling ? .055 : .014);
      dummy.updateMatrix(); sparks.current!.setMatrixAt(i,dummy.matrix);
    });
    network.geometry.attributes.position.needsUpdate=true;
    network.geometry.attributes.color.needsUpdate=true;
    if(halos.current){halos.current.instanceMatrix.needsUpdate=true;if(halos.current.instanceColor)halos.current.instanceColor.needsUpdate=true;}
    nodes.current.instanceMatrix.needsUpdate=true;
    if(nodes.current.instanceColor) nodes.current.instanceColor.needsUpdate=true;
    sparks.current.instanceMatrix.needsUpdate=true;
  });
  return <group>
    <mesh ref={ripple}><ringGeometry args={[.96,1,64]}/><meshBasicMaterial color="#77baff" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide}/></mesh>
    <instancedMesh ref={halos} args={[undefined,undefined,network.cells.length]} frustumCulled={false}>
      <sphereGeometry args={[1,12,8]}/><meshBasicMaterial transparent opacity={.07} blending={THREE.AdditiveBlending} depthWrite={false}/>
    </instancedMesh>
    <lineSegments geometry={network.geometry} frustumCulled={false}><lineBasicMaterial vertexColors transparent opacity={.75} depthWrite={false}/></lineSegments>
    <instancedMesh ref={nodes} args={[undefined,undefined,network.cells.length]} frustumCulled={false}>
      <sphereGeometry args={[1,16,12]}/><meshStandardMaterial emissive="#426fe9" emissiveIntensity={1.1} roughness={.3} metalness={.2}/>
    </instancedMesh>
    <instancedMesh ref={sparks} args={[undefined,undefined,network.edges.length]} frustumCulled={false}>
      <sphereGeometry args={[1,8,6]}/><meshBasicMaterial color="#b9e5ff"/>
    </instancedMesh>
  </group>;
}



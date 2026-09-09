/* eslint-disable react-hooks/immutability -- Three.js buffers and instance matrices are mutable GPU state. */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneProps } from "./types";

/** A living neural field: somata, branching dendrites and travelling synaptic signals. */
export default function HeroWorld({ quality }: SceneProps) {
  const nodes = useRef<THREE.InstancedMesh>(null);
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
        .filter(v => v.j !== i).sort((a,b) => a.d-b.d).slice(0,3).forEach(({j}) => { if (j > i) edges.push([i,j]); });
    });
    const positions = new Float32Array(edges.length * 8 * 6);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    return { cells, edges, positions, geometry };
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
    const leave = () => { cursor.current.active = false; };
    window.addEventListener('pointermove', move, {passive:true});
    document.addEventListener('pointerleave', leave);
    return () => { window.removeEventListener('pointermove',move); document.removeEventListener('pointerleave',leave); network.geometry.dispose(); };
  }, [network]);
  useFrame((_, delta) => {
    if (!nodes.current || !sparks.current) return;
    elapsed.current += Math.min(delta,.035);
    const time = elapsed.current;
    // Camera projection is updated by the shared scissor renderer.
    const r = document.querySelector('.hero-art')?.getBoundingClientRect();
    const halfWidth = 2.99 * (r ? r.width/r.height : cursor.current.aspect);
    const mx = cursor.current.x * halfWidth, my = cursor.current.y * 2.99;
    network.cells.forEach((cell,i) => {
      const x = cell.home.x * halfWidth * .95 + Math.sin(time*.28+i)*.13;
      const y = cell.home.y + Math.cos(time*.35+i)*.13;
      const distance = Math.hypot(x-mx,y-my);
      const influence = cursor.current.active ? Math.max(0,1-distance/2.2) : 0;
      cell.activation += (influence-cell.activation)*.09;
      cell.position.set(x+(mx-x)*influence*.18,y+(my-y)*influence*.18,cell.home.z + Math.sin(time*.4+i)*.18);
      dummy.position.copy(cell.position);
      dummy.scale.setScalar(.045 + (i%5)*.009 + cell.activation*.055);
      dummy.updateMatrix(); nodes.current!.setMatrixAt(i,dummy.matrix);
      color.set('#7396e8').lerp(activeColor,cell.activation);
      nodes.current!.setColorAt(i,color);
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
        }
      }
      const t=(time*(.14+network.cells[a].activation*.22)+i*.137)%1;
      dummy.position.lerpVectors(start,end,t);
      dummy.position.x+=Math.sin(t*Math.PI)*bend;
      dummy.position.y+=Math.sin(t*Math.PI*2)*bend;
      dummy.scale.setScalar(.018 + network.cells[a].activation*.018);
      dummy.updateMatrix(); sparks.current!.setMatrixAt(i,dummy.matrix);
    });
    network.geometry.attributes.position.needsUpdate=true;
    nodes.current.instanceMatrix.needsUpdate=true;
    if(nodes.current.instanceColor) nodes.current.instanceColor.needsUpdate=true;
    sparks.current.instanceMatrix.needsUpdate=true;
  });
  return <group>
    <lineSegments geometry={network.geometry} frustumCulled={false}><lineBasicMaterial color="#678bcf" transparent opacity={.38} depthWrite={false}/></lineSegments>
    <instancedMesh ref={nodes} args={[undefined,undefined,network.cells.length]} frustumCulled={false}>
      <sphereGeometry args={[1,16,12]}/><meshStandardMaterial emissive="#426fe9" emissiveIntensity={1.1} roughness={.3} metalness={.2}/>
    </instancedMesh>
    <instancedMesh ref={sparks} args={[undefined,undefined,network.edges.length]} frustumCulled={false}>
      <sphereGeometry args={[1,8,6]}/><meshBasicMaterial color="#b9e5ff"/>
    </instancedMesh>
  </group>;
}


/* eslint-disable react-hooks/immutability -- Three.js buffers are mutable GPU state. */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneProps } from './types';

export default function PortalWorld({ pointer, quality, step }: SceneProps) {
  const time = useRef(0);
  const blend = useRef(0);
  const group = useRef<THREE.Group>(null);
  const section = useRef<HTMLElement | null>(null);
  const geometry = useMemo(() => {
    const count = quality < .75 ? 1400 : 3200;
    const result = new THREE.BufferGeometry();
    result.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3).setUsage(THREE.DynamicDrawUsage));
    const colors = new Float32Array(count*3);
    const color = new THREE.Color();
    for(let i=0;i<count;i++) { color.set(i%9===0 ? '#e2f6ff' : i%3===0 ? '#749fff' : '#294bfa');color.toArray(colors,i*3); }
    result.setAttribute('color',new THREE.BufferAttribute(colors,3));
    return result;
  },[quality]);
  const ribbons = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(16*80*6),3).setUsage(THREE.DynamicDrawUsage));
    return g;
  },[]);
  useEffect(()=>()=>ribbons.dispose(),[ribbons]);
  useEffect(()=>{section.current=document.querySelector('.signal-journey');return()=>geometry.dispose();},[geometry]);
  useFrame((_,delta)=>{
    const dt=Math.min(delta,.04);
    time.current+=dt;
    blend.current=THREE.MathUtils.damp(blend.current,step.current===1 ? 1 : 0,2.6,dt);
    const r=section.current?.getBoundingClientRect();
    const scroll=r ? THREE.MathUtils.clamp(-r.top/Math.max(1,r.height-innerHeight),0,1) : 0;
    const attribute=geometry.attributes.position as THREE.BufferAttribute;
    const count=attribute.count;
    for(let i=0;i<count;i++) {
      const strand=i%13;
      const u=i/count;
      const depth=((u*54+scroll*36+time.current*.65)%54);
      const angle=u*Math.PI*44+strand*2.399+time.current*.055;
      const radius=3.8+Math.sin(u*19+strand)*.55;
      const x=Math.cos(angle)*radius+Math.sin(depth*.14+time.current*.12)*.65;
      const y=Math.sin(angle)*radius+Math.cos(depth*.13)*.5;
      const z=7-depth;
      const phi=Math.acos(1-2*(i+.5)/count),theta=i*2.399963+time.current*.12;
      const orb=2.7+Math.sin(theta*3+time.current)*.13;
      attribute.setXYZ(i,
        THREE.MathUtils.lerp(x,Math.sin(phi)*Math.cos(theta)*orb+(r && r.width>767 ? 1.6 : 0),blend.current),
        THREE.MathUtils.lerp(y,Math.cos(phi)*orb,blend.current),
        THREE.MathUtils.lerp(z,Math.sin(phi)*Math.sin(theta)*orb,blend.current));
    }
    const lines=ribbons.attributes.position as THREE.BufferAttribute;
    for(let lane=0;lane<16;lane++) for(let segment=0;segment<80;segment++) for(let end=0;end<2;end++) {
      const u=(segment+end)/80,depth=u*52;
      const angle=lane/16*Math.PI*2+depth*.13+time.current*.11+scroll*2;
      const radius=3.6+Math.sin(depth*.2+time.current*.2)*.4;
      const latitude=lane/15*Math.PI;
      const orbitAngle=u*Math.PI*2+time.current*.12;
      lines.setXYZ((lane*80+segment)*2+end,
        THREE.MathUtils.lerp(Math.cos(angle)*radius,Math.sin(latitude)*Math.cos(orbitAngle)*2.8+(r && r.width>767 ? 1.6 : 0),blend.current),
        THREE.MathUtils.lerp(Math.sin(angle)*radius,Math.cos(latitude)*2.8,blend.current),
        THREE.MathUtils.lerp(7-depth,Math.sin(latitude)*Math.sin(orbitAngle)*2.8,blend.current));
    }
    lines.needsUpdate=true;
    attribute.needsUpdate=true;
    if(group.current) {
      group.current.rotation.y=THREE.MathUtils.damp(group.current.rotation.y,pointer.x*.16,3,dt);
      group.current.rotation.x=THREE.MathUtils.damp(group.current.rotation.x,-pointer.y*.12,3,dt);
    }
  });
  return <group ref={group}><lineSegments geometry={ribbons} frustumCulled={false}><lineBasicMaterial color="#638dff" transparent opacity={.5} blending={THREE.AdditiveBlending} depthWrite={false}/></lineSegments>
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial size={.075} vertexColors transparent opacity={.88} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending}/>
    </points>
  </group>;
}


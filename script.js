import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $=s=>document.querySelector(s), game=$('#game');
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x171116); scene.fog=new THREE.Fog(0x171116,22,48);
const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.1,100); camera.position.set(8,7,14); camera.lookAt(0,2.1,0);
const renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,1.7)); renderer.setSize(innerWidth,innerHeight); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.outputColorSpace=THREE.SRGBColorSpace; game.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xbcaeb8,0x30201d,1.45));
const keyLight=new THREE.DirectionalLight(0xffd6a1,2.2); keyLight.position.set(-7,13,8); keyLight.castShadow=true; keyLight.shadow.mapSize.set(1536,1536); keyLight.shadow.camera.left=-12;keyLight.shadow.camera.right=12;keyLight.shadow.camera.top=12;keyLight.shadow.camera.bottom=-12;scene.add(keyLight);
const warm=new THREE.PointLight(0xe18b58,26,20); warm.position.set(-4,5,4); scene.add(warm);
const loader=new GLTFLoader();
const paths={cow:'models/Vaca_Protagonista.glb',bunny:'models/Conejo_Complice.glb',bear:'models/Oso.glb',bedroom:'models/Habitacion.glb',kitchen:'models/Cocina.glb',living:'models/Sala.glb'};
const levelNames=['PISO 3 · HABITACIÓN','PISO 2 · COCINA','PISO 1 · SALA'];
const root=new THREE.Group();scene.add(root); const cow=new THREE.Group(),bunny=new THREE.Group(),bear=new THREE.Group();scene.add(cow,bunny,bear);
let models={},stage=0,active=false,paused=false,dead=false,won=false,levelGroup=null,colliders=[],targets=[],nearest=null,clock=new THREE.Clock(),elapsed=0,toastTimer=0,footTimer=0,warningTimer=0;
let inventory=[false,false,false],bedInspected=false,chairPlaced=false,cupOpened=false,finalStep=0,doorOpen=false;
const held={}; const playerSpeed=3.15; let bearAlert=false;
function say(msg,ms=2300){$('#toast').textContent=msg;$('#toast').classList.add('show');toastTimer=ms;}
let audio=null,master=null,ambient=null;
function initAudio(){if(audio)return;audio=new (window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.gain.value=.14;master.connect(audio.destination);}
function tone(type){try{initAudio();audio.resume();const data={step:[95,.07,'triangle'],pickup:[720,.23,'sine'],tap:[260,.12,'triangle'],danger:[105,.38,'sawtooth'],unlock:[420,.7,'sawtooth'],success:[880,.65,'sine'],fail:[145,.25,'triangle']};let [hz,dur,wave]=data[type]||data.tap;let o=audio.createOscillator(),g=audio.createGain();o.type=wave;o.frequency.setValueAtTime(hz,audio.currentTime);if(type==='pickup'||type==='success')o.frequency.exponentialRampToValueAtTime(hz*1.7,audio.currentTime+dur);g.gain.setValueAtTime(.0001,audio.currentTime);g.gain.exponentialRampToValueAtTime(.22,audio.currentTime+.025);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+dur);o.connect(g);g.connect(master);o.start();o.stop(audio.currentTime+dur+.03);}catch(e){}}
function startAmbience(){if(ambient)return;initAudio();let o=audio.createOscillator(),g=audio.createGain(),filter=audio.createBiquadFilter();o.type='sawtooth';o.frequency.value=43;filter.type='lowpass';filter.frequency.value=100;g.gain.value=.018;o.connect(filter);filter.connect(g);g.connect(master);o.start();ambient=o;}
function mat(color,rough=.78,metal=0){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});}
function cube(parent,name,w,h,d,color,x,y,z,opts={}){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color,opts.rough??.8,opts.metal??0));m.name=name;m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);if(opts.solid!==false)colliders.push({x:x-w/2,z:z-d/2,w,d});return m;}
function addRoomShell(group,kind){
 const wood=kind===0?0x493027:kind===1?0x514033:0x44302b,wall=kind===0?0x382a2c:kind===1?0x4b3b32:0x33282b;
 // floor and enclosing walls create a readable room rather than a flat overhead model
 const floor=new THREE.Mesh(new THREE.BoxGeometry(13,.32,10),mat(kind===1?0x65503b:0x49352d));floor.position.set(0,-.18,0);floor.receiveShadow=true;group.add(floor);
 cube(group,'back wall',13,5,.35,wall,0,2.35,-4.85,{solid:false});
 cube(group,'left wall',.35,5,9.7,wood,-6.35,2.35,0,{solid:false});
 // right wall is deliberately partial so the player can read the room
 cube(group,'right wall',.35,3.2,5,wood,6.35,1.55,-2.35,{solid:false});
 // skirting, ceiling beams and framed wall panels
 for(let x=-5.7;x<=5.7;x+=2.85){cube(group,'wall panel',.055,3.7,.06,0x76513c,x,2.35,-4.62,{solid:false});}
 for(let x=-5.9;x<=5.9;x+=2.95)cube(group,'ceiling beam',.18,.22,9.3,0x261d1c,x,4.82,0,{solid:false});
 cube(group,'baseboard',12.6,.22,.16,0x241a1a,0,.12,-4.57,{solid:false});
 // windows / lighting accents
 if(kind===0){cube(group,'window frame',2.2,1.65,.14,0x17191f,-3.9,3.15,-4.55,{solid:false});cube(group,'moonlit window',1.95,1.4,.04,0x536174,-3.9,3.15,-4.45,{solid:false});}
 else if(kind===1){cube(group,'kitchen tile backsplash',5.2,1.25,.08,0x8b7863,0,2.8,-4.57,{solid:false});for(let x=-2.3;x<2.5;x+=.65)cube(group,'tile grout',.025,1.2,.025,0x4a4038,x,2.8,-4.5,{solid:false});}
 else{cube(group,'picture frame',1.8,1.3,.13,0x9a7045,0,3.15,-4.56,{solid:false});cube(group,'dark painting',1.55,1.05,.04,0x28303a,0,3.15,-4.46,{solid:false});}
 // perimeter bounds are colliders for walking
 colliders.push({x:-6.5,z:-4.9,w:13,d:.5},{x:-6.5,z:4.75,w:13,d:.5},{x:-6.5,z:-4.9,w:.5,d:10},{x:6,z:-4.9,w:.5,d:10});
}
function furniture(kind){
 if(kind===0){ // bedroom: bed, bedside table, wardrobe, toy horse
  cube(root,'bed frame',3.3,.58,2.15,0x694633,-2.5,.27,-1.45);cube(root,'mattress',3.05,.22,1.95,0xb9a99a,-2.5,.66,-1.45);cube(root,'pillow',.82,.2,.75,0xd9c9b7,-3.4,.82,-1.95,{solid:false});cube(root,'headboard',3.3,1.25,.2,0x4a3027,-2.5,1.03,-2.55);
  cube(root,'nightstand',1.1,1.05,.9,0x5c3b2b,-4.55,.5,.35);cube(root,'wardrobe',1.65,3.1,1.25,0x392722,4.75,1.55,-3.25);cube(root,'wardrobe door',.72,2.75,.08,0x76513b,4.35,1.55,-2.6);cube(root,'rocking horse body',1.0,.55,.35,0x8b5737,2.2,.55,2.25);cube(root,'rocking horse head',.4,.65,.4,0x9a6640,2.7,.9,2.25);
  colliders.push({x:-4.15,z:-2.52,w:3.5,d:2.35},{x:4,z:-3.9,w:2.1,d:1.7},{x:-5.1,z:-.1,w:1.4,d:1.2});
 }else if(kind===1){
  cube(root,'counter',4.5,1.1,1.0,0x67442f,-3.45,.55,-3.25);cube(root,'counter top',4.65,.16,1.1,0xb99b72,-3.45,1.15,-3.25);cube(root,'fridge',1.45,3.55,1.35,0x9b9c9a,4.65,1.78,-3.2,{metal:.35});cube(root,'fridge door',1.32,3.35,.08,0xbfc3c2,4.65,1.8,-2.48,{metal:.25});cube(root,'island',2.4,1.05,1.4,0x76503a,0,.52,.2);cube(root,'island top',2.5,.13,1.48,0xc6a47b,0,1.1,.2);cube(root,'stove',1.1,.13,.9,0x292b2c,-4.2,1.27,-3.2,{metal:.4,solid:false});
  // chair with visible back and legs, initially away from fridge
  chair=new THREE.Group();chair.position.set(2.25,0,.15);root.add(chair);cube(chair,'chair seat',.9,.15,.85,0x8a5738,0,.85,0,{solid:false});cube(chair,'chair back',.9,1.0,.14,0x8a5738,0,1.35,-.35,{solid:false});for(let x of [-.34,.34])for(let z of [-.3,.3])cube(chair,'chair leg',.11,.82,.11,0x70452f,x,.41,z,{solid:false});colliders.push({x:1.8,z:-.25,w:1,d:1});
 }else{
  cube(root,'sofa base',3.1,.7,1.25,0x59403b,-3.65,.38,-2.5);cube(root,'sofa back',3.1,1.45,.3,0x76514a,-3.65,1.0,-3.0);cube(root,'sofa cushion',2.8,.22,1.05,0x9a7166,-3.65,.78,-2.35);cube(root,'coffee table',2.2,.2,1.2,0x65412d,0,.85,-.65);for(let x of [-.85,.85])for(let z of [-.4,.4])cube(root,'table leg',.12,.8,.12,0x493024,x,.4+0.0,z-.65,{solid:false});cube(root,'side table',1.2,.8,1.0,0x69462e,3.65,.4,-2.6);cube(root,'front door',1.65,3.4,.24,0x68402c,5.3,1.7,4.2);cube(root,'door panel',1.25,2.8,.08,0x8a5a3a,5.3,1.7,4.05,{solid:false});colliders.push({x:-5.4,z:-3.2,w:3.5,d:1.8},{x:-1.2,z:-1.2,w:2.4,d:1.4},{x:3,z:-3.1,w:1.5,d:1.4},{x:4.4,z:4.0,w:2,d:.6});
 }
}
let chair=null;
function normalizeModel(obj,targetHeight){obj.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(obj),size=b.getSize(new THREE.Vector3());obj.scale.setScalar(targetHeight/Math.max(size.y,.001));obj.updateMatrixWorld(true);const b2=new THREE.Box3().setFromObject(obj);obj.position.y-=b2.min.y;obj.position.x-=(b2.min.x+b2.max.x)/2;obj.position.z-=(b2.min.z+b2.max.z)/2;obj.updateMatrixWorld(true);obj.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;if(n.material)n.material.side=THREE.DoubleSide;}});return obj;}
async function load(path){return (await loader.loadAsync(path)).scene;}
function keyMesh(color){let g=new THREE.Group(),m=new THREE.MeshStandardMaterial({color,metalness:.7,roughness:.2,emissive:color,emissiveIntensity:.22});let ring=new THREE.Mesh(new THREE.TorusGeometry(.2,.055,10,24),m);g.add(ring);let stem=new THREE.Mesh(new THREE.BoxGeometry(.09,.5,.09),m);stem.position.y=-.28;g.add(stem);let tooth=new THREE.Mesh(new THREE.BoxGeometry(.2,.08,.09),m);tooth.position.set(.11,-.46,0);g.add(tooth);g.position.y=.85;return g;}
function register(label,pos,range,fn,enabled=()=>true){targets.push({label,pos:new THREE.Vector3(...pos),range,fn,enabled,done:false});}
function clearStage(){if(levelGroup){scene.remove(levelGroup);levelGroup=null;}while(root.children.length)root.remove(root.children[0]);colliders=[];targets=[];chair=null;}
function resetActors(){cow.position.set(-4.8,0,2.8);bunny.position.set(-5.6,0,3.2);bear.position.set(4.8,0,-3.8);cow.visible=bunny.visible=bear.visible=true;bearAlert=false;$('#danger').classList.add('hidden');}
function setupStage(){clearStage();levelGroup=new THREE.Group();scene.add(levelGroup);root.add(levelGroup);addRoomShell(levelGroup,stage);furniture(stage);const roomPath=['bedroom','kitchen','living'][stage];let env=models[roomPath].clone(true);env.scale.setScalar(stage===1?0.38:4.6);env.position.set(stage===0?-4.9:stage===1?0:4.7,0,-2.7);env.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});levelGroup.add(env);
 if(stage===0){let k=keyMesh(0xe8b65d);k.position.set(-2.6,.78,-.5);levelGroup.add(k);register('Revisar debajo de la cama',[-2.5,0,-1.3],2.2,()=>{bedInspected=true;k.visible=true;say('Algo brilla debajo de la cama… ¡acércate!');tone('tap');});register('Recoger llave dorada',[-2.5,0,-.5],1.7,()=>collect(0,k),()=>bedInspected&&!inventory[0]);}
 if(stage===1){let k=keyMesh(0x65a8e6);k.position.set(4.65,3.75,-2.5);levelGroup.add(k);register('Pedir ayuda al conejo con la silla',[2.25,0,.15],2.1,()=>{if(chairPlaced)return;chairPlaced=true;chair.position.set(3.8,0,-1.65);colliders=colliders.filter(c=>!(Math.abs(c.x-1.8)<.1&&Math.abs(c.z+.25)<.1));colliders.push({x:3.35,z:-2.1,w:1,d:1});bunny.position.set(3.1,0,-.8);say('El conejo colocó la silla junto al refrigerador. ¡Ahora sube por la llave!');tone('tap');});register('Subir a la silla y tomar la llave azul',[4.3,0,-2.0],2.1,()=>{if(!chairPlaced){say('Primero necesitas que el conejo acerque la silla.');return;}cow.position.set(4.0,0,-1.3);say('La vaca alcanza la parte superior del refrigerador…');tone('pickup');collect(1,k);},()=>chairPlaced&&!inventory[1]);}
 if(stage===2){let k=keyMesh(0x7fc68b);k.visible=false;k.position.set(3.65,1.35,-2.55);levelGroup.add(k);register('Revisar la taza sobre la mesita',[3.65,0,-2.55],2.0,()=>{cupOpened=true;k.visible=true;say('¡La llave verde estaba dentro de la taza!');tone('tap');});register('Recoger llave verde',[3.65,0,-2.2],1.8,()=>collect(2,k),()=>cupOpened&&!inventory[2]);register('Probar las llaves en la puerta',[5.0,0,3.3],2.5,finalDoor,()=>inventory.every(Boolean));}
 resetActors();$('#floorTag').textContent=levelNames[stage];$('#objective').textContent=['MISIÓN 01 · EXPLORA LA HABITACIÓN','MISIÓN 02 · CONSIGUE LA LLAVE AZUL','MISIÓN 03 · ENCUENTRA LA LLAVE VERDE'][stage];$('#hint').textContent=['Busca debajo de la cama. La llave dorada está oculta.','Pide al conejo que acerque la silla al refrigerador.','Busca la taza en la mesita. Después, ve a la puerta.'][stage];scene.background.set([0x30272c,0x302923,0x292329][stage]);scene.fog.color.copy(scene.background);}
function updateInventory(){inventory.forEach((v,i)=>{let el=$(`#key${i}`);el.classList.toggle('found',v);el.querySelector('small').textContent=v?'ENCONTRADA':'PENDIENTE';});}
function collect(i,obj){if(inventory[i])return;inventory[i]=true;obj.visible=false;updateInventory();tone('pickup');say(['LLAVE DORADA CONSEGUIDA','LLAVE AZUL CONSEGUIDA','LLAVE VERDE CONSEGUIDA'][i],2100);if(i===0)setTimeout(()=>{stage=1;setupStage();say('Has bajado a la cocina. No hagas ruido…');},1700);if(i===1)setTimeout(()=>{stage=2;setupStage();say('La sala está al final del pasillo.');},1700);if(i===2){$('#hint').textContent='Regresa a la puerta principal y prueba las llaves.';}}
function finalDoor(){if(finalStep===0){finalStep++;tone('fail');say('La llave dorada no abre la puerta.');}else if(finalStep===1){finalStep++;tone('fail');say('La llave verde tampoco funciona.');}else if(finalStep===2){finalStep++;doorOpen=true;tone('unlock');say('¡La llave azul! ¡La puerta se está abriendo!');setTimeout(()=>{cow.position.set(5.3,0,5.8);bunny.position.set(4.6,0,5.8);bear.position.set(1.7,0,2.8);tone('success');won=true;show('victory');},2300);}}
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));if(id)$('#'+id).classList.remove('hidden');}
function pauseGame(){if(!active||dead||won)return;paused=true;show('pause');}
function restartGame(){inventory=[false,false,false];bedInspected=false;chairPlaced=false;cupOpened=false;finalStep=0;stage=0;dead=won=false;updateInventory();setupStage();show(null);active=true;paused=false;}
function interact(){if(nearest){nearest.fn();return;}say('No hay nada con lo que puedas interactuar aquí.');}
function blocked(x,z,r=.42){if(x<-5.75||x>5.75||z<-4.15||z>4.2)return true;return colliders.some(c=>x+r>c.x&&x-r<c.x+c.w&&z+r>c.z&&z-r<c.z+c.d);}
function moveActor(actor,dx,dz,r){let nx=actor.position.x+dx;if(!blocked(nx,actor.position.z,r))actor.position.x=nx;let nz=actor.position.z+dz;if(!blocked(actor.position.x,nz,r))actor.position.z=nz;}
function update(dt){if(toastTimer>0){toastTimer-=dt*1000;if(toastTimer<=0)$('#toast').classList.remove('show');}if(!active||paused||dead||won)return;elapsed+=dt;
 let dx=(held.ArrowRight?1:0)-(held.ArrowLeft?1:0),dz=(held.ArrowDown?1:0)-(held.ArrowUp?1:0);let len=Math.hypot(dx,dz)||1;dx=dx/len*playerSpeed*dt;dz=dz/len*playerSpeed*dt;if(dx||dz){moveActor(cow,dx,dz,.42);cow.rotation.y=Math.atan2(dx,dz);footTimer-=dt;if(footTimer<=0){tone('step');footTimer=.38;} }
 // Bunny follows in short, collision-aware steps.
 let bx=cow.position.x-0.8-bunny.position.x,bz=cow.position.z+.35-bunny.position.z,bl=Math.hypot(bx,bz);if(bl>.8){moveActor(bunny,bx/bl*Math.min(2.8*dt,bl),bz/bl*Math.min(2.8*dt,bl),.3);bunny.rotation.y=Math.atan2(bx,bz);}
 // Bear waits briefly, then hunts. It chooses a clear axis first to avoid pushing through props.
 if(elapsed>8){bearAlert=true;$('#danger').classList.remove('hidden');let vx=cow.position.x-bear.position.x,vz=cow.position.z-bear.position.z,dist=Math.hypot(vx,vz);if(dist>1.1){let speed=dist<4?2.4:1.75;let sx=vx/dist*speed*dt,sz=vz/dist*speed*dt;let oldX=bear.position.x,oldZ=bear.position.z;moveActor(bear,sx,sz,.48);if(oldX===bear.position.x&&oldZ===bear.position.z){moveActor(bear,sz,sx,.48);}}else{dead=true;active=false;tone('danger');show('gameover');}}
 nearest=null;let min=Infinity;for(const t of targets){if(t.done||!t.enabled())continue;let d=cow.position.distanceTo(t.pos);if(d<t.range&&d<min){min=d;nearest=t;}}$('#interactionPrompt').classList.toggle('hidden',!nearest);if(nearest)$('#interactionPrompt').innerHTML=`${nearest.label.toUpperCase()} · PRESIONA <kbd>E</kbd>`;
 // Character breathing / idle movement
 [cow,bunny,bear].forEach((a,i)=>{const m=i===0?models.cow: i===1?models.bunny:models.bear;if(m)m.rotation.z=Math.sin(elapsed*2.2+i)*.018;});
}
function animate(){requestAnimationFrame(animate);let dt=Math.min(clock.getDelta(),.04);update(dt);renderer.render(scene,camera);}
function onKeyDown(e){if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();if(e.key==='Escape'){if(!$('#menu').classList.contains('hidden')||!$('#instructions').classList.contains('hidden'))return;if(paused){paused=false;show(null);}else pauseGame();}if(e.key.toLowerCase()==='e'&&active&&!paused)interact();held[e.key]=true;}
addEventListener('keydown',onKeyDown);addEventListener('keyup',e=>held[e.key]=false);
$('#play').onclick=async()=>{initAudio();await audio.resume();startAmbience();show(null);$('#hud').classList.remove('hidden');active=true;paused=false;say('PISO 3 · ENCUENTRA LA LLAVE DORADA');};$('#instructionsBtn').onclick=()=>show('instructions');$('#backMenu').onclick=()=>show('menu');$('#resume').onclick=()=>{paused=false;show(null);};$('#restart').onclick=restartGame;$('#toMenu').onclick=()=>{active=false;paused=false;show('menu');$('#hud').classList.add('hidden');};$('#retry').onclick=()=>{dead=false;active=true;paused=false;elapsed=0;resetActors();show(null);};$('#overMenu').onclick=()=>{dead=false;active=false;$('#hud').classList.add('hidden');show('menu');};$('#again').onclick=restartGame;
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
async function init(){try{const [cowM,bunnyM,bearM,bed,kitchen,living]=await Promise.all([load(paths.cow),load(paths.bunny),load(paths.bear),load(paths.bedroom),load(paths.kitchen),load(paths.living)]);models={cow:normalizeModel(cowM,1.9),bunny:normalizeModel(bunnyM,1.45),bear:normalizeModel(bearM,2.15),bedroom:bed,kitchen,living};cow.add(models.cow);bunny.add(models.bunny);bear.add(models.bear);setupStage();animate();}catch(err){console.error(err);$('#objective').textContent='ERROR AL CARGAR LOS MODELOS';$('#hint').textContent='Comprueba que la carpeta models esté junto a index.html y abre mediante GitHub Pages o Live Server.';animate();}}
init();

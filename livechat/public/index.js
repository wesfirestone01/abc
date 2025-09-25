import * as THREE from "three";
import { CSS3DRenderer, CSS3DObject } 
  from "https://cdn.jsdelivr.net/npm/three@0.164/examples/jsm/renderers/CSS3DRenderer.js";


const w = window.innerWidth; 
const h = window.innerHeight; 
const renderer = new THREE.WebGLRenderer({antialias: true}); 

renderer.setSize(w,h);

//using the dom (HTML) as the render body :) 
document.body.appendChild(renderer.domElement);

const cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(w, h);
    cssRenderer.domElement.style.position = "absolute";
    cssRenderer.domElement.style.top = "0";
    document.body.appendChild(cssRenderer.domElement);
//setting up camera

const fov = 75; 
const aspect = w / h; 
const near = 0.1; 
const far = 10; 

 const camera  = new THREE.PerspectiveCamera(fov,aspect,near,far);

 camera.position.z = 2; 
 const scene = new THREE.Scene(); 
     const cssScene = new THREE.Scene();


 const geo = new THREE.IcosahedronGeometry(1.0,2);
 const mat = new THREE.MeshBasicMaterial({
    color: "#00ccff"
    
 });
  
 const mesh = new THREE.Mesh(geo,mat);
 scene.add(mesh);
 
 const div = document.createElement("div");
    div.className = txt;
    const domObject = new CSS3DObject(div);
    cssScene.add(domObject);

 function animate() {
  requestAnimationFrame(animate);
  mesh.rotation.y += 0.01; // spin so you can see it
  renderer.render(scene, camera);
  cssRenderer.render(cssScene, camera);

}
animate();

 

 // ^ Render Set up 


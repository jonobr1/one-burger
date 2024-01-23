import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { Sticker } from "./sticker.js";

const TWO_PI = Math.PI * 2;

let direction = true;

const amount = 100;
const spin = 100;
const stickers = [];

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-10, -10);

export default function App(props) {

  const domElement = useRef();

  useEffect(mount, []);

  function mount() {

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50, 1, 1),
      new THREE.MeshBasicMaterial({
        color: 'blue',
        wireframe: true,
        opacity: 0,
        transparent: true
      })
    );

    const cursor = new THREE.Mesh(
      new THREE.SphereGeometry(1, 1, 1, 1),
      new THREE.MeshBasicMaterial({
        color: 'green'
      })
    );
    cursor.position.set(-10, -10);
    cursor.visible = false;
    cursor.scale.set(0.05, 0.05, 0.05);

    scene.add(cursor, plane);
    camera.position.z = 2;

    for (let i = 0; i < amount; i++) {

      const sticker = new Sticker();
      const isLast = i >= amount - 1;
      const rotation = TWO_PI * Math.random() * spin / 100;

      const x = Math.random() * 4 - 2;
      const y = Math.random() * 4 - 2;

      sticker.position.x = isLast ? 0 : x;
      sticker.position.y = isLast ? 0 : y;
      sticker.rotation.z = isLast ? 0 : rotation;

      sticker.userData.position = new THREE.Vector2();
      sticker.renderOrder = i;
      sticker.material.uniforms.is3D.value = isLast ? 1 : 0;

      scene.add(sticker);
      stickers.push(sticker);

    }

    renderer.setClearAlpha(0);

    domElement.current.appendChild(renderer.domElement);
    renderer.setAnimationLoop(update);

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', pointermove);
    window.addEventListener('click', click);
    
    setTimeout(resize, 0);

    return unmount;

    function unmount() {

      renderer.setAnimationLoop(null);
      window.addEventListener('resize', resize);
      window.removeEventListener('pointermove', pointermove);

      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement
          .removeChild(renderer.domElement);
      }

    }

    function pointermove(e) {

      if (TWEEN.getAll().length > 0) {
        return;
      }

      const width = window.innerWidth;
      const height = window.innerHeight;

      mouse.x = ( e.clientX / width ) * 2 - 1;
      mouse.y = - ( e.clientY / height ) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersections = raycaster.intersectObject(plane);

      if (intersections.length > 0) {
        cursor.position.copy(intersections[0].point);
      } else {
        cursor.position.set(-10, -10, 0);
      }

      const sticker = stickers[stickers.length - 1];
      sticker.material.uniforms.cursor.value.copy(cursor.position);
      sticker.material.uniforms.magnitude.value = 1;
      

    }

    function click() {

      for (let i = 0; i < stickers.length; i++) {

        const sticker = stickers[i];
        let pct = sticker.renderOrder / stickers.length;

        if (direction) {
          pct = 1 - pct;
        }
        if (sticker.userData.tween) {
          sticker.userData.tween.stop();
        }

        sticker.userData.tween  = new TWEEN.Tween(sticker.material.uniforms.magnitude)
          .to({ value: direction ? 1 : 0 }, 350)
          .delay(Math.pow(pct, 1.5) * 1000)
          .easing(TWEEN.Easing.Circular.Out)
          .onUpdate(move(sticker))
          .start();
        
        if (direction) {
          sticker.userData.tween.onComplete(hide(sticker));
        } else {
          sticker.userData.tween.onStart(show(sticker)).onComplete(stop(sticker));
        }

      }

      direction = !direction;

    }

    function move(sticker) {

      const position = sticker.userData.position;
      const rotation = Math.random() * Math.PI * 2;

      return () => {

        const magnitude = sticker.material.uniforms.magnitude.value;

        sticker.position.x = position.x + 0.33 * Math.cos(rotation) * magnitude;
        sticker.position.y = position.y + 0.33 * Math.sin(rotation) * magnitude;

        sticker.material.uniforms.cursor.value
          .copy(sticker.position);

        sticker.material.uniforms.cursor.value.x += 0.01 * Math.cos(rotation);
        sticker.material.uniforms.cursor.value.y += 0.01 * Math.sin(rotation);

      };
    }

    function resize() {

      const width = window.innerWidth;
      const height = window.innerHeight;

      const hasTouch = window.navigator.maxTouchPoints > 0;
      const isPortrait = height > width;
      const isMobile = hasTouch && isPortrait;

      const domElement = document.querySelector('div.seo');
      const wasMobile = domElement.classList.contains('mobile');
      if (wasMobile !== isMobile) {
        domElement.classList[isMobile ? 'add' : 'remove']('mobile');
      }

      renderer.setSize(width, height);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      const size = getMaxDimensionInWorldSpace(camera, plane);
      stickers.forEach((sticker, i) => {

        const isLast = i >= amount - 1;
        const w = size;
        const h = w / camera.aspect;
  
        const x = Math.random() * w - w * 0.5;
        const y = Math.random() * h - h * 0.5;
  
        sticker.position.x = isLast ? 0 : x;
        sticker.position.y = isLast ? 0 : y;
        sticker.userData.position.copy(sticker.position)

      });

    }

    function update() {

      TWEEN.update();
      renderer.render(scene, camera);

    }

  }

  return <div ref={ domElement } />;

}

function getMaxDimensionInWorldSpace(camera, plane) {

  let i;

  raycaster.setFromCamera(new THREE.Vector2(-1, 1), camera);
  [i] = raycaster.intersectObject(plane);

  const topLeft = i.point;

  raycaster.setFromCamera(new THREE.Vector2(1, -1), camera);
  [i] = raycaster.intersectObject(plane);

  const bottomRight = i.point;

  return Math.max(
    bottomRight.y - topLeft.y,
    bottomRight.x - topLeft.x
  );

}
function hide(sticker) {
  return () => sticker.visible = false;
}
function stop(sticker) {
  return () => sticker.userData.tween.stop();
}
function show(sticker) {
  return () => sticker.visible = true;
}
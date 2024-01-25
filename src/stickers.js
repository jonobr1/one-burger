import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { Sticker } from "./sticker.js";

const TWO_PI = Math.PI * 2;

let tweenIndex = -1;
let direction = true;
let touch;

const amount = 100;
const spin = 100;
const stickers = [];
const rounds = 3;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-10, -10);
const eventParams = { passive: false };

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

export default function App(props) {

  const domElement = useRef();

  useEffect(mount, []);

  function mount() {

    const renderer = new THREE.WebGLRenderer({ antialias: false });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();

    scene.add(cursor, plane);
    camera.position.z = 2.25;

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
      sticker.material.uniforms.cursor.value = new THREE.Vector2(
        0.1 * (Math.random() - 0.5),
        0.1 * (Math.random() - 0.5)
      );

      scene.add(sticker);
      stickers.push(sticker);

    }

    renderer.setClearAlpha(0);

    domElement.current.appendChild(renderer.domElement);
    renderer.setAnimationLoop(update);

    window.addEventListener('resize', resize);
    renderer.domElement.addEventListener('pointermove', pointermove);
    renderer.domElement.addEventListener('touchstart', touchstart, eventParams);
    renderer.domElement.addEventListener('touchmove', touchmove, eventParams);
    renderer.domElement.addEventListener('touchend', touchend, eventParams);
    renderer.domElement.addEventListener('touchcancel', touchend, eventParams);
    renderer.domElement.addEventListener('click', trigger);
    
    setTimeout(resize, 0);

    return unmount;

    function unmount() {

      renderer.setAnimationLoop(null);
      window.addEventListener('resize', resize);
      renderer.domElement.removeEventListener('pointermove', pointermove);
      renderer.domElement.removeEventListener('touchstart', touchstart, eventParams);
      renderer.domElement.removeEventListener('touchmove', touchmove, eventParams);
      renderer.domElement.removeEventListener('touchend', touchend, eventParams);
      renderer.domElement.removeEventListener('touchcancel', touchend, eventParams);

      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement
          .removeChild(renderer.domElement);
      }

    }

    function pointermove(e) {
      drag(e);
    }

    function touchstart(e) {
      e.preventDefault();
      if (e.touches.length > 0) {
        touch = e.touches[0];
        drag(touch);
      }
    }

    function touchmove(e) {
      e.preventDefault();
      if (e.touches.length > 0) {
        drag(e.touches[0])
      }
    }

    function touchend(e) {

      e.preventDefault();

      const width = window.innerWidth;
      const height = window.innerHeight;

      if (e.touches.length > 0) {

        const t = e.touches[0];
        const dx = width / 2 - t.clientX;
        const dy = height / 2 - t.clientY;
        const d2c = Math.sqrt(dx * dx + dy * dy);

        if (tweenIndex < 0 && d2c < 0.33 * width) {
          trigger();
        } else {
          trigger();
        }

      }

    }

    function drag({ clientX, clientY }) {

      if (TWEEN.getAll().length > 0) {
        return;
      }

      const width = window.innerWidth;
      const height = window.innerHeight;

      mouse.x = ( clientX / width ) * 2 - 1;
      mouse.y = - ( clientY / height ) * 2 + 1;

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

    function trigger() {

      const count = Math.floor(stickers.length / rounds);
      const last = stickers.length - 1;

      let inc = direction ? 1 : -1;
      let start = clamp(tweenIndex * count, 0, last);
      let end = clamp(start + count * inc, 0, last);

      start = last - start;
      end = last - end;

      let min = Math.min(start, end);
      let max = Math.max(start, end);

      if (tweenIndex < 0 || tweenIndex === 0 && min === last && max === last) {
        const sticker = stickers[stickers.length - 1];
        if (direction) {
          animateOut(sticker);
        } else {
          animateIn(sticker);
        }
        sticker.userData.tween.start();
      } else {
        let j = 0;
        if (direction) {
          for (let i = max - 1; i >= min; i--) {
            const sticker = stickers[i];
            if (direction) {
              animateOut(sticker);
            } else {
              animateIn(sticker);
            }
            sticker.userData.tween.delay(j * 50).start();
            j++;
          }
        } else {
          for (let i = min; i < max; i++) {
            const sticker = stickers[i];
            if (direction) {
              animateOut(sticker);
            } else {
              animateIn(sticker);
            }
            sticker.userData.tween.delay(j * 50).start();
            j++;
          }
        }
      }

      tweenIndex += inc;

      if (tweenIndex < 0 || tweenIndex > rounds) {
        direction = !direction;
        tweenIndex = clamp(tweenIndex, -1, rounds);
      }

    }

    function animateOut(sticker) {

      if (sticker.userData.tween) {
        sticker.userData.tween.stop();
      }

      const value = sticker.material.uniforms.magnitude.value + 1;

      sticker.userData.tween = new TWEEN.Tween(sticker.material.uniforms.magnitude)
        .to({ value }, 350)
        .easing(TWEEN.Easing.Circular.Out)
        .onUpdate(move(sticker))
        .onComplete(hide(sticker));

      return sticker.userData.tween;

    }
    function animateIn(sticker) {

      if (sticker.userData.tween) {
        sticker.userData.tween.stop();
      }

      const value = 0;

      sticker.userData.tween = new TWEEN.Tween(sticker.material.uniforms.magnitude)
        .to({ value }, 350)
        .easing(TWEEN.Easing.Circular.Out)
        .onUpdate(move(sticker))
        .onStart(show(sticker))
        .onComplete(stop(sticker));

      return sticker.userData.tween;

    }

    function move(sticker) {

      const position = sticker.userData.position;
      const rotation = Math.atan2(
        position.y - sticker.material.uniforms.cursor.value.y,
        position.x - sticker.material.uniforms.cursor.value.x
      );

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
function clamp(v, a, b) {
  return Math.min(Math.max(v, a), b);
}
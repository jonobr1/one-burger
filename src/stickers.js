import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { Sticker } from "./sticker.js";

const TWO_PI = Math.PI * 2;
const vector = new THREE.Vector2();

let top = null;
let touch = null;
let isMobile = window.navigator.maxTouchPoints > 0;
let dragging = false;
let animating = false;

const dim = 1 / 6; // How many clicks to clear
const amount = 49;  // PoT
const cap = { value: 0.5, tween: null };

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-10, -10);
const eventParams = { passive: false };

const stickers = new THREE.Group();

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
cursor.position.set(-10, -10, 0);
cursor.visible = false;
cursor.scale.set(0.05, 0.05, 0.05);

export default function App(props) {

  const domElement = useRef();

  useEffect(mount, []);

  function mount() {

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();

    Sticker.Texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    scene.add(cursor, plane, stickers);
    camera.position.z = 2.25;

    for (let i = 0; i < amount + 1; i++) {

      const sticker = new Sticker();
      const isLast = i >= amount;
      const rotation = TWO_PI * Math.random();

      sticker.rotation.z = isLast ? 0 : rotation;

      sticker.renderOrder = isLast ? (amount + 2) : (1 + Math.random() * amount);
      sticker.material.uniforms.is3D.value = 1;
      sticker.material.uniforms.hasShadows.value = 1;

      stickers.add(sticker);

      if (isLast) {
        setTop(sticker);
      }

    }

    renderer.setClearAlpha(0);
    domElement.current.appendChild(renderer.domElement);

    renderer.setAnimationLoop(update);
    window.addEventListener('resize', resize);
    
    renderer.domElement.addEventListener('pointerdown', pointerdown);
    renderer.domElement.addEventListener('pointermove', pointermove);
    renderer.domElement.addEventListener('touchstart', touchstart, eventParams);
    renderer.domElement.addEventListener('touchmove', touchmove, eventParams);
    renderer.domElement.addEventListener('touchend', touchend, eventParams);
    renderer.domElement.addEventListener('touchcancel', touchend, eventParams);
    
    renderer.render(scene, camera);
    resize();
    document.body.style.opacity = 1;

    return unmount;

    function unmount() {

      renderer.setAnimationLoop(null);
      window.addEventListener('resize', resize);

      renderer.domElement.addEventListener('pointerdown', pointerdown);
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

    }

    function pointerdown({ clientX, clientY }) {

      if (animating) {
        return;
      }

      dragging = true;

      if (cap.tween) {
        cap.tween.stop();
      }

      cap.tween = new TWEEN.Tween(cap)
        .to({ value: 0.4 }, 350)
        .easing(TWEEN.Easing.Back.Out)
        .onComplete(() => cap.tween.stop())
        .start();

      drag({ clientX, clientY });

      window.addEventListener('pointermove', drag);
      window.addEventListener('pointerup', pointerup);

    }

    function drag({ clientX, clientY }) {

      const width = window.innerWidth;
      const height = window.innerHeight;

      mouse.x = (clientX / width) * 2 - 1;
      mouse.y = - (clientY / height) * 2 + 1;

      updateCursor();

    }

    function pointerup({ clientX, clientY }) {

      dragging = false;

      if (cap.tween) {
        cap.tween.stop();
      }

      cap.tween = new TWEEN.Tween(cap)
        .to({ value: 0.5 }, 350)
        .easing(TWEEN.Easing.Back.Out)
        .onComplete(() => cap.tween.stop())
        .start();

      if (top) {

        const width = window.innerWidth;
        const height = window.innerHeight;
  
        mouse.x = (clientX / width) * 2 - 1;
        mouse.y = - (clientY / height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        const intersections = raycaster.intersectObject(top);
        if (intersections.length > 0) {
          peel(top);
        }

      } else {

        // Add all stickers back in

      }

      window.removeEventListener('pointermove', drag);
      window.removeEventListener('pointerup', pointerup);

    }

    function batch() {

      let index = 0;
      const per = Math.floor(amount * dim);

      animating = true;
      peel(getTop()).then(f);

      function f() {

        if (top && index < per) {

          const sticker = top;
          vector.set(
            sticker.position.x + (Math.random() - 0.5),
            sticker.position.y + (Math.random() - 0.5) * Sticker.aspect
          );
          vector.rotateAround(sticker.position, sticker.rotation.z);

          updateCursor({
            x: vector.x,
            y: vector.y,
            z: sticker.position.z
          });

          peel(sticker).then(f);
          index++;

        } else {
          mouse.set(-10, -10);
          animating = false;
        }

      }

    }

    function peel(sticker) {

      animating = true;

      return new Promise((resolve) => {

        const duration = 350;
        const rad = 0.001;
        const angle = Math.atan2(
          sticker.material.uniforms.cursor.value.y,
          sticker.material.uniforms.cursor.value.x
        );

        let x = rad * Math.cos(angle);
        let y = rad * Math.sin(angle);

        const tween = new TWEEN.Tween(sticker.material.uniforms.cursor.value)
          .to({ x, y }, duration)
          .easing(TWEEN.Easing.Circular.In)
          .onUpdate(() => console.log('update'))
          .onComplete(() => {
            tween.stop();
            sticker.visible = false;
            setTop(getTop());
            animating = false;
            resolve();
          })
          .start();

        if (cap.tween) {
          cap.tween.stop();
        }

        cap.tween = new TWEEN.Tween(cap)
          .to({ value: 0.25 }, duration)
          .easing(TWEEN.Easing.Circular.In)
          .onComplete(() => {
            cap.tween.stop();
            cap.value = 0.5;
          })
          .start();

      });

    }

    function pointermove({ clientX, clientY }) {

      if (dragging || animating) {
        return;
      }

      const width = window.innerWidth;
      const height = window.innerHeight;

      mouse.x = (clientX / width) * 2 - 1;
      mouse.y = - (clientY / height) * 2 + 1;

      updateCursor();

    }

    function updateCursor(position) {

      raycaster.setFromCamera(mouse, camera);
      const intersections = raycaster.intersectObject(plane);

      if (position) {
        cursor.position.copy(position);
      } else if (intersections.length > 0) {
        cursor.position.copy(intersections[0].point);
      } else {
        cursor.position.set(-10, -10, 0);
      }

    }

    function fold() {

      if (!top) {
        return;
      }

      const sticker = top;
      const dx = cursor.position.x - sticker.position.x;
      const dy = cursor.position.y - sticker.position.y;
      const angle = Math.atan2(dy, dx);

      const distance = Math.max(cursor.position.distanceTo(sticker.position), cap.value);
      const p = sticker.material.uniforms.cursor.value;

      p.x = distance * Math.cos(angle);
      p.y = distance * Math.sin(angle);

      sticker.material.uniforms.magnitude.value = 1;

    }

    function resize() {

      let width = window.innerWidth;
      let height = window.innerHeight;

      const hasTouch = window.navigator.maxTouchPoints > 0;
      const isPortrait = height > width;
      
      isMobile = hasTouch && isPortrait;

      const domElement = document.querySelector('div.seo');
      const wasMobile = domElement.classList.contains('mobile');

      if (wasMobile !== isMobile) {
        domElement.classList[isMobile ? 'add' : 'remove']('mobile');
      }

      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      if (isMobile) {
        camera.rotation.z = Math.PI / 2;
      } else {
        camera.rotation.z = 0;
      }

      const sqrt = Math.sqrt(amount);
      const size = getMaxDimensionInWorldSpace(camera, plane);
      const cols = size.width > size.height ? (camera.aspect * sqrt) : sqrt;
      const rows = size.height > size.width ? sqrt : (sqrt / camera.aspect);
      stickers.children.forEach((sticker, i) => {

        const isLast = i === amount;
  
        const col = i % cols;
        const row = Math.floor(i / cols);

        const xpct = (col + 0.5) / cols;
        const ypct = (row + 0.5) / rows;

        const x = size.width * (xpct - 0.5);
        const y = size.height * (ypct - 0.5);
  
        sticker.position.x = isLast ? 0 : x;
        sticker.position.y = isLast ? 0 : y;

      });
    }

    function update() {

      TWEEN.update();

      fold();
      renderer.render(scene, camera);

    }

  }

  return (
    <div className="react">
      <div ref={ domElement } />
      <div id="contact">
        <a href="mailto:buns@oneburger.com">
          Contact → <span className="mail" />
        </a>
      </div>
    </div>
  );

}

function getMaxDimensionInWorldSpace(camera, plane) {

  let i;

  raycaster.setFromCamera(new THREE.Vector2(-1, 1), camera);
  [i] = raycaster.intersectObject(plane);

  const topLeft = i.point;

  raycaster.setFromCamera(new THREE.Vector2(1, -1), camera);
  [i] = raycaster.intersectObject(plane);

  const bottomRight = i.point;
  const width = Math.max(bottomRight.x - topLeft.x, topLeft.x - bottomRight.x);
  const height = Math.max(bottomRight.y - topLeft.y, topLeft.y - bottomRight.y)

  return { width, height };

}

function setTop(sticker) {
  if (top) {
    top.material.depthTest = false;
    top.material.uniforms.magnitude.value = 0;
  }
  top = sticker;
  if (top) {
    top.material.depthTest = true;
  }
}

function getTop() {
  let renderOrder = -1;
  let index = -1;
  for (let i = 0; i < stickers.children.length; i++) {
    const sticker = stickers.children[i];
    if (sticker.visible && sticker.renderOrder > renderOrder) {
      renderOrder = sticker.renderOrder;
      index = i;
    }
  }
  if (index < 0) {
    return null;
  }
  return stickers.children[index];
}
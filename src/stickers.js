import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { Sticker } from "./sticker.js";

const TWO_PI = Math.PI * 2;
const duration = 500;

let touch = null;
let isMobile = window.navigator.maxTouchPoints > 0;
let dragging = false;
let animating = false;

let sorted = null;
let foreground = null;

const dim = 1 / 6;  // How many clicks to clear
const amount = 49;  // PoT

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

export default function App(props) {

  const domElement = useRef();

  useEffect(mount, []);

  function mount() {

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, -1, 1, 0.1, amount * 10);

    Sticker.Texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    scene.add(plane, stickers);
    camera.position.z = amount * 2;

    for (let i = 0; i < amount + 1; i++) {

      const sticker = new Sticker();
      const isLast = i >= amount;
      const rotation = TWO_PI * Math.random();

      sticker.rotation.z = isLast ? 0 : rotation;
      sticker.position.z = isLast ? (amount + 1) * 1.5
        : (Math.random() * amount) * 1.5;

      sticker.material.uniforms.is3D.value = 1;
      sticker.material.uniforms.hasShadows.value = 1;

      stickers.add(sticker);

    }

    sorted = getSorted();
    setForeground();

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

      foreground.forEach((sticker) => {

        const cap = sticker.userData.cap;

        if (cap.tween) {
          cap.tween.stop();
        }
  
        cap.tween = new TWEEN.Tween(cap)
          .to({ value: 0.4 }, duration)
          .easing(TWEEN.Easing.Back.Out)
          .onComplete(() => cap.tween.stop())
          .start();

      });

      drag({ clientX, clientY });

      window.addEventListener('pointermove', drag);
      window.addEventListener('pointerup', pointerup);

    }
    function drag({ clientX, clientY }) {

      const width = window.innerWidth;
      const height = window.innerHeight;

      mouse.x = (clientX / width) * 2 - 1;
      mouse.y = - (clientY / height) * 2 + 1;

      foreground.forEach(updateCursor);

    }
    function pointerup({ clientX, clientY }) {

      dragging = false;

      foreground.forEach((sticker) => {

        const cap = sticker.userData.cap;

        if (cap.tween) {
          cap.tween.stop();
        }
  
        cap.tween = new TWEEN.Tween(cap)
          .to({ value: 0.5 }, duration)
          .easing(TWEEN.Easing.Back.Out)
          .onComplete(() => cap.tween.stop())
          .start();

      });

      if (foreground.length > 0) {

        const width = window.innerWidth;
        const height = window.innerHeight;
  
        mouse.x = (clientX / width) * 2 - 1;
        mouse.y = - (clientY / height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        const intersections = raycaster.intersectObjects(foreground);
        if (intersections.length > 0) {
          batch(intersections[0].object);
        }

      } else {

        // Add all stickers back in

      }

      window.removeEventListener('pointermove', drag);
      window.removeEventListener('pointerup', pointerup);

    }

    function batch(sticker) {

      if (animating) {
        return;
      }

      let isFirst = true;
      const per = Math.floor(amount * dim);

      const eligible = [sticker].concat(
        sorted
          .filter((s) => s.visible && s.uuid !== sticker.uuid)
          .slice(0, per)
      );

      return Promise
        .all(
          eligible.map((sticker, i) => {
            const delay = duration * i * 0.7;
            return f(sticker, delay);
          })
        )
        .then(setForeground);

      function f(sticker, delay) {

        const angle = Math.random() * TWO_PI;
        const rad = 0.25;

        if (!isFirst) {

          sticker.userData.cap.value = 1;

          const projection = new THREE.Vector2(
            rad * Math.cos(angle),
            rad * Math.sin(angle) * Sticker.aspect
          );

          sticker.userData.cursor
            .copy(sticker.position)
            .add(projection)
            .rotateAround(sticker.position, - sticker.rotation.z);

        }

        isFirst = false;

        return peel(sticker, delay);

      }

    }
    function peel(sticker, delay) {

      const cap = sticker.userData.cap;
      const rad = 0.001;
      const angle = Math.atan2(
        sticker.material.uniforms.cursor.value.y,
        sticker.material.uniforms.cursor.value.x
      );

      let x = rad * Math.cos(angle);
      let y = rad * Math.sin(angle);

      delay = delay || 0;
      animating = true;

      return Promise
        .all([fold(), curl()])
        .then(fade)
        .then(rest);

      function fold() {
        return new Promise((resolve) => {
          const tween = new TWEEN.Tween(sticker.material.uniforms.cursor.value)
          .to({ x, y }, duration)
          .easing(TWEEN.Easing.Sinusoidal.Out)
          .delay(delay)
          .onComplete(() => {
            tween.stop();
            resolve();
          })
          .start();
        });
      }

      function curl() {
        return new Promise((resolve) => {
          if (cap.tween) {
            cap.tween.stop();
          }
          cap.tween = new TWEEN.Tween(cap)
            .to({ value: 0.3 }, duration)
            .easing(TWEEN.Easing.Sinusoidal.Out)
            .delay(delay)
            .onComplete(() => {
              cap.tween.stop();
              resolve();
            })
            .start();
        });
      }

      function fade() {
        return new Promise((resolve) => {
          const tween = new TWEEN.Tween(sticker.material.uniforms.opacity)
            .to({ value: 0 }, duration * 0.5)
            .easing(TWEEN.Easing.Circular.Out)
            .onComplete(() => {
              tween.stop();
              resolve();
            })
            .start();
        });
      }

      function rest() {
        sticker.visible = false;
        animating = false;
      }

    }

    function pointermove({ clientX, clientY }) {

      if (dragging || animating) {
        return;
      }

      const width = window.innerWidth;
      const height = window.innerHeight;

      mouse.x = (clientX / width) * 2 - 1;
      mouse.y = - (clientY / height) * 2 + 1;

      foreground.forEach(updateCursor);

    }

    function updateCursor(sticker, position) {

      raycaster.setFromCamera(mouse, camera);

      const intersections = raycaster.intersectObject(plane);
      const cursor = sticker.userData.cursor;

      if (position && typeof position === 'object') {
        cursor.copy(position);
      } else if (intersections.length > 0) {
        cursor.copy(intersections[0].point);
      } else {
        cursor.set(-10, -10);
      }

    }

    function setForeground() {
      for (let i = 0; i < stickers.children.length; i++) {
        const sticker = stickers.children[i];
        sticker.userData.cap.value = 1;
      }
      foreground = sorted.filter((s) => s.visible).slice(0, amount);
      foreground.forEach((s) => {
        s.userData.cap.value = 0.5;
      });
      return foreground;
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

      camera.top = - 1;
      camera.left = - width / height;
      camera.right = width / height;
      camera.bottom = 1;
      camera.updateProjectionMatrix();

      if (isMobile) {
        camera.rotation.z = Math.PI / 2;
      } else {
        camera.rotation.z = 0;
      }

      const sqrt = Math.sqrt(amount);
      const size = getMaxDimensionInWorldSpace(camera, plane);
      const cols = sqrt;
      const rows = sqrt;
      stickers.children.forEach((sticker, i) => {

        const isLast = i === amount;
  
        const col = i % cols;
        const row = Math.floor(i / cols);

        const xpct = (col + 0.5) / cols;
        const ypct = (row + 0.5) / rows;

        let x = size.width * (xpct - 0.5);
        let y = size.height * (ypct - 0.5);

        sticker.position.x = isLast ? 0 : x;
        sticker.position.y = isLast ? 0 : y;

      });
    }

    function update() {

      TWEEN.update();

      for (let i = 0; i < stickers.children.length; i++) {
        const sticker = stickers.children[i];
        sticker.fold();
      }
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

function getSorted() {
  const result = stickers.children.slice(0);
  result.sort((a, b) => b.position.z - a.position.z);
  return result;
}
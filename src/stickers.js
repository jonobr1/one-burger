import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { Sticker } from "./sticker.js";

const TWO_PI = Math.PI * 2;
const duration = 500;

let isMobile = window.navigator.maxTouchPoints > 0;
let dragging = false;

let sorted = null;
let foreground = null;

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

export default function App() {

  const domElement = useRef();

  const [pointer, setPointer] = useState({ x: - 10, y: - 10 });
  const [isEmpty, setIsEmpty] = useState(false);

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
    document.body.querySelector('#globe').addEventListener('click', stick);
    
    renderer.render(scene, camera);
    resize();
    Sticker.Texture.onUpdate = () => document.body.style.opacity = 1;

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
        pointerdown(e.touches[0])
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
      if (e.touches.length > 0) {
        pointerup(e.touches[0]);
      }
    }

    function pointerdown({ clientX, clientY }) {

      dragging = true;

      foreground.forEach((sticker) => {

        const cap = sticker.userData.cap;

        if (cap.tween) {
          cap.tween.stop();
        }
  
        cap.tween = new TWEEN.Tween(cap)
          .to({ value: 0.4 }, duration * 0.7)
          .easing(TWEEN.Easing.Quadratic.InOut)
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
          .to({ value: 0.5 }, duration * 0.7)
          .easing(TWEEN.Easing.Quadratic.Out)
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

      }

      window.removeEventListener('pointermove', drag);
      window.removeEventListener('pointerup', pointerup);

    }

    function batch(sticker) {

      let isFirst = true;
      const per = 10;

      const eligible = [sticker].concat(
        sorted
          .filter((s) => s.visible && s.uuid !== sticker.uuid)
          .slice(0, per)
      );

      const resp = Promise.all(
        eligible.map((sticker, i) => {
          const delay = duration * i * 0.4;
          return f(sticker, delay);
        })
      );

      setForeground();

      return resp;

      function f(sticker, delay) {

        const angle = Math.random() * TWO_PI;
        const rad = 1;

        if (!isFirst) {

          const projection = new THREE.Vector2(
            rad * Math.cos(angle),
            rad * Math.sin(angle)
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

      if (sticker.userData.animating) {
        return;
      }

      const cap = sticker.userData.cap;
      const rad = 0.05;
      const angle = Math.atan2(
        sticker.userData.cursor.y - sticker.position.y,
        sticker.userData.cursor.x - sticker.position.x
      );

      sticker.userData.animating = true;

      let x = rad * Math.cos(angle) + sticker.position.x;
      let y = rad * Math.sin(angle) + sticker.position.y;

      delay = delay || 0;

      return Promise
        .all([fold(), curl()])
        .then(rest);

      function fold() {
        return new Promise((resolve) => {
          const tween = new TWEEN.Tween(sticker.userData.cursor)
          .to({ x, y }, duration)
          .delay(delay)
          .easing(TWEEN.Easing.Quadratic.InOut)
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
            .delay(delay)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onComplete(() => {
              cap.tween.stop();
              resolve();
            })
            .start();
        });
      }

      function rest() {
        sticker.visible = false;
        sticker.userData.animating = false;
      }

    }
    function stick() {

      const eligible = sorted.filter((s) => !s.visible).slice(0).reverse();

      return Promise.all(
        eligible.map((sticker, i) => {

          const cap = sticker.userData.cap;
          cap.value = 0.3;

          sticker.userData.animating = true;

          const delay = duration * i * 0.4;

          return Promise
            .all([curl()])
            .then(rest);

          function curl() {
            return new Promise((resolve) => {
              if (cap.tween) {
                cap.tween.stop();
              }
              cap.tween = new TWEEN.Tween(cap)
                .to({ value: 1 }, duration)
                .onStart(() => sticker.visible = true)
                .delay(delay)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onComplete(() => {
                  cap.tween.stop();
                  resolve();
                })
                .start();
            });
          }

          function rest() {
            sticker.userData.animating = false;
            updateCursor(sticker);
          }

        })
      )
      .then(setForeground);

    }

    function pointermove({ clientX, clientY }) {

      setPointer({ x: clientX, y: clientY });

      if (dragging) {
        return;
      }

      const width = window.innerWidth;
      const height = window.innerHeight;

      mouse.x = (clientX / width) * 2 - 1;
      mouse.y = - (clientY / height) * 2 + 1;

      foreground.forEach(updateCursor);

    }

    function updateCursor(sticker, position) {

      if (sticker.userData.animating) {
        return;
      }

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
      foreground = sorted.filter((s) => (s.visible && !s.userData.animating)).slice(0, 12);
      foreground.forEach((s) => {
        s.userData.cap.value = 0.5;
      });
      setIsEmpty(foreground.length <= 0);
      return foreground;
    }

    function resize() {

      let width = window.innerWidth;
      let height = window.innerHeight;

      const hasTouch = window.navigator.maxTouchPoints > 0;
      const isPortrait = height > width;
      
      isMobile = hasTouch && isPortrait;

      const domElement = document.body;
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

      const sqrt = Math.sqrt(amount);
      const size = getMaxDimensionInWorldSpace(camera, plane);

      if (isMobile) {
        camera.rotation.z = Math.PI / 2;
      } else {
        camera.rotation.z = 0;
      }

      let cols = sqrt;
      let rows = sqrt;

      if (width / height > 2) {
        rows = 3;
        cols = Math.ceil(amount / rows);
      } else if (height / width > 2) {
        cols = 3;
        rows = Math.ceil(amount / cols);
      }

      stickers.children.forEach((sticker, i) => {

        const isLast = i === amount;
  
        const col = i % cols;
        const row = Math.floor(i / cols);

        const xpct = (col + 0.5) / cols;
        const ypct = (row + 0.5) / rows;

        let x = size.width * (xpct - 0.5);
        let y = size.height * (ypct - 0.5);

        if (isMobile) {
          x = size.height * (ypct - 0.5);
          y = size.width * (xpct - 0.5);
        }

        if (isLast) {
          x = 0;
          y = 0;
        }

        sticker.position.x = x;
        sticker.position.y = y;

      });
    }

    function update(elapsed) {

      TWEEN.update(elapsed);

      for (let i = 0; i < stickers.children.length; i++) {
        const sticker = stickers.children[i];
        sticker.fold();
      }
      renderer.render(scene, camera);

    }

  }

  const className = ['react'];
  if (isEmpty) {
    className.push('empty');
  }

  return (
    <div className={ className.join(' ') }>
      <div ref={ domElement } />
      <div id="contact">
        <a href="mailto:buns@oneburger.com">
          Contact → <span className="mail" />
        </a>
      </div>
      <div id="cursor" style={ { top: pointer.y, left: pointer.x } } />
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
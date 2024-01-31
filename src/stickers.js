import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { Sticker } from "./sticker.js";

const TWO_PI = Math.PI * 2;

let top = null;
let touch = null;
let isMobile = window.navigator.maxTouchPoints > 0;
let dragging = false;
let animating = false;

const amount = 150;
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

    for (let i = 0; i < amount; i++) {

      const sticker = new Sticker();
      const isLast = i >= amount - 1;
      const rotation = TWO_PI * Math.random();

      sticker.rotation.z = isLast ? 0 : rotation;
      sticker.userData.position = new THREE.Vector2();

      sticker.renderOrder = i;
      sticker.material.uniforms.is3D.value = 1;
      sticker.material.uniforms.hasShadows.value = 1;

      const cx = 1.20 * (Math.random() - 0.5);
      const cy = 0.80 * (Math.random() - 0.5);
      sticker.material.uniforms.cursor.value = new THREE.Vector2(cx, cy);

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

    // renderer.domElement.addEventListener('touchstart', touchstart, eventParams);
    // renderer.domElement.addEventListener('touchmove', touchmove, eventParams);
    // renderer.domElement.addEventListener('touchend', touchend, eventParams);
    // renderer.domElement.addEventListener('touchcancel', touchend, eventParams);
    // renderer.domElement.addEventListener('click', trigger);
    
    renderer.render(scene, camera);
    resize();
    document.body.style.opacity = 1;

    return unmount;

    function unmount() {

      renderer.setAnimationLoop(null);
      window.addEventListener('resize', resize);

      renderer.domElement.addEventListener('pointerdown', pointerdown);
      renderer.domElement.removeEventListener('pointermove', pointermove);
      // renderer.domElement.removeEventListener('touchstart', touchstart, eventParams);
      // renderer.domElement.removeEventListener('touchmove', touchmove, eventParams);
      // renderer.domElement.removeEventListener('touchend', touchend, eventParams);
      // renderer.domElement.removeEventListener('touchcancel', touchend, eventParams);
      // renderer.domElement.removeEventListener('click', trigger);

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
      trigger();

    }

    function pointerdown({ clientX, clientY }) {

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
      mouse.needsUpdate = true;
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
        mouse.needsUpdate = true;
  
        raycaster.setFromCamera(mouse, camera);
  
        const intersections = raycaster.intersectObject(top);
        if (intersections.length > 0) {
          peel(top);
        }

      }

      window.removeEventListener('pointermove', drag);
      window.removeEventListener('pointerup', pointerup);

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

        const tCursor = new TWEEN.Tween(sticker.material.uniforms.cursor.value)
          .to({ x, y }, duration)
          .easing(TWEEN.Easing.Circular.In)
          .onComplete(() => {
            setTop(getTop());
            sticker.visible = false;
            tCursor.stop();
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
          .onComplete(() => cap.tween.stop())
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
      mouse.needsUpdate = true;
    }

    function intersect() {

      if (mouse.needsUpdate) {

        raycaster.setFromCamera(mouse, camera);

        const intersections = raycaster.intersectObject(plane);
  
        if (intersections.length > 0) {
          cursor.position.copy(intersections[0].point);
        } else {
          cursor.position.set(-10, -10, 0);
        }

        mouse.needsUpdate = false;

      }

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
      sticker.material.uniforms.magnitude.t = 0;

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

      const size = getMaxDimensionInWorldSpace(camera, plane);
      stickers.children.forEach((sticker, i) => {

        const isLast = i >= amount - 1;
  
        let x = Math.random() * size.width - size.width / 2;
        let y = Math.random() * size.height - size.height / 2;

        if (isMobile) {
          x = Math.random() * size.height - size.height / 2;
          y = Math.random() * size.width - size.width / 2;
        }
  
        sticker.position.x = isLast ? 0 : x;
        sticker.position.y = isLast ? 0 : y;
        sticker.userData.position.copy(sticker.position)

      });
    }

    function update() {

      TWEEN.update();

      intersect();
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
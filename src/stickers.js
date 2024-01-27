import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { Sticker } from "./sticker.js";

const TWO_PI = Math.PI * 2;

let top = null;
let direction = true;
let toAnimate = [];
let touch;
let isMobile;

const amount = 150;
const spin = 100;
const stickers = [];

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
    scene.add(cursor, plane);
    camera.position.z = 2.25;

    for (let i = 0; i < amount; i++) {

      const sticker = new Sticker();
      const isLast = i >= amount - 1;
      const rotation = TWO_PI * Math.random() * spin / 100;

      sticker.rotation.z = isLast ? 0 : rotation;
      sticker.userData.position = new THREE.Vector2();

      sticker.renderOrder = i;
      sticker.material.depthTest = isLast;
      sticker.material.uniforms.is3D.value = 1;
      sticker.material.uniforms.hasShadows.value = isLast ? 1 : 0;
      sticker.material.uniforms.cursor.value = new THREE.Vector2(
        1.20 * (Math.random() - 0.5),
        0.80 * (Math.random() - 0.5)
      );

      scene.add(sticker);
      stickers.push(sticker);
      toAnimate.push(sticker);

      if (isLast) {
        top = sticker;
      }

    }

    renderer.setClearAlpha(0);

    domElement.current.appendChild(renderer.domElement);
    renderer.setAnimationLoop(update);

    window.addEventListener('resize', resize);
    renderer.domElement.addEventListener('pointermove', drag);

    renderer.domElement.addEventListener('touchstart', touchstart, eventParams);
    renderer.domElement.addEventListener('touchmove', touchmove, eventParams);
    renderer.domElement.addEventListener('touchend', touchend, eventParams);
    renderer.domElement.addEventListener('touchcancel', touchend, eventParams);
    renderer.domElement.addEventListener('click', trigger);
    
    renderer.render(scene, camera);
    resize();
    document.body.style.opacity = 1;

    return unmount;

    function unmount() {

      renderer.setAnimationLoop(null);
      window.addEventListener('resize', resize);
      renderer.domElement.removeEventListener('pointermove', drag);
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
      trigger();

    }

    function drag({ clientX, clientY }) {

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

      const sticker = top;
      const distance = Math.max(cursor.position.length(), 0.5);

      sticker.material.uniforms.cursor.value
        .copy(cursor.position)
        .normalize()
        .setLength(distance);

      sticker.material.uniforms.magnitude.value = 1;
      sticker.material.uniforms.magnitude.t = 0;

    }

    function trigger() {

      if (toAnimate.length <= 0) {
        // Switch directions
        direction = !direction;
        toAnimate = stickers.slice(0);
      }

      let queue = [];
      const mouse = cursor.position;
      let j = 0;

      for (let i = 0; i < toAnimate.length; i++) {

        const sticker = toAnimate[i];
        const distance = sticker.position.distanceTo(mouse);

        if (distance < 0.5) {
          toAnimate.splice(i, 1);
          queue.push(sticker);
        }

      }

      if (direction) {
        queue = queue.sort((a, b) => b.renderOrder - a.renderOrder);
      } else {
        queue = queue.sort((a, b) => a.renderOrder - b.renderOrder);
      }

      for (let i = 0; i < queue.length; i++) {

        const sticker = queue[i];

        if (direction) {
          animateOut(sticker);
        } else {
          animateIn(sticker);
        }

        const delay = j * 50 + 25 * (Math.random() - 0.5);
        sticker.userData.tween.delay(delay).start();
        j++;

      }

    }

    function animateOut(sticker) {

      if (sticker.userData.tween) {
        sticker.userData.tween.stop();
      }

      const value = Math.max(sticker.material.uniforms.magnitude.value + 0.75, 1.5);
      sticker.material.uniforms.magnitude.t = 0;

      sticker.userData.tween = new TWEEN.Tween(sticker.material.uniforms.magnitude)
        .to({ value, t: 1 }, 500)
        .easing(TWEEN.Easing.Quartic.In)
        .onUpdate(move(sticker))
        .onComplete(hide(sticker));

      return sticker.userData.tween;

    }
    function animateIn(sticker) {

      if (sticker.userData.tween) {
        sticker.userData.tween.stop();
      }

      const value = 0;
      sticker.material.uniforms.magnitude.t = 1;

      sticker.userData.tween = new TWEEN.Tween(sticker.material.uniforms.magnitude)
        .to({ value, t: 0 }, 500)
        .easing(TWEEN.Easing.Circular.Out)
        .onUpdate(move(sticker))
        .onStart(show(sticker))
        .onComplete(stop(sticker));

      return sticker.userData.tween;

    }

    function move(sticker) {

      const position = sticker.userData.position;
      const angle = Math.atan2(
        - sticker.material.uniforms.cursor.value.y,
        - sticker.material.uniforms.cursor.value.x
      ) / Math.PI;
      let rotation = sticker.rotation.z + Math.round(angle * 2) * Math.PI / 2;

      return () => {

        const amp = sticker.material.uniforms.magnitude.t;
        sticker.position.x = position.x + 0.05 * Math.cos(rotation) * amp;
        sticker.position.y = position.y + 0.05 * Math.sin(rotation) * amp;

      };
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

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      if (isMobile) {
        camera.rotation.z = Math.PI / 2;
      } else {
        camera.rotation.z = 0;
      }

      const size = getMaxDimensionInWorldSpace(camera, plane);
      stickers.forEach((sticker, i) => {

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
function hide(sticker) {
  return () => {
    sticker.userData.tween.stop();
    sticker.visible = false;
  }
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
import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import { Sticker } from "./sticker.js";

const stickers = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-10, -10);

const domElement = document.createElement('div');
const root = createRoot(domElement);

domElement.id = 'react';
document.body.appendChild(domElement);

function Prototype(props) {

  const domElement = useRef();

  useEffect(mount, []);

  function mount() {

    const renderer = new THREE.WebGLRenderer({ antialias: false });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50, 250, 250),
      new THREE.MeshBasicMaterial({
        color: 'blue',
        wireframe: true
      })
    );

    const cursor = new THREE.Mesh(
      new THREE.SphereGeometry(1, 1, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 'green'
      })
    );
    cursor.scale.set(0.05, 0.05, 0.05);

    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = 0;
    renderer.domElement.style.left = 0;

    camera.position.x = 11;
    camera.position.z = 2.5;

    let sticker = new Sticker();

    // sticker.material.uniforms.cursor.value = mouse;
    // sticker.material.uniforms.origin.value.x = 0.5;
    sticker.material.uniforms.magnitude.value = 1;
    sticker.material.uniforms.is3D.value = 1;
    sticker.material.uniforms.hasShadows.value = 1;
    sticker.material.depthTest = true;

    sticker.position.x = 10;
    sticker.position.y = 0;
    scene.add(sticker);
    stickers.push(sticker);

    sticker = new Sticker();

    // sticker.material.uniforms.cursor.value = mouse;
    sticker.material.uniforms.magnitude.value = 1;
    sticker.material.uniforms.is3D.value = 1;
    sticker.material.uniforms.hasShadows.value = 1;
    sticker.material.depthTest = true;

    sticker.position.x = 12;
    sticker.position.y = 0;
    sticker.rotation.z = Math.PI / 2;
    scene.add(sticker);
    stickers.push(sticker);

    scene.add(plane, cursor);

    domElement.current.appendChild(renderer.domElement);
    renderer.setAnimationLoop(update);

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', pointermove);
    resize();

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

      const width = window.innerWidth;
      const height = window.innerHeight;

      mouse.x = ( e.clientX / width ) * 2 - 1;
      mouse.y = - ( e.clientY / height ) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersections = raycaster.intersectObject(plane);

      if (intersections.length > 0) {

        cursor.position.copy(intersections[0].point);

        for (let i = 0; i < stickers.length; i++) {
          const sticker = stickers[i];
          const dx = cursor.position.x - sticker.position.x;
          const dy = cursor.position.y - sticker.position.y;
          const angle = Math.atan2(dy, dx);

          const distance = cursor.position.distanceTo(sticker.position);
          const x = distance * Math.cos(angle);
          const y = distance * Math.sin(angle);
          sticker.material.uniforms.cursor.value.set(x, y);
        }

      } else {
        cursor.position.set(-10, -10, 0);
      }
    }

    function resize() {

      const width = window.innerWidth;
      const height = window.innerHeight;

      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

    }

    function update() {
      renderer.render(scene, camera);
    }

  }

  return <div ref={ domElement } />;

}

root.render(<Prototype />);

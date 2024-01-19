import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import { Sticker } from "./sticker.js";
import GUI from "lil-gui";

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

    const gui = new GUI();
    const renderer = new THREE.WebGLRenderer({ antialias: true });
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

    camera.position.z = 2;

    const sticker = new Sticker();
    sticker.material.uniforms.cursor.value = mouse;
    sticker.material.uniforms.magnitude.value = 1;

    sticker.position.x = 0.5;
    sticker.position.y = 0.5;

    scene.add(sticker, plane, cursor);

    gui.add(sticker.material.uniforms.magnitude, 'value', 0, 1.5).name('magnitude');

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
      } else {
        cursor.position.set(-10, -10, 0);
      }

    }

    function resize() {

      const width = window.innerWidth;
      const height = window.innerHeight;

      renderer.setSize(width, height);

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

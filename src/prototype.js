import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import { Sticker } from "./sticker.js";
import GUI from "lil-gui";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

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
    const camera = new THREE.OrthographicCamera();
    const controls = new OrbitControls(camera, renderer.domElement);

    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = 0;
    renderer.domElement.style.left = 0;

    camera.position.z = -1;
    camera.rotation.y = Math.PI;

    const sticker = new Sticker();
    scene.add(sticker);

    gui.add(sticker.material.uniforms.magnitude, 'value', 0, 1.5).name('magnitude');
    gui.add(sticker.material.uniforms.cursor.value, 'x', -2, 2);
    gui.add(sticker.material.uniforms.cursor.value, 'y', -2, 2);

    domElement.current.appendChild(renderer.domElement);
    renderer.setAnimationLoop(update);
    window.addEventListener('resize', resize);
    resize();

    return unmount;

    function unmount() {

      renderer.setAnimationLoop(null);
      window.addEventListener('resize', resize);

      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement
          .removeChild(renderer.domElement);
      }
    }

    function resize() {

      const width = window.innerWidth;
      const height = window.innerHeight;
      const aspect = height / width;

      renderer.setSize(width, height);

      camera.top = - aspect / 2;
      camera.left = - 1 / 2;
      camera.right = 1 / 2;
      camera.bottom = aspect / 2;

      camera.updateProjectionMatrix();

      const scale = 155 / height;
      scene.scale.set(scale, scale, scale);
    }

    function update() {
      controls.update();
      renderer.render(scene, camera);
    }

  }

  return <div ref={ domElement } />;

}

root.render(<Prototype />);

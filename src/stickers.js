import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { Sticker } from "./sticker.js";

export default function App(props) {

  const domElement = useRef();

  useEffect(mount, []);

  function mount() {

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera();

    camera.position.z = -1;
    camera.rotation.y = Math.PI;

    for (let i = 0; i < 350; i++) {
      const sticker = new Sticker();
      sticker.position.x = 6 * (Math.random() - 0.5);
      sticker.position.y = 6 * (Math.random() - 0.5);
      sticker.rotation.z = Math.random() * Math.PI / 4 - Math.PI / 8;
      sticker.position.z = i;
      scene.add(sticker);
    }

    renderer.setClearAlpha(0);

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

      const scale = Sticker.height / height;
      scene.scale.set(scale, scale, scale);

      for (let i = 0; i < scene.children.length; i++) {
        const sticker = scene.children[i];
        sticker.position.x = (Math.random() - 0.5) / scale;
        sticker.position.y = aspect * (Math.random() - 0.5) / scale;
      }

    }

    function update() {

      renderer.render(scene, camera);

    }

  }

  return <div ref={ domElement } />;

}
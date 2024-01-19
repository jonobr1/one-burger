import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { Sticker } from "./sticker.js";

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-10, -10);

export default function App(props) {

  const domElement = useRef();

  useEffect(mount, []);

  function mount() {

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50, 250, 250),
      new THREE.MeshBasicMaterial({
        color: 'blue',
        wireframe: true,
        opacity: 0,
        transparent: true
      })
    );

    const cursor = new THREE.Mesh(
      new THREE.SphereGeometry(1, 1, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 'green'
      })
    );
    cursor.visible = false;
    cursor.scale.set(0.05, 0.05, 0.05);

    scene.add(cursor, plane);

    camera.position.z = 2;

    for (let i = 0; i < 350; i++) {
      const sticker = new Sticker();
      sticker.position.x = 6 * (Math.random() - 0.5);
      sticker.position.y = 6 * (Math.random() - 0.5);
      sticker.rotation.z = Math.random() * Math.PI / 3 - Math.PI / 6;
      sticker.material.uniforms.cursor.value = mouse;
      sticker.material.uniforms.magnitude.value = 1;
      sticker.renderOrder = i;
      scene.add(sticker);
    }

    renderer.setClearAlpha(0);

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

      const scale = Sticker.height / height;
      scene.scale.set(scale, scale, scale);

      for (let i = 0; i < scene.children.length; i++) {
        const sticker = scene.children[i];
        sticker.position.x = 10 * (Math.random() - 0.5);
        sticker.position.y = 10 * (Math.random() - 0.5);
      }

    }

    function update() {

      renderer.render(scene, camera);

    }

  }

  return <div ref={ domElement } />;

}
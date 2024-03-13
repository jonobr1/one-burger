import React, { useEffect, useRef, useState } from "react";
import * as TWEEN from "@tweenjs/tween.js";
import Two from "two.js";
import {
  Body,
  Bodies,
  Composite,
  Engine,
  Mouse,
  MouseConstraint,
  World
} from "matter-js";
import GUI from "lil-gui";

let STARTED = false;
let ANIMATING = false;

const TWO_PI = Math.PI * 2;

export default function Papers() {

  const domElement = useRef();

  const [pointer, setPointer] = useState({ x: - 10, y: - 10 });

  useEffect(mount, []);

  function mount() {

    const params = {
      amount: {
        value: navigator.maxTouchPoints > 0 ? 50 : 250,
        min: 0,
        max: 1000,
        setp: 5,
        name: 'Amount',
        onChange: setup
      },
      radius: {
        value: 10,
        min: 1,
        max: 100,
        step: 1,
        name: 'Cursor Radius',
        onChange: (size) => {
          Body.scale(cursor, 1 / cursor.circleRadius, 1 / cursor.circleRadius);
          Body.scale(cursor, size, size);
        }
      },
      frictionAir: {
        value: 0.01,
        min: 0,
        max: 1,
        step: 0.01,
        name: 'Air Resistance',
        onChange: (friction) => Composite.allBodies(solver.world).forEach((body) => (body.frictionAir = friction))
      },
      density: {
        value: 1,
        min: 0.1,
        max: 1,
        step: 0.1,
        name: 'Paper Density',
        onChange: (density) => Composite.allBodies(solver.world).forEach((body) => Body.setDensity(body, density))
      },
      friction: {
        value: 0.1,
        min: 0,
        max: 1,
        step: 0.1,
        name: 'Paper Friction',
        onChange: (friction) => Composite.allBodies(solver.world).forEach((body) => (body.friction = friction))
      },
      mass: {
        value: 1,
        min: 1,
        max: 50,
        step: 1,
        name: 'Paper Mass',
        onChange: (mass) => Composite.allBodies(solver.world).forEach((body) => Body.setMass(body, mass))
      },
      scale: {
        value: 0.33,
        min: 0.01,
        max: 1,
        step: 0.01,
        name: 'Paper Size',
        onChange: resize
      },
      reset: {
        value: reset,
        name: 'Reset'
      }
    };

    const $globe = document.body.querySelector('#globe');
    const two = new Two({
      type: Two.Types.canvas,
      fullscreen: true,
      autostart: true
    }).appendTo(domElement.current);

    const solver = Engine.create();
    solver.world.gravity.x = 0;
    solver.world.gravity.y = 0;

    const mouse = MouseConstraint.create(solver, {
      constraint: {
        stiffness: 0.33
      }
    });

    if (window.location.search.includes("debug")) {
      const gui = new GUI();
      for (let prop in params) {
        const obj = params[prop];
        const controller = gui.add(obj, 'value')
        if (typeof obj.min === 'number') {
          controller.min(obj.min);
        }
        if (typeof obj.max === 'number') {
          controller.max(obj.max);
        }
        if (typeof obj.step === 'number') {
          controller.step(obj.step);
        }
        if (typeof controller.onChange === 'function') {
          controller.onChange(obj.onChange);
        }
        controller.name(obj.name || prop);
      }
    }

    const cursor = Bodies.circle(0, 0, 1);
    Body.scale(cursor, params.radius.value, params.radius.value)

    const texture = new Two.Texture('images/texture-unwrapped.png', setup);
    texture.scale = params.scale.value;

    World.add(solver.world, [mouse, cursor]);

    two.bind('resize', resize)
       .bind('update', update);

    $globe.addEventListener('click', reset);
    window.addEventListener('pointermove', mousemove);

    return unmount;

    function unmount() {
      two.pause();
      if (domElement.current) {
        domElement.current.removeChild(two.renderer.domElement);
      }
      $globe.removeEventListener('click', reset);
      window.removeEventListener('pointermove', mousemove);
    }

    function setup() {

      for (let i = 0; i < two.scene.children.length; i++) {
        const child = two.scene.children[i];
        child.remove();
        World.remove(solver.world, child.entity);
      }

      for (let i = 0; i < params.amount.value; i++) {

        const x = Math.random() * two.width;
        const y = Math.random() * two.height;
        const width = texture.image.width * texture.scale;
        const height = texture.image.height * texture.scale;

        const path = new Two.Rectangle(x, y, width, height);
        path.rotation = Math.random() * TWO_PI;
        path.fill = texture;
        path.noStroke();

        const entity = Bodies.rectangle(x, y, 1, 1, {
          density: params.density.value,
          mass: params.mass.value,
          friction: params.friction.value,
          frictionAir: params.frictionAir.value,
          collisionFilter: {
            group: -1
          }
        });
        Body.scale(entity, path.width, path.height);
        Body.setAngle(entity, path.rotation);

        path.entity = entity;

        two.add(path);
        World.add(solver.world, entity);

      }

      document.body.style.opacity = 1;

    }

    function resize() {

      const pw = texture.image.width * texture.scale;
      const ph = texture.image.height * texture.scale;

      texture.scale = params.scale.value;

      const width = texture.image.width * texture.scale;
      const height = texture.image.height * texture.scale;

      for (let i = 0; i < two.scene.children.length; i++) {
        const child = two.scene.children[i];
        child.width = width;
        child.height = height;
        Body.scale(child.entity, 1 / pw, 1 / ph);
        Body.scale(child.entity, width, height);
      }
    }

    function update() {

      if (ANIMATING) {

        TWEEN.update();

      } else {

        mouse.mouse.button = 0;
        MouseConstraint.update(mouse, Composite.allBodies(solver.world));

        Engine.update(solver);

      }

      for (let i = 0; i < two.scene.children.length; i++) {
        const child = two.scene.children[i];
        if (child.entity) {
          child.position.copy(child.entity.position);
          child.rotation = child.entity.angle;
        }
      }

    }

    function reset() {

      if (ANIMATING) {
        return;
      }

      ANIMATING = true;

      Composite.allBodies(solver.world).forEach((body) => {

        const position = { x: body.position.x, y: body.position.y };
        const x = Math.random() * two.width;
        const y = Math.random() * two.height;

        const tween = new TWEEN.Tween(position)
          .to({ x, y }, 500)
          .easing(TWEEN.Easing.Sinusoidal.InOut)
          .onUpdate(() => {
            Body.setVelocity(body, { x: 0, y: 0 });
            Body.setPosition(body, position);
          })
          .onComplete(() => {
            ANIMATING = false;
          })
          .start();

      });

    }

    function mousemove({ clientX, clientY }) {
      const position = { x: clientX, y: clientY };
      if (!STARTED) {
        Body.setPosition(cursor, position);
        STARTED = true;
      }
      setPointer(position);
    }

  }

  return (
    <div className="interactive">
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
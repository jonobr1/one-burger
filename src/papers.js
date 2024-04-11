import React, { useEffect, useRef, useState } from 'react';
import * as TWEEN from '@tweenjs/tween.js';
import Two from 'two.js';
import {
  Body,
  Bodies,
  Composite,
  Engine,
  MouseConstraint,
  World,
} from 'matter-js';
import GUI from 'lil-gui';

let STARTED = false;
let ANIMATING = false;

const TWO_PI = Math.PI * 2;
const touch = { x: -10, y: -10 };

export default function Papers() {
  const domElement = useRef();

  const [pointer, setPointer] = useState({ x: -10, y: -10 });
  const [isMobile, setIsMobile] = useState(navigator.maxTouchPoints > 0);

  useEffect(mount, []);

  function mount() {
    const params = {
      amount: {
        value: navigator.maxTouchPoints > 0 ? 50 : 250,
        min: 0,
        max: 1000,
        step: 5,
        name: 'Amount',
        onChange: setup,
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
          Body.setMass(cursor, 1);
        },
      },
      frictionAir: {
        value: 0.01,
        min: 0,
        max: 1,
        step: 0.01,
        name: 'Air Resistance',
        onChange: (friction) => {
          Composite.allBodies(solver.world).forEach((body) => {
            body.frictionAir = friction;
          });
        },
      },
      density: {
        value: 1,
        min: 0.1,
        max: 2,
        step: 0.01,
        name: 'Paper Density',
        onChange: (density) => {
          Composite.allBodies(solver.world).forEach((body) => {
            Body.setDensity(body, density);
          });
        },
      },
      friction: {
        value: 0.1,
        min: 0,
        max: 1,
        step: 0.1,
        name: 'Paper Friction',
        onChange: (friction) => {
          Composite.allBodies(solver.world).forEach((body) => {
            body.friction = friction;
          });
        },
      },
      mass: {
        value: 0.35,
        min: 0.0001,
        max: 1,
        step: 0.0001,
        name: 'Paper Mass',
        onChange: (mass) => {
          Composite.allBodies(solver.world).forEach((body) => {
            if (body.label.includes('Rectangle')) {
              Body.setMass(body, Math.pow(mass, 8) * body.userData.mass);
            }
          });
        },
      },
      scale: {
        value: 0.33,
        min: 0.01,
        max: 1,
        step: 0.01,
        name: 'Paper Size',
        onChange: resize,
      },
      stiffness: {
        value: 0.33,
        min: 0,
        max: 1,
        step: 0.001,
        name: 'Mouse Stiffness',
        onChange: (stiffness) => (mouse.constraint.stiffness = stiffness),
      },
      reset: {
        value: reset,
        name: 'Reset',
      },
    };

    const $globe = document.body.querySelector('#globe');
    const two = new Two({
      type: Two.Types.webgl,
      fullscreen: true,
      autostart: true,
    }).appendTo(domElement.current);

    const solver = Engine.create();
    solver.world.gravity.x = 0;
    solver.world.gravity.y = 0;

    const mouse = MouseConstraint.create(solver, {
      constraint: {
        stiffness: params.stiffness.value,
      },
    });

    if (window.location.search.includes('debug')) {
      const gui = new GUI();
      for (let prop in params) {
        const obj = params[prop];
        const controller = gui.add(obj, 'value');
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
    Body.scale(cursor, params.radius.value, params.radius.value);
    Body.setMass(cursor, 1);
    cursor.userData = { mass: cursor.mass };

    const texture = new Two.Texture('images/texture-unwrapped.png', setup);
    texture.scale = params.scale.value;

    World.add(solver.world, cursor);

    two.bind('resize', resize).bind('update', update);

    $globe.addEventListener('click', reset);
    $globe.addEventListener('touchstart', touchglobe);
    $globe.addEventListener('touchend', releaseglobe);
    document.body.addEventListener('pointermove', mousemove);

    return unmount;

    function unmount() {
      two.pause();
      if (domElement.current) {
        domElement.current.removeChild(two.renderer.domElement);
      }
      $globe.removeEventListener('click', reset);
      $globe.removeEventListener('touchstart', touchglobe);
      $globe.removeEventListener('touchend', releaseglobe);
      document.body.removeEventListener('pointermove', mousemove);
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
            group: -1,
          },
        });
        Body.scale(entity, path.width, path.height);
        Body.setAngle(entity, path.rotation);

        path.entity = entity;
        path.entity.userData = {
          mass: entity.mass,
        };

        two.add(path);
        World.add(solver.world, entity);
      }

      document.body.style.opacity = 1;
    }

    function resize() {
      setIsMobile(() => {
        const isMobile = navigator.maxTouchPoints > 0;
        params.value = isMobile ? 50 : 250;
        requestAnimationFrame(setup);
        return isMobile;
      });

      const pw = texture.image.width * texture.scale;
      const ph = texture.image.height * texture.scale;

      texture.scale = params.scale.value;

      const width = texture.image.width * texture.scale;
      const height = texture.image.height * texture.scale;

      for (let i = 0; i < two.scene.children.length; i++) {
        const child = two.scene.children[i];
        const mass = child.entity.userData.mass * params.mass.value;
        child.width = width;
        child.height = height;
        Body.scale(child.entity, 1 / pw, 1 / ph);
        Body.scale(child.entity, width, height);
        Body.setMass(child.entity, mass);
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
      STARTED = false;

      World.remove(solver.world, mouse);

      const velocity = { x: 0, y: 0 };
      Composite.allBodies(solver.world).forEach((body) => {
        let position = {
          x: body.position.x,
          y: body.position.y,
        };

        switch (body.label) {
          case 'Circle Label':
            // This is the mouse
            position.x = -1000;
            position.y = -1000;
            Body.setPosition(body, position);
            Body.setVelocity(body, velocity);
            break;
          case 'Rectangle Label':
          default:
            // These are the rigid body stickers
            const x = Math.random() * two.width;
            const y = Math.random() * two.height;

            new TWEEN.Tween(position)
              .to({ x, y }, 500)
              .easing(TWEEN.Easing.Sinusoidal.InOut)
              .onUpdate(() => {
                Body.setPosition(body, position);
                Body.setVelocity(body, velocity);
              })
              .onComplete(() => {
                ANIMATING = false;
              })
              .start();
        }
      });
    }

    function mousemove({ clientX, clientY }) {
      const position = { x: clientX, y: clientY };
      if (!STARTED) {
        Body.setPosition(cursor, position);
        Body.setVelocity(cursor, { x: 0, y: 0 });
        World.add(solver.world, mouse);
        STARTED = true;
      }
      setPointer(position);
    }

    function touchglobe(e) {
      if (e.touches.length > 0) {
        touch.x = e.touches[0].clientX;
        touch.y = e.touches[0].clientY;
      }
    }
    function releaseglobe(e) {
      if (e.changedTouches.length > 0) {
        const dx = e.changedTouches[0].clientX - touch.x;
        const dy = e.changedTouches[0].clientY - touch.y;
        const dist = dx * dx + dy * dy;
        if (dist < 90) {
          $globe.click(e);
        }
      }
    }
  }

  return (
    <div className="interactive">
      <div ref={domElement} />
      <div id="contact">
        <a href="mailto:buns@oneburger.com">
          Contact → <span className="mail" />
        </a>
      </div>
      <div
        id="cursor"
        style={{
          top: pointer.y,
          left: pointer.x,
          display: isMobile ? 'none' : 'block',
        }}
      />
    </div>
  );
}

import React, { useEffect, useRef, useState } from "react";
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

export default function Papers() {

  const domElement = useRef();

  const [pointer, setPointer] = useState({ x: - 10, y: - 10 });

  useEffect(mount, []);

  function mount() {

    const params = {
      amount: 100
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

    Mouse.create(domElement.current);
    const mouse = MouseConstraint.create(solver, {
      mouse: Mouse.create(two.renderer.domElement),
      constraint: {
        stiffness: 0.1
      }
    });

    setup();

    World.add(solver.world, mouse);

    two.bind('resize', resize)
       .bind('update', update);

    $globe.addEventListener('click', reset);

    document.body.style.opacity = 1

    return unmount;

    function unmount() {
      two.pause();
      if (domElement.current) {
        domElement.current.removeChild(two.renderer.domElement);
      }
      $globe.addEventListener('click', reset);
    }

    function setup() {

      for (let i = 0; i < params.amount; i++) {

        const x = Math.random() * two.width;
        const y = Math.random() * two.height;

        const path = new Two.Rectangle(x, y, 50, 50);
        path.fill = '#00aeff';
        path.noStroke();

        const entity = Bodies.rectangle(x, y, 1, 1);
        Body.scale(entity, path.width, path.height);

        path.entity = entity;

        two.add(path);
        World.add(solver.world, [entity]);

      }

    }

    function resize() {

    }

    function update() {

      setPointer({
        x: mouse.mouse.position.x,
        y: mouse.mouse.position.y
      });

      const bodies = Composite.allBodies(solver.world);
      MouseConstraint.update(mouse, bodies);
      MouseConstraint._triggerEvents(mouse);

      Engine.update(solver);

      for (let i = 0; i < two.scene.children.length; i++) {
        const child = two.scene.children[i];
        if (child.entity) {
          child.position.copy(child.entity.position);
          child.rotation = child.entity.angle;
        }
      }

    }

    function reset() {

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
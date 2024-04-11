import {
  Vertices,
  Sleeping,
  Events,
  Detector,
  Constraint,
  Composite,
  Common,
  Bounds,
} from 'matter-js';

const MouseConstraint = {};
const Mouse = {};

/**
 * Creates a new mouse constraint.
 * All properties have default values, and many are pre-calculated automatically based on other properties.
 * See the properties section below for detailed information on what you can pass via the `options` object.
 * @method create
 * @param {engine} engine
 * @param {} options
 * @return {MouseConstraint} A new MouseConstraint
 */
MouseConstraint.create = function (engine, options) {
  var mouse =
    (engine ? engine.mouse : null) || (options ? options.mouse : null);

  if (!mouse) {
    if (engine && engine.render && engine.render.canvas) {
      mouse = Mouse.create(engine.render.canvas);
    } else if (options && options.element) {
      mouse = Mouse.create(options.element);
    } else {
      mouse = Mouse.create();
      Common.warn(
        'MouseConstraint.create: options.mouse was undefined, options.element was undefined, may not function as expected'
      );
    }
  }

  var constraint = Constraint.create({
    label: 'Mouse Constraint',
    pointA: mouse.position,
    pointB: { x: 0, y: 0 },
    length: 0.01,
    stiffness: 0.1,
    angularStiffness: 1,
    render: {
      strokeStyle: '#90EE90',
      lineWidth: 3,
    },
  });

  var defaults = {
    type: 'mouseConstraint',
    mouse: mouse,
    element: null,
    body: null,
    constraint: constraint,
    collisionFilter: {
      category: 0x0001,
      mask: 0xffffffff,
      group: 0,
    },
  };

  var mouseConstraint = Common.extend(defaults, options);

  Events.on(engine, 'beforeUpdate', function () {
    var allBodies = Composite.allBodies(engine.world);
    MouseConstraint.update(mouseConstraint, allBodies);
    MouseConstraint._triggerEvents(mouseConstraint);
  });

  return mouseConstraint;
};

/**
 * Updates the given mouse constraint.
 * @private
 * @method update
 * @param {MouseConstraint} mouseConstraint
 * @param {body[]} bodies
 */
MouseConstraint.update = function (mouseConstraint, bodies) {
  var mouse = mouseConstraint.mouse,
    constraint = mouseConstraint.constraint,
    body = mouseConstraint.body;

  if (mouse.button === 0) {
    if (!constraint.bodyB) {
      for (var i = 0; i < bodies.length; i++) {
        body = bodies[i];
        if (
          Bounds.contains(body.bounds, mouse.position) &&
          Detector.canCollide(
            body.collisionFilter,
            mouseConstraint.collisionFilter
          )
        ) {
          for (
            var j = body.parts.length > 1 ? 1 : 0;
            j < body.parts.length;
            j++
          ) {
            var part = body.parts[j];
            if (Vertices.contains(part.vertices, mouse.position)) {
              constraint.pointA = mouse.position;
              constraint.bodyB = mouseConstraint.body = body;
              constraint.pointB = {
                x: mouse.position.x - body.position.x,
                y: mouse.position.y - body.position.y,
              };
              constraint.angleB = body.angle;

              Sleeping.set(body, false);
              Events.trigger(mouseConstraint, 'startdrag', {
                mouse: mouse,
                body: body,
              });

              break;
            }
          }
        }
      }
    } else {
      Sleeping.set(constraint.bodyB, false);
      constraint.pointA = mouse.position;
    }
  } else {
    constraint.bodyB = mouseConstraint.body = null;
    constraint.pointB = null;

    if (body)
      Events.trigger(mouseConstraint, 'enddrag', {
        mouse: mouse,
        body: body,
      });
  }
};

/**
 * Triggers mouse constraint events.
 * @method _triggerEvents
 * @private
 * @param {mouse} mouseConstraint
 */
MouseConstraint._triggerEvents = function (mouseConstraint) {
  var mouse = mouseConstraint.mouse,
    mouseEvents = mouse.sourceEvents;

  if (mouseEvents.mousemove)
    Events.trigger(mouseConstraint, 'mousemove', { mouse: mouse });

  if (mouseEvents.mousedown)
    Events.trigger(mouseConstraint, 'mousedown', { mouse: mouse });

  if (mouseEvents.mouseup)
    Events.trigger(mouseConstraint, 'mouseup', { mouse: mouse });

  // reset the mouse state ready for the next step
  Mouse.clearSourceEvents(mouse);
};

/*
 *
 *  Events Documentation
 *
 */

/**
 * Fired when the mouse has moved (or a touch moves) during the last step
 *
 * @event mousemove
 * @param {} event An event object
 * @param {mouse} event.mouse The engine's mouse instance
 * @param {} event.source The source object of the event
 * @param {} event.name The name of the event
 */

/**
 * Fired when the mouse is down (or a touch has started) during the last step
 *
 * @event mousedown
 * @param {} event An event object
 * @param {mouse} event.mouse The engine's mouse instance
 * @param {} event.source The source object of the event
 * @param {} event.name The name of the event
 */

/**
 * Fired when the mouse is up (or a touch has ended) during the last step
 *
 * @event mouseup
 * @param {} event An event object
 * @param {mouse} event.mouse The engine's mouse instance
 * @param {} event.source The source object of the event
 * @param {} event.name The name of the event
 */

/**
 * Fired when the user starts dragging a body
 *
 * @event startdrag
 * @param {} event An event object
 * @param {mouse} event.mouse The engine's mouse instance
 * @param {body} event.body The body being dragged
 * @param {} event.source The source object of the event
 * @param {} event.name The name of the event
 */

/**
 * Fired when the user ends dragging a body
 *
 * @event enddrag
 * @param {} event An event object
 * @param {mouse} event.mouse The engine's mouse instance
 * @param {body} event.body The body that has stopped being dragged
 * @param {} event.source The source object of the event
 * @param {} event.name The name of the event
 */

/*
 *
 *  Properties Documentation
 *
 */

/**
 * A `String` denoting the type of object.
 *
 * @property type
 * @type string
 * @default "constraint"
 * @readOnly
 */

/**
 * The `Mouse` instance in use. If not supplied in `MouseConstraint.create`, one will be created.
 *
 * @property mouse
 * @type mouse
 * @default mouse
 */

/**
 * The `Body` that is currently being moved by the user, or `null` if no body.
 *
 * @property body
 * @type body
 * @default null
 */

/**
 * The `Constraint` object that is used to move the body during interaction.
 *
 * @property constraint
 * @type constraint
 */

/**
 * An `Object` that specifies the collision filter properties.
 * The collision filter allows the user to define which types of body this mouse constraint can interact with.
 * See `body.collisionFilter` for more information.
 *
 * @property collisionFilter
 * @type object
 */

//

/**
 * Creates a mouse input.
 * @method create
 * @param {HTMLElement} element
 * @return {mouse} A new mouse
 */
Mouse.create = function (element) {
  var mouse = {};

  if (!element) {
    Common.log(
      'Mouse.create: element was undefined, defaulting to document.body',
      'warn'
    );
  }

  mouse.element = element || document.body;
  mouse.absolute = { x: 0, y: 0 };
  mouse.position = { x: 0, y: 0 };
  mouse.mousedownPosition = { x: 0, y: 0 };
  mouse.mouseupPosition = { x: 0, y: 0 };
  mouse.offset = { x: 0, y: 0 };
  mouse.scale = { x: 1, y: 1 };
  mouse.wheelDelta = 0;
  mouse.button = -1;
  mouse.pixelRatio =
    parseInt(mouse.element.getAttribute('data-pixel-ratio'), 10) || 1;

  mouse.sourceEvents = {
    mousemove: null,
    mousedown: null,
    mouseup: null,
    mousewheel: null,
  };

  mouse.mousemove = function (event) {
    var position = Mouse._getRelativeMousePosition(
        event,
        mouse.element,
        mouse.pixelRatio
      ),
      touches = event.changedTouches;

    if (touches) {
      mouse.button = 0;
      event.preventDefault();
    }

    mouse.absolute.x = position.x;
    mouse.absolute.y = position.y;
    mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
    mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
    mouse.sourceEvents.mousemove = event;
  };

  mouse.mousedown = function (event) {
    var position = Mouse._getRelativeMousePosition(
        event,
        mouse.element,
        mouse.pixelRatio
      ),
      touches = event.changedTouches;

    if (touches) {
      mouse.button = 0;
      // event.preventDefault();
    } else {
      mouse.button = event.button;
    }

    mouse.absolute.x = position.x;
    mouse.absolute.y = position.y;
    mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
    mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
    mouse.mousedownPosition.x = mouse.position.x;
    mouse.mousedownPosition.y = mouse.position.y;
    mouse.sourceEvents.mousedown = event;
  };

  mouse.mouseup = function (event) {
    var position = Mouse._getRelativeMousePosition(
        event,
        mouse.element,
        mouse.pixelRatio
      ),
      touches = event.changedTouches;

    if (touches) {
      // event.preventDefault();
    }

    mouse.button = -1;
    mouse.absolute.x = position.x;
    mouse.absolute.y = position.y;
    mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
    mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
    mouse.mouseupPosition.x = mouse.position.x;
    mouse.mouseupPosition.y = mouse.position.y;
    mouse.sourceEvents.mouseup = event;
  };

  mouse.mousewheel = function (event) {
    mouse.wheelDelta = Math.max(
      -1,
      Math.min(1, event.wheelDelta || -event.detail)
    );
    event.preventDefault();
  };

  Mouse.setElement(mouse, mouse.element);

  return mouse;
};

/**
 * Sets the element the mouse is bound to (and relative to).
 * @method setElement
 * @param {mouse} mouse
 * @param {HTMLElement} element
 */
Mouse.setElement = function (mouse, element) {
  mouse.element = element;

  const passive = { passive: true };
  const active = { passive: false };

  element.removeEventListener('pointermove', mouse.mousemove, passive);
  element.removeEventListener('pointerdown', mouse.mousedown, passive);
  element.removeEventListener('pointerup', mouse.mouseup, passive);
  element.removeEventListener('touchmove', mouse.mousemove, active);
  element.removeEventListener('touchstart', mouse.mousedown, active);
  element.removeEventListener('touchend', mouse.mouseup, active);
  element.removeEventListener('mousewheel', mouse.mousewheel, active);
  element.removeEventListener('DOMMouseScroll', mouse.mousewheel, active);

  if (navigator.maxTouchPoints <= 0) {
    element.addEventListener('pointermove', mouse.mousemove, passive);
    element.addEventListener('pointerdown', mouse.mousedown, passive);
    element.addEventListener('pointerup', mouse.mouseup, passive);
  } else {
    element.addEventListener('touchmove', mouse.mousemove, active);
    // element.addEventListener('touchstart', mouse.mousedown, active);
    // element.addEventListener('touchend', mouse.mouseup, active);
  }

  element.addEventListener('mousewheel', mouse.mousewheel, active);
  element.addEventListener('DOMMouseScroll', mouse.mousewheel, {
    passive: false,
  });
};

/**
 * Clears all captured source events.
 * @method clearSourceEvents
 * @param {mouse} mouse
 */
Mouse.clearSourceEvents = function (mouse) {
  mouse.sourceEvents.mousemove = null;
  mouse.sourceEvents.mousedown = null;
  mouse.sourceEvents.mouseup = null;
  mouse.sourceEvents.mousewheel = null;
  mouse.wheelDelta = 0;
};

/**
 * Sets the mouse position offset.
 * @method setOffset
 * @param {mouse} mouse
 * @param {vector} offset
 */
Mouse.setOffset = function (mouse, offset) {
  mouse.offset.x = offset.x;
  mouse.offset.y = offset.y;
  mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
  mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
};

/**
 * Sets the mouse position scale.
 * @method setScale
 * @param {mouse} mouse
 * @param {vector} scale
 */
Mouse.setScale = function (mouse, scale) {
  mouse.scale.x = scale.x;
  mouse.scale.y = scale.y;
  mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
  mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
};

/**
 * Gets the mouse position relative to an element given a screen pixel ratio.
 * @method _getRelativeMousePosition
 * @private
 * @param {} event
 * @param {} element
 * @param {number} pixelRatio
 * @return {}
 */
Mouse._getRelativeMousePosition = function (event, element, pixelRatio) {
  var elementBounds = element.getBoundingClientRect(),
    rootNode =
      document.documentElement || document.body.parentNode || document.body,
    scrollX =
      window.pageXOffset !== undefined
        ? window.pageXOffset
        : rootNode.scrollLeft,
    scrollY =
      window.pageYOffset !== undefined
        ? window.pageYOffset
        : rootNode.scrollTop,
    touches = event.changedTouches,
    x,
    y;

  if (touches) {
    x = touches[0].pageX - elementBounds.left - scrollX;
    y = touches[0].pageY - elementBounds.top - scrollY;
  } else {
    x = event.pageX - elementBounds.left - scrollX;
    y = event.pageY - elementBounds.top - scrollY;
  }

  return {
    x:
      x /
      ((element.clientWidth / (element.width || element.clientWidth)) *
        pixelRatio),
    y:
      y /
      ((element.clientHeight / (element.height || element.clientHeight)) *
        pixelRatio),
  };
};

export { Mouse, MouseConstraint };

import React from "react";
import { createRoot } from "react-dom/client";

const domElement = document.createElement('div');
const root = createRoot(domElement);

domElement.id = 'react';
document.body.appendChild(domElement);

root.render(
  <h1>
    Hello world
  </h1>
);

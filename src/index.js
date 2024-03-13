import React from "react";
import { createRoot } from "react-dom/client";
import Papers from "./papers.js";

const domElement = document.createElement('div');
const root = createRoot(domElement);

domElement.id = 'react';
document.body.appendChild(domElement);

root.render(<Papers />);

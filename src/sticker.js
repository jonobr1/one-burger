import * as THREE from "three";

const STICKER_WIDTH = 340;
const STICKER_HEIGHT = 155;
const aspect = STICKER_HEIGHT / STICKER_WIDTH;

const texture = new THREE.TextureLoader().load('images/texture.jpg')
const geometry = new THREE.PlaneGeometry(1, aspect, 1, 1);
const material = new THREE.ShaderMaterial({
  uniforms: {
    map: { value: texture }
  },
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragmentShader: `
    uniform sampler2D map;

    varying vec2 vUv;

    void main() {
      vec4 texel = texture2D( map, vUv );
      gl_FragColor = texel;
    }
  `
});

texture.magFilter = texture.minFilter = THREE.LinearFilter;
geometry.rotateZ(Math.PI);

export class Sticker extends THREE.Mesh {

  constructor() {

    super(geometry, material.clone());

  }

  static width = STICKER_WIDTH;
  static height = STICKER_HEIGHT;

}
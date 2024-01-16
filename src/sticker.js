import * as THREE from "three";

const STICKER_WIDTH = 340;
const STICKER_HEIGHT = 155;
const aspect = STICKER_HEIGHT / STICKER_WIDTH;

const texture = new THREE.TextureLoader().load('images/texture.jpg')
const geometry = new THREE.PlaneGeometry(1, aspect, 64, 64);
const material = new THREE.ShaderMaterial({
  uniforms: {
    map: { value: texture },
    fold: { value: 0 }
  },
  vertexShader: `
    const float PI = ${Math.PI};
    uniform float fold;

    varying vec2 vUv;

    void main() {
      vUv = uv;

      float isRight = step( 1.0, uv.x );
      float isTop = step( 1.0, uv.y );
      float applies = isTop * isRight;

      float theta = atan( position.y / position.x );
      float dist = length( position );

      vec3 pos = vec3( position );
      // pos.x += cos( smoothstep( 0.5, 1.0, uv.x ) * PI ) * fold;
      pos.z += sin( smoothstep( 0.5, 1.0, uv.x ) * PI * 0.5 ) * fold;

      gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0 );
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
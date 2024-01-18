import * as THREE from "three";

const STICKER_WIDTH = 340;
const STICKER_HEIGHT = 155;
const aspect = STICKER_HEIGHT / STICKER_WIDTH;

const texture = new THREE.TextureLoader().load('images/texture.jpg')
const geometry = new THREE.PlaneGeometry(1, aspect, 64, 64);

texture.magFilter = texture.minFilter = THREE.LinearFilter;
geometry.rotateZ(Math.PI);

export class Sticker extends THREE.Mesh {

  constructor() {

    const material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        magnitude: { value: 0 },
        cursor: { value: new THREE.Vector2(-1, 1) }
      },
      vertexShader: `
        const float PI = ${Math.PI};
        const float aspect = ${aspect};
    
        uniform float magnitude;
        uniform vec2 cursor;
    
        varying vec2 vUv;
    
        void main() {
    
          vUv = uv;
    
          vec3 pos = vec3( position );
          vec2 cur = vec2( cursor.x, cursor.y * aspect );
    
          float angle = atan( - cur.y, - cur.x );
          float dist = 1.0 - smoothstep( 0.0, 1.0, distance( position.xy, cur ) );
    
          pos.x += magnitude * dist * cos( angle );
          pos.y += magnitude * dist * sin( angle );
          pos.z -= dist * 0.1;
    
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
      `,
      side: THREE.DoubleSide
    });

    super(geometry, material.clone());

  }

  static width = STICKER_WIDTH;
  static height = STICKER_HEIGHT;

}
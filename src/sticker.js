import * as THREE from "three";

const STICKER_WIDTH = 340;
const STICKER_HEIGHT = 155;
const aspect = STICKER_HEIGHT / STICKER_WIDTH;

const cursor = new THREE.Vector2(-10, -10);
const texture = new THREE.TextureLoader().load('images/texture.jpg')
const geometry = new THREE.PlaneGeometry(1, aspect, 64, 64);

texture.magFilter = texture.minFilter = THREE.LinearFilter;

export class Sticker extends THREE.Mesh {

  constructor() {

    const material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        magnitude: { value: 0 },
        cursor: { value: cursor }
      },
      vertexShader: `
        const float PI = ${Math.PI};
    
        uniform float magnitude;
        uniform vec2 cursor;
    
        varying vec2 vUv;
    
        void main() {
    
          vUv = uv;
    
          vec4 pmv = modelViewMatrix * vec4( position, 1.0 );
          vec3 pos = vec3( position );
          vec4 cur = vec4( cursor, 1.0, 1.0 ) * inverse( modelViewMatrix );
    
          float angle = atan( - cursor.y, - cursor.x );
          float d = pow( smoothstep( 0.0, 1.0, length( cur.xy ) ), 0.5 );
          float l = 1.5 * length( cursor.xy - pmv.xy );
          float dist = 1.0 - smoothstep( 0.0, 1.0, l );

          pos.x += magnitude * d * dist * cos( angle );
          pos.y += magnitude * d * dist * sin( angle );
          pos.z += dist * 0.1;
    
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

    super(geometry, material);

  }

  static width = STICKER_WIDTH;
  static height = STICKER_HEIGHT;

}
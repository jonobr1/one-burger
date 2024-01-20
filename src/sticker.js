import * as THREE from "three";

const STICKER_WIDTH = 340;
const STICKER_HEIGHT = 155;
const aspect = STICKER_HEIGHT / STICKER_WIDTH;

const texture = new THREE.TextureLoader().load('images/texture.jpg')
const geometry = new THREE.PlaneGeometry(1, aspect, 64, 64);

texture.magFilter = texture.minFilter = THREE.LinearFilter;

export class Sticker extends THREE.Mesh {

  constructor() {

    const material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        magnitude: { value: 0 },
        cursor: { value: new THREE.Vector2(-10, -10) }
      },
      vertexShader: `
        const float PI = ${Math.PI.toFixed(3)};
        const float aspect = ${aspect};
        const float cap = 0.7;
    
        uniform float magnitude;
        uniform vec2 cursor;
    
        varying vec2 vUv;

        vec2 pointToSegment( vec2 p, vec2 s1, vec2 s2 ) {
    
          float sd = distance( s1, s2 );
          vec2 pg = p - s1;
          vec2 sg = s2 - s1;
          float t = ( pg.x * sg.x + pg.y * sg.y ) / pow( sd, 2.0 );

          return s1 + t * sg;

        }
    
        void main() {
    
          vUv = uv;
    
          vec4 center = modelViewMatrix * vec4( vec3( 0.0 ), 1.0 );
          vec4 pmv = modelViewMatrix * vec4( position, 1.0 );
          vec4 pos = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    
          float r = 10.0;
          float toCenter = length( center.xy - cursor.xy );
          float angle = atan( center.y - cursor.y, center.x - cursor.x );

          vec2 cur = vec2( center.xy );
          cur.x += max( cap, toCenter ) * cos( angle + PI );
          cur.y += max( cap * aspect, toCenter ) * sin( angle + PI );

          float aa = angle + PI * 0.5;
          float ab = angle - PI * 0.5;
          vec2 s1 = vec2( r * cos( aa ), r * sin( aa ) ) + cur.xy;
          vec2 s2 = vec2( r * cos( ab ), r * sin( ab ) ) + cur.xy;
          vec2 intersect = pointToSegment( pmv.xy, s1, s2 );

          float l = 1.5 * length( intersect - pmv.xy );
          float dist = 1.0 - smoothstep( 0.0, 1.0, l );

          pos.x += magnitude * dist * cos( angle );
          pos.y += magnitude * dist * sin( angle );
          // pos.z -= magnitude * dist * 0.01;
    
          gl_Position = pos;
    
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
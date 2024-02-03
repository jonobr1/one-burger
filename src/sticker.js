import * as THREE from "three";

const STICKER_WIDTH = 340;
const STICKER_HEIGHT = 155;
const aspect = STICKER_HEIGHT / STICKER_WIDTH;

const texture = new THREE.TextureLoader().load('images/texture.jpg');
const geometry = new THREE.PlaneGeometry(1, aspect, 32, 32);

texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
texture.flipY = false;

export class Sticker extends THREE.Mesh {

  constructor() {

    const material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        magnitude: { value: 1 },
        // A vec2 of where the cursor is in relation
        // to the center of the object.
        cursor: { value: new THREE.Vector2(-10, -10) },
        origin: { value: new THREE.Vector2(0, 0) },
        is3D: { value: false },
        hasShadows: { value: false },
        opacity: { value: 1 }
      },
      vertexShader: `
        const float PI = ${Math.PI.toFixed(3)};
        const float aspect = ${aspect};
        const vec2 cap = vec2( 0.75, 0.5 );
    
        uniform float magnitude;
        uniform vec2 cursor;
        uniform vec2 origin;
        uniform float is3D;
        uniform float hasShadows;
    
        varying vec2 vUv;
        varying float vShadow;
        varying float vIsFrontSide;

        vec2 pointToSegment( vec2 p, vec2 s1, vec2 s2 ) {
    
          float sd = distance( s1, s2 );
          vec2 pg = p - s1;
          vec2 sg = s2 - s1;
          float t = ( pg.x * sg.x + pg.y * sg.y ) / pow( sd, 2.0 );

          return s1 + t * sg;

        }
    
        void main() {
    
          vUv = uv;
    
          vec4 center = modelMatrix * vec4( origin, 0.0, 1.0 );
          vec4 pmv = modelMatrix * vec4( position, 1.0 );
          vec4 pos = modelMatrix * vec4( position, 1.0 );
          vec4 cmv = modelMatrix * vec4( cursor, 0.0, 1.0 );
    
          float r = 10.0;
          float toCenter = 2.0 * distance( center.xy, cmv.xy );
          float angle = atan( origin.y - cursor.y, origin.x - cursor.x );

          vec2 cur = vec2( center.xy );
          cur.x += max( 0.5, toCenter ) * cos( angle + PI );
          cur.y += max( 0.5, toCenter ) * sin( angle + PI );

          float aa = angle + PI * 0.5;
          float ab = angle - PI * 0.5;
          vec2 s1 = vec2( r * cos( aa ), r * sin( aa ) ) + cur.xy;
          vec2 s2 = vec2( r * cos( ab ), r * sin( ab ) ) + cur.xy;
          vec2 intersect = pointToSegment( pmv.xy, s1, s2 );

          float diff = 1.5 * distance( intersect, pmv.xy );
          float dist = 1.0 - smoothstep( 0.0, 1.0, diff );
          float fold = dist * 0.01;

          float x = magnitude * dist * cos( angle );
          float y = magnitude * dist * sin( angle );
          float z = magnitude * fold * step( 0.5, is3D );

          pos.x += x;
          pos.y += y;
          pos.z += z;

          vShadow = 1.0 - diff / 1.5;
          vIsFrontSide = 1.0 - smoothstep( 0.0, 0.2, dist );

          gl_Position = projectionMatrix * viewMatrix * pos;
    
        }
      `,
      fragmentShader: `
        const float PI = ${Math.PI};
        const float aspect = ${aspect};

        uniform sampler2D map;
        uniform float magnitude;
        uniform float hasShadows;
        uniform float opacity;
    
        varying vec2 vUv;
        varying float vShadow;
        varying float vIsFrontSide;
    
        void main() {

          vec4 black = vec4( vec3( 0.0 ), 1.0 );
          vec4 texel = texture2D( map, vUv );
    
          gl_FragColor = vec4( mix( texel.rgb, black.rgb,
            0.33 * magnitude * vIsFrontSide * vShadow * hasShadows ), opacity );

        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
      depthTest: true
    });

    super(geometry, material);

    this.userData.cursor = new THREE.Vector2(-10, -10);
    this.userData.folding = false;
    this.userData.cap = { value: 1 };

  }

  fold() {
  
    const folding = this.material.depthTest;

    if (!folding || !this.visible) {
      return;
    }

    const { cap, cursor } = this.userData;
    const dx = cursor.x - this.position.x;
    const dy = cursor.y - this.position.y;
    const angle = Math.atan2(dy, dx);

    const distance = Math.max(cursor.distanceTo(this.position), cap.value);
    const p = this.material.uniforms.cursor.value;

    p.x = distance * Math.cos(angle);
    p.y = distance * Math.sin(angle);

    return this;

  }

  static width = STICKER_WIDTH;
  static height = STICKER_HEIGHT;
  static aspect = aspect;

  static Texture = texture;

}
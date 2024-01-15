import * as THREE from "three";

const STICKER_WIDTH = 340;
const STICKER_HEIGHT = 155;
const aspect = STICKER_HEIGHT / STICKER_WIDTH;

const geometry = new THREE.PlaneGeometry(1, aspect, 1, 1);
const white = new THREE.MeshBasicMaterial();
const material = new THREE.MeshBasicMaterial({
  map: new THREE.TextureLoader().load('images/texture.jpg'),
  // color: '#ff1400',
  // transparent: true
});

material.map.magFilter = material.map.minFilter = THREE.LinearFilter;
// THREE.LinearMipMapNearestFilter
geometry.rotateZ(Math.PI);

export class Sticker extends THREE.Group {

  constructor() {

    super();

    this.add(
      new THREE.Mesh(geometry, white),
      new THREE.Mesh(geometry, material)
    );

  }

  static width = STICKER_WIDTH;
  static height = STICKER_HEIGHT;

}
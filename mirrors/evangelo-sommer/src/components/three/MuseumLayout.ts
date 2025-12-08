import * as THREE from "three";

export class MuseumLayout {
  private wallMaterial: THREE.MeshStandardMaterial;
  private floorMaterial: THREE.MeshStandardMaterial;

  constructor(private scene: THREE.Scene) {
    this.wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf0f0f0 });
    this.floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.8,
      metalness: 0.1,
    });

    this.createFloor();
    this.createEntranceRoom();
    this.createCorridor();
    this.createMainGallery();
  }

  private createFloor() {
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floor = new THREE.Mesh(floorGeometry, this.floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  private createEntranceRoom() {
    // Back wall
    this.addWall(10, 8, { x: 0, y: 4, z: 5 }, { y: Math.PI });

    // Left wall
    this.addWall(10, 8, { x: -5, y: 4, z: 0 }, { y: Math.PI / 2 });

    // Right wall
    this.addWall(10, 8, { x: 5, y: 4, z: 0 }, { y: -Math.PI / 2 });

    // Front wall with doorway
    this.addWall(3, 8, { x: -3.5, y: 4, z: -5 });
    this.addWall(3, 8, { x: 3.5, y: 4, z: -5 });
  }

  private createCorridor() {
    // Left corridor wall
    this.addWall(10, 8, { x: -2, y: 4, z: -10 }, { y: Math.PI / 2 });

    // Right corridor wall
    this.addWall(10, 8, { x: 2, y: 4, z: -10 }, { y: -Math.PI / 2 });
  }

  private createMainGallery() {
    // Back wall
    this.addWall(16, 8, { x: 0, y: 4, z: -31 });

    // Left wall
    this.addWall(16, 8, { x: -8, y: 4, z: -23 }, { y: Math.PI / 2 });

    // Right wall
    this.addWall(16, 8, { x: 8, y: 4, z: -23 }, { y: -Math.PI / 2 });

    // Front wall with doorway
    this.addWall(6, 8, { x: -5, y: 4, z: -15 }, { y: Math.PI });
    this.addWall(6, 8, { x: 5, y: 4, z: -15 }, { y: Math.PI });
  }

  private addWall(
    width: number,
    height: number,
    position: { x: number; y: number; z: number },
    rotation?: { x?: number; y?: number; z?: number },
  ) {
    const geometry = new THREE.PlaneGeometry(width, height);
    const wall = new THREE.Mesh(geometry, this.wallMaterial);
    wall.position.set(position.x, position.y, position.z);

    if (rotation) {
      if (rotation.x) wall.rotation.x = rotation.x;
      if (rotation.y) wall.rotation.y = rotation.y;
      if (rotation.z) wall.rotation.z = rotation.z;
    }

    this.scene.add(wall);
  }
}

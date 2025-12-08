import * as THREE from "three";

export class ArtworkManager {
  private frameGeometry: THREE.BoxGeometry;
  private frameMaterial: THREE.MeshStandardMaterial;

  constructor(private scene: THREE.Scene) {
    this.frameGeometry = new THREE.BoxGeometry(2, 1.5, 0.1);
    this.frameMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    this.placeArtwork();
  }

  private placeArtwork() {
    // Entrance room artwork
    this.addFrame(-2, 3, 4.9);
    this.addFrame(2, 3, 4.9);

    // Main gallery artwork
    this.addFrame(-4, 3, -30.9);
    this.addFrame(0, 3, -30.9);
    this.addFrame(4, 3, -30.9);
  }

  private addFrame(x: number, y: number, z: number) {
    const frame = new THREE.Mesh(this.frameGeometry, this.frameMaterial);
    frame.position.set(x, y, z);
    this.scene.add(frame);
  }
}

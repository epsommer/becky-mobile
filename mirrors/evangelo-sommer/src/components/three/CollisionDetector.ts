import * as THREE from "three";

export interface CollisionInfo {
  isColliding: boolean;
  wallType: string;
  distance: number;
}

export class CollisionDetector {
  private playerRadius = 0.5;

  checkCollision(position: THREE.Vector3): CollisionInfo {
    let isColliding = false;
    let wallType = "";
    const distance = 0;

    // Entrance room (Z: 5 to -5, X: -5 to 5)
    if (position.z > -5) {
      if (position.x <= -5 + this.playerRadius) {
        isColliding = true;
        wallType = "Entrance Left Wall";
      } else if (position.x >= 5 - this.playerRadius) {
        isColliding = true;
        wallType = "Entrance Right Wall";
      } else if (position.z >= 5 - this.playerRadius) {
        isColliding = true;
        wallType = "Entrance Back Wall";
      } else if (
        position.z <= -5 + this.playerRadius &&
        (position.x < -2 || position.x > 2)
      ) {
        isColliding = true;
        wallType = "Entrance Front Wall";
      }
    }
    // Corridor (Z: -5 to -15, X: -1.5 to 1.5)
    else if (position.z > -15) {
      if (position.x <= -1.5 + this.playerRadius) {
        isColliding = true;
        wallType = "Corridor Left Wall";
      } else if (position.x >= 1.5 - this.playerRadius) {
        isColliding = true;
        wallType = "Corridor Right Wall";
      }
    }
    // Main gallery (Z: -15 to -31, X: -8 to 8)
    else if (position.z > -31) {
      if (position.x <= -8 + this.playerRadius) {
        isColliding = true;
        wallType = "Main Gallery Left Wall";
      } else if (position.x >= 8 - this.playerRadius) {
        isColliding = true;
        wallType = "Main Gallery Right Wall";
      } else if (position.z <= -31 + this.playerRadius) {
        isColliding = true;
        wallType = "Main Gallery Back Wall";
      } else if (
        position.z >= -15 - this.playerRadius &&
        (position.x < -2 || position.x > 2)
      ) {
        isColliding = true;
        wallType = "Main Gallery Front Wall";
      }
    }

    return { isColliding, wallType, distance };
  }

  clampPosition(position: THREE.Vector3): THREE.Vector3 {
    const clampedPosition = position.clone();
    const radius = this.playerRadius;

    // Entrance room
    if (position.z > -5) {
      clampedPosition.x = Math.max(
        -5 + radius,
        Math.min(5 - radius, position.x),
      );
      clampedPosition.z = Math.min(5 - radius, position.z);

      // Handle doorway
      if (position.z < -5 + radius && (position.x < -2 || position.x > 2)) {
        clampedPosition.z = Math.max(-5 + radius, position.z);
      }
    }
    // Corridor
    else if (position.z > -15) {
      clampedPosition.x = Math.max(
        -1.5 + radius,
        Math.min(1.5 - radius, position.x),
      );
    }
    // Main gallery
    else if (position.z > -31) {
      clampedPosition.x = Math.max(
        -8 + radius,
        Math.min(8 - radius, position.x),
      );
      clampedPosition.z = Math.max(-31 + radius, position.z);

      // Handle doorway
      if (position.z > -15 - radius && (position.x < -2 || position.x > 2)) {
        clampedPosition.z = Math.min(-15 - radius, position.z);
      }
    }

    return clampedPosition;
  }
}

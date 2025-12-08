import { useState, useEffect } from "react";

export type RoomType = "entrance" | "corridor" | "main-gallery";

interface RoomTrackerOptions {
  position: { x: number; y: number; z: number };
}

export function useRoomTracker({ position }: RoomTrackerOptions) {
  const [currentRoom, setCurrentRoom] = useState<RoomType>("entrance");

  useEffect(() => {
    const detectRoom = (pos: { z: number }): RoomType => {
      if (pos.z > -5) return "entrance";
      else if (pos.z > -15) return "corridor";
      else return "main-gallery";
    };

    const room = detectRoom(position);
    setCurrentRoom(room);
  }, [position]); // Use the whole position object

  const getRoomDisplayName = (room: RoomType): string => {
    switch (room) {
      case "entrance":
        return "Entrance Gallery";
      case "corridor":
        return "Corridor";
      case "main-gallery":
        return "Main Gallery";
      default:
        return "Unknown Area";
    }
  };

  return { currentRoom, getRoomDisplayName };
}

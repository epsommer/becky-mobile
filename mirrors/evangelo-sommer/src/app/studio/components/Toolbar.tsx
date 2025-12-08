"use client";

import { useStudioStore } from "../hooks/useStudioStore";

interface ToolbarProps {
  isDark: boolean;
}

export default function Toolbar({ isDark }: ToolbarProps) {
  const addObject = useStudioStore((state) => state.addObject);

  const tools = [
    { name: 'Cube', icon: '⬜', type: 'cube' as const },
    { name: 'Sphere', icon: '⚫', type: 'sphere' as const },
    { name: 'Cylinder', icon: '⬭', type: 'cylinder' as const },
  ];

  return (
    <div className="flex flex-col gap-2">
      {tools.map((tool) => (
        <button
          key={tool.type}
          onClick={() => addObject(tool.type)}
          className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
          style={{
            width: '48px',
            height: '48px',
            padding: '0',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={tool.name}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
}

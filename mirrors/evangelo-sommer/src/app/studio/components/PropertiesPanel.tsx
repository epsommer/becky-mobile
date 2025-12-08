"use client";

import { useStudioStore } from "../hooks/useStudioStore";

interface PropertiesPanelProps {
  isDark: boolean;
}

export default function PropertiesPanel({ isDark }: PropertiesPanelProps) {
  const objects = useStudioStore((state) => state.objects);
  const selectedObject = useStudioStore((state) => state.selectedObject);
  const updateObject = useStudioStore((state) => state.updateObject);
  const deleteObject = useStudioStore((state) => state.deleteObject);

  const selected = objects.find(obj => obj.id === selectedObject);

  return (
    <div className="h-full flex flex-col gap-4">
      <h2
        className="text-lg font-bold font-space-grotesk uppercase"
        style={{
          color: isDark ? '#d1d5db' : '#6C7587',
          transition: 'color 300ms ease-in-out'
        }}
      >
        Properties
      </h2>

      {selected ? (
        <div className="flex flex-col gap-4">
          <div>
            <label
              className="block text-sm font-space-grotesk mb-2"
              style={{ color: isDark ? '#9ca3af' : '#8992A5' }}
            >
              Object Type
            </label>
            <div
              className={`neomorphic-input ${isDark ? 'dark-mode' : ''}`}
              style={{ cursor: 'not-allowed', opacity: 0.7 }}
            >
              {selected.type}
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-space-grotesk mb-2"
              style={{ color: isDark ? '#9ca3af' : '#8992A5' }}
            >
              Position
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['x', 'y', 'z'] as const).map((axis, index) => (
                <input
                  key={axis}
                  type="number"
                  value={selected.position[index]}
                  onChange={(e) => {
                    const newPos = [...selected.position] as [number, number, number];
                    newPos[index] = parseFloat(e.target.value) || 0;
                    updateObject(selected.id, { position: newPos });
                  }}
                  className={`neomorphic-input ${isDark ? 'dark-mode' : ''}`}
                  style={{ padding: '8px', fontSize: '12px' }}
                  placeholder={axis.toUpperCase()}
                  step="0.1"
                />
              ))}
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-space-grotesk mb-2"
              style={{ color: isDark ? '#9ca3af' : '#8992A5' }}
            >
              Scale
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['x', 'y', 'z'] as const).map((axis, index) => (
                <input
                  key={axis}
                  type="number"
                  value={selected.scale[index]}
                  onChange={(e) => {
                    const newScale = [...selected.scale] as [number, number, number];
                    newScale[index] = parseFloat(e.target.value) || 1;
                    updateObject(selected.id, { scale: newScale });
                  }}
                  className={`neomorphic-input ${isDark ? 'dark-mode' : ''}`}
                  style={{ padding: '8px', fontSize: '12px' }}
                  placeholder={axis.toUpperCase()}
                  step="0.1"
                />
              ))}
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-space-grotesk mb-2"
              style={{ color: isDark ? '#9ca3af' : '#8992A5' }}
            >
              Color
            </label>
            <input
              type="color"
              value={selected.color || '#D4AF37'}
              onChange={(e) => updateObject(selected.id, { color: e.target.value })}
              className="w-full h-12 cursor-pointer rounded-lg"
              style={{ border: '3px solid transparent' }}
            />
          </div>

          <button
            onClick={() => deleteObject(selected.id)}
            className={`neomorphic-submit ${isDark ? 'dark-mode' : ''}`}
            style={{
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(254, 226, 226, 1)',
              color: isDark ? '#FCA5A5' : '#991B1B',
            }}
          >
            Delete Object
          </button>
        </div>
      ) : (
        <p
          className="text-sm font-space-grotesk"
          style={{ color: isDark ? '#6b7280' : '#8992A5' }}
        >
          Select an object to edit its properties
        </p>
      )}

      {/* Object List */}
      <div className="mt-8">
        <h3
          className="text-md font-bold font-space-grotesk uppercase mb-4"
          style={{
            color: isDark ? '#d1d5db' : '#6C7587',
            transition: 'color 300ms ease-in-out'
          }}
        >
          Scene Objects ({objects.length})
        </h3>
        <div className="flex flex-col gap-2">
          {objects.map((obj) => (
            <button
              key={obj.id}
              onClick={() => useStudioStore.setState({ selectedObject: obj.id })}
              className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
              style={{
                padding: '12px',
                fontSize: '14px',
                textAlign: 'left',
                backgroundColor: selectedObject === obj.id
                  ? (isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.1)')
                  : undefined
              }}
            >
              {obj.type}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// src/components/conversation/RichTextEditor.tsx
"use client";

import React, { useCallback, useEffect, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

const modules = {
  toolbar: [
    [{ 'header': [1, 2, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['blockquote', 'code-block'],
    ['clean']
  ],
  clipboard: {
    matchVisual: false,
  },
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet',
  'blockquote', 'code-block'
];

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start typing...',
  className = '',
  readOnly = false,
}) => {
  // Work around hydration issues with SSR
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = useCallback((content: string) => {
    onChange(content);
  }, [onChange]);

  if (!mounted) {
    return (
      <div className="h-32 border rounded-md bg-tactical-grey-100 animate-pulse" />
    );
  }

  return (
    <div className={`rich-text-editor ${className}`}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
        className="bg-white rounded-md"
      />
      <style jsx global>{`
        .rich-text-editor .ql-container {
          min-height: 120px;
          font-size: 16px;
          font-family: inherit;
        }
        .rich-text-editor .ql-editor {
          min-height: 120px;
          max-height: 400px;
          overflow-y: auto;
        }
        .rich-text-editor .ql-toolbar {
          border-top-left-radius: 0.375rem;
          border-top-right-radius: 0.375rem;
          background-color: #f9fafb;
          border-color: #e5e7eb;
        }
        .rich-text-editor .ql-container {
          border-bottom-left-radius: 0.375rem;
          border-bottom-right-radius: 0.375rem;
          border-color: #e5e7eb;
        }
        .rich-text-editor .ql-toolbar button:hover {
          color: #D4AF37;
        }
        .rich-text-editor .ql-toolbar button.ql-active {
          color: #D4AF37;
        }
        .rich-text-editor .ql-toolbar .ql-stroke {
          stroke: currentColor;
        }
        .rich-text-editor .ql-toolbar .ql-fill {
          fill: currentColor;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;

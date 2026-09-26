import React from 'react';
import Editor from '@monaco-editor/react';

interface YamlEditorProps {
  initialYaml: string;
  onChange: (yaml: string) => void;
  height?: string;
}

export const YamlEditor: React.FC<YamlEditorProps> = ({ initialYaml, onChange, height = '400px' }) => {
  return (
    <div className="rounded-lg overflow-hidden border border-slate-700">
      <Editor
        height={height}
        defaultLanguage="yaml"
        defaultValue={initialYaml}
        theme="vs-dark"
        onChange={(value) => onChange(value || '')}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
          automaticLayout: true,
        }}
      />
    </div>
  );
};

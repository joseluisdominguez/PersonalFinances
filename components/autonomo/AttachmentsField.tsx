import React, { useRef, useState } from 'react';
import { Paperclip, Download, Trash2, FileText, UploadCloud } from 'lucide-react';
import { Attachment } from '../../types';
import { generateId } from '../../utils';
import { deleteAttachment, downloadAttachment, putAttachment } from './idb';

interface Props {
  adjuntos: Attachment[];
  onChange: (adjuntos: Attachment[]) => void;
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

export const AttachmentsField: React.FC<Props> = ({ adjuntos, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = async (files: FileList) => {
    if (files.length === 0) return;
    setBusy(true);
    try {
      const nuevos: Attachment[] = [];
      for (const file of Array.from(files)) {
        const id = generateId();
        await putAttachment(id, file);
        nuevos.push({
          id,
          nombre: file.name,
          mime: file.type || 'application/octet-stream',
          size: file.size,
        });
      }
      onChange([...adjuntos, ...nuevos]);
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    await processFiles(files);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files) await processFiles(files);
  };

  const handleRemove = async (a: Attachment) => {
    await deleteAttachment(a.id);
    onChange(adjuntos.filter((x) => x.id !== a.id));
  };

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`cursor-pointer flex flex-col items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-lg text-sm transition-all select-none ${
          isDragging
            ? 'border-blue-500 bg-blue-50 text-blue-700'
            : 'border-gray-300 text-gray-600 hover:border-blue-500 hover:bg-blue-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFile}
        />
        {isDragging ? <UploadCloud size={22} /> : <Paperclip size={18} />}
        <span className="font-medium">
          {busy
            ? 'Subiendo...'
            : isDragging
            ? 'Suelta los archivos para subir'
            : 'Haz click o arrastra archivos aquí'}
        </span>
      </div>

      {adjuntos.length > 0 && (
        <ul className="space-y-2">
          {adjuntos.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 p-2 bg-gray-50 border rounded-lg"
            >
              <FileText size={18} className="text-blue-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{a.nombre}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                  {formatSize(a.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => downloadAttachment(a.id, a.nombre)}
                className="p-1.5 text-gray-400 hover:text-blue-600"
                title="Descargar"
              >
                <Download size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleRemove(a)}
                className="p-1.5 text-gray-400 hover:text-red-600"
                title="Eliminar"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

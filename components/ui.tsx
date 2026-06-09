
import React from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  children?: React.ReactNode;
  /** Clases extra para el contenedor de centrado (p. ej. "items-start"). */
  className?: string;
}

/**
 * Overlay de modal renderizado en un portal a document.body. Al vivir fuera del
 * árbol de la vista, su `position: fixed` se ancla siempre al viewport y no a un
 * ancestro con `transform` (la clase animate-fadeIn lo crea), evitando que el
 * overlay quede del tamaño del contenido de fondo. El layout interno
 * (min-h-full + items-center + overflow-y-auto) centra los modales cortos y
 * permite hacer scroll en los altos sin recortar la parte superior.
 */
export const Modal: React.FC<ModalProps> = ({ children, className = '' }) => {
  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className={`flex min-h-full items-center justify-center p-4 ${className}`}>
        {children}
      </div>
    </div>,
    document.body
  );
};

export const Card: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  // Solo aplicamos bg-white si no se proporciona otra clase de fondo
  const hasBackground = className.includes('bg-');
  const hasBorder = className.includes('border-');
  
  const baseClasses = `rounded-2xl shadow-sm p-6 transition-all duration-200`;
  const defaultClasses = `${!hasBackground ? 'bg-white' : ''} ${!hasBorder ? 'border border-gray-100' : ''}`;
  
  return (
    <div className={`${baseClasses} ${defaultClasses} ${className}`}>
      {children}
    </div>
  );
};

export const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '',
  disabled = false,
  type = 'button'
}: { 
  children?: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'danger' | 'secondary' | 'outline';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}) => {
  const base = "px-4 py-2 rounded-lg font-medium transition-all duration-200 inline-flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg disabled:opacity-50",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-md hover:shadow-lg disabled:opacity-50",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50",
    outline: "border-2 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
  };
  
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

export const Input = ({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) => (
  <div className="flex flex-col gap-1 w-full">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <input
      className={`border-2 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-all bg-white text-gray-900 placeholder-gray-400 ${
        error
          ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
      }`}
      {...props}
    />
    {error && <p className="text-xs text-red-600 -mt-0.5">{error}</p>}
  </div>
);

export const TextArea = ({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) => (
  <div className="flex flex-col gap-1 w-full">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <textarea 
      className="border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white text-gray-900 placeholder-gray-400 min-h-[100px]"
      {...props}
    />
  </div>
);

export const Select = ({ label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) => (
  <div className="flex flex-col gap-1 w-full">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <select 
      className="border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white text-gray-900"
      {...props}
    >
      {children}
    </select>
  </div>
);

export const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string; 
}) => {
  if (!isOpen) return null;
  return (
    <Modal>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="danger" onClick={() => { onConfirm(); onClose(); }}>Eliminar</Button>
        </div>
      </div>
    </Modal>
  );
};

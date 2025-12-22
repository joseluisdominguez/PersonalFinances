
import React from 'react';

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
  const base = "px-5 py-2.5 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-100",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    outline: "border-2 border-gray-200 text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50"
  };
  
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

export const Input = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{label}</label>}
    <input 
      className="border-2 border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-gray-50/50 text-gray-900 placeholder-gray-400 font-medium"
      {...props}
    />
  </div>
);

export const TextArea = ({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{label}</label>}
    <textarea 
      className="border-2 border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-gray-50/50 text-gray-900 placeholder-gray-400 font-medium min-h-[100px]"
      {...props}
    />
  </div>
);

export const Select = ({ label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{label}</label>}
    <select 
      className="border-2 border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-gray-50/50 text-gray-900 font-bold appearance-none cursor-pointer"
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-fadeIn">
        <h3 className="text-xl font-black text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-500 font-medium mb-8 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button variant="danger" onClick={() => { onConfirm(); onClose(); }} className="flex-1">Eliminar</Button>
        </div>
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import { Plus, Trash2, Settings, Save } from 'lucide-react';
import { AppConfig } from '../types';
import { Button, Card, Input, ConfirmDialog } from './ui';

interface Props {
  config: AppConfig;
  onSave: (newConfig: AppConfig) => void;
}

export const ConfigView: React.FC<Props> = ({ config, onSave }) => {
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6'); // Default Blue
  const [newBank, setNewBank] = useState('');
  const [deleteItem, setDeleteItem] = useState<{ type: 'category' | 'bank', value: string } | null>(null);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedName = newCategory.trim();
    if (normalizedName && !config.categories.some(c => c.name === normalizedName)) {
      onSave({
        ...config,
        categories: [...config.categories, { name: normalizedName, color: newCategoryColor }]
      });
      setNewCategory('');
      setNewCategoryColor('#3B82F6'); // Reset color
    }
  };

  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBank.trim() && !config.banks.includes(newBank.trim())) {
      onSave({
        ...config,
        banks: [...config.banks, newBank.trim()]
      });
      setNewBank('');
    }
  };

  const handleDelete = () => {
    if (!deleteItem) return;

    if (deleteItem.type === 'category') {
      onSave({
        ...config,
        categories: config.categories.filter(c => c.name !== deleteItem.value)
      });
    } else {
      onSave({
        ...config,
        banks: config.banks.filter(b => b !== deleteItem.value)
      });
    }
    setDeleteItem(null);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gray-100 rounded-lg">
          <Settings size={24} className="text-gray-700" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Configuración del Sistema</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Categories Section */}
        <Card className="h-full flex flex-col">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            Categorías de Movimientos
            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {config.categories.length}
            </span>
          </h3>
          
          <form onSubmit={handleAddCategory} className="flex gap-2 mb-4 items-end">
            <div className="flex-1 space-y-1">
              <Input 
                label="" 
                placeholder="Nueva categoría..." 
                value={newCategory} 
                onChange={e => setNewCategory(e.target.value)} 
              />
            </div>
            <div className="flex flex-col gap-1">
                {/* Color picker styled slightly better */}
                <input 
                  type="color" 
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="h-[42px] w-[50px] p-1 bg-white border-2 border-gray-200 rounded-lg cursor-pointer"
                  title="Elegir color"
                />
            </div>
            <Button type="submit" disabled={!newCategory.trim()} className="h-[42px]">
              <Plus size={20} />
            </Button>
          </form>

          <div className="flex-1 overflow-y-auto max-h-[400px] space-y-2 pr-2">
            {config.categories.map(cat => (
              <div key={cat.name} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border group hover:border-blue-200 transition-colors">
                <div className="flex items-center gap-3">
                   <div 
                     className="w-4 h-4 rounded-full border border-gray-200 shadow-sm"
                     style={{ backgroundColor: cat.color }} 
                   />
                   <span className="font-medium text-gray-700">{cat.name}</span>
                </div>
                <button 
                  onClick={() => setDeleteItem({ type: 'category', value: cat.name })}
                  className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Eliminar categoría"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Banks Section */}
        <Card className="h-full flex flex-col">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            Bancos y Cuentas
            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {config.banks.length}
            </span>
          </h3>
          
          <form onSubmit={handleAddBank} className="flex gap-2 mb-4">
            <div className="flex-1">
              <Input 
                label="" 
                placeholder="Nuevo banco..." 
                value={newBank} 
                onChange={e => setNewBank(e.target.value)} 
              />
            </div>
            <Button type="submit" disabled={!newBank.trim()} className="mt-1">
              <Plus size={20} />
            </Button>
          </form>

          <div className="flex-1 overflow-y-auto max-h-[400px] space-y-2 pr-2">
            {config.banks.map(bank => (
              <div key={bank} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border group hover:border-blue-200 transition-colors">
                <span className="font-medium text-gray-700">{bank}</span>
                <button 
                  onClick={() => setDeleteItem({ type: 'bank', value: bank })}
                  className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Eliminar banco"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <ConfirmDialog 
        isOpen={!!deleteItem} 
        onClose={() => setDeleteItem(null)} 
        onConfirm={handleDelete} 
        title={deleteItem?.type === 'category' ? "Eliminar Categoría" : "Eliminar Banco"} 
        message={`¿Estás seguro de eliminar "${deleteItem?.value}"? Los registros existentes mantendrán este valor, pero no podrás seleccionarlo en nuevos registros.`} 
      />
    </div>
  );
};

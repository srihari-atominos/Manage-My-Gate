import React, { useState } from 'react';
import { AlertTriangle, Trash2, RotateCcw, Power, PowerOff, X } from 'lucide-react';

const ModuleActionDialog = ({ isOpen, onClose, onConfirm, type, moduleName }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsProcessing(true);
    await onConfirm();
    setIsProcessing(false);
  };

  const getDialogContent = () => {
    switch (type) {
      case 'delete':
        return {
          icon: <Trash2 className="w-6 h-6 text-red-600" />,
          title: 'Delete Module',
          description: `Are you sure you want to delete the "${moduleName}" module? This will soft-delete the module and hide it from the application. Existing module data will be preserved.`,
          buttonText: 'Yes, Delete',
          buttonClass: 'bg-red-600 hover:bg-red-700 text-white',
          iconBg: 'bg-red-100',
        };
      case 'restore':
        return {
          icon: <RotateCcw className="w-6 h-6 text-green-600" />,
          title: 'Restore Module',
          description: `Are you sure you want to restore the "${moduleName}" module? It will become active and available in the application again.`,
          buttonText: 'Yes, Restore',
          buttonClass: 'bg-green-600 hover:bg-green-700 text-white',
          iconBg: 'bg-green-100',
        };
      case 'disable':
        return {
          icon: <PowerOff className="w-6 h-6 text-orange-600" />,
          title: 'Disable Module',
          description: `Are you sure you want to disable the "${moduleName}" module? It will be hidden from the sidebar and its routes will become inaccessible.`,
          buttonText: 'Yes, Disable',
          buttonClass: 'bg-orange-600 hover:bg-orange-700 text-white',
          iconBg: 'bg-orange-100',
        };
      case 'enable':
        return {
          icon: <Power className="w-6 h-6 text-green-600" />,
          title: 'Enable Module',
          description: `Are you sure you want to enable the "${moduleName}" module? It will be visible in the sidebar and its routes will become accessible.`,
          buttonText: 'Yes, Enable',
          buttonClass: 'bg-green-600 hover:bg-green-700 text-white',
          iconBg: 'bg-green-100',
        };
      default:
        return {
          icon: <AlertTriangle className="w-6 h-6 text-primary" />,
          title: 'Confirm Action',
          description: `Are you sure you want to perform this action on "${moduleName}"?`,
          buttonText: 'Confirm',
          buttonClass: 'bg-primary hover:bg-primary/90 text-white',
          iconBg: 'bg-primary/10',
        };
    }
  };

  const content = getDialogContent();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 pt-8 flex flex-col items-center text-center">
          <div className={`w-16 h-16 ${content.iconBg} rounded-full flex items-center justify-center mb-4`}>
            {content.icon}
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {content.title}
          </h3>
          
          <p className="text-gray-500 mb-8">
            {content.description}
          </p>

          <div className="flex w-full gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 py-2.5 px-4 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors flex justify-center items-center gap-2 ${content.buttonClass} disabled:opacity-50`}
            >
              {isProcessing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
              {content.buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleActionDialog;

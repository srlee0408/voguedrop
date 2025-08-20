'use client';

import { X } from 'lucide-react';

interface ProjectSwitchConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onDontSave: () => void;
  currentProjectName?: string;
  targetProjectName?: string;
}

export function ProjectSwitchConfirmModal({
  isOpen,
  onClose,
  onSave,
  onDontSave,
  currentProjectName = 'current project',
  targetProjectName = 'new project'
}: ProjectSwitchConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-900 rounded-xl shadow-2xl w-full max-w-md p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
        
        {/* Content */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-100 mb-3">
            Save changes before switching?
          </h2>
          
          <p className="text-gray-400 mb-6">
            You have unsaved changes in &quot;{currentProjectName}&quot;. 
            Do you want to save them before switching to &quot;{targetProjectName}&quot;?
          </p>
          
          {/* Actions */}
          <div className="flex gap-3">
          <button
              onClick={onSave}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Save
              </button>
              <button
              onClick={onDontSave}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
            >
              Don&apos;t Save
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
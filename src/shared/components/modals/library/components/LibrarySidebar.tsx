'use client';

import { Video, Folder, Upload, Heart } from 'lucide-react';
import { LibraryCategory, LibraryCounts, LibraryModalConfig } from '@/shared/types/library-modal';
import { Input } from '@/shared/components/ui/input';

interface LibrarySidebarProps {
  activeCategory: LibraryCategory;
  onCategoryChange: (category: LibraryCategory) => void;
  counts: LibraryCounts;
  dateFilter?: {
    enabled: boolean;
    startDate: string;
    endDate: string;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
  };
  uploadSection?: React.ReactNode;
  theme?: LibraryModalConfig['theme'];
}

export function LibrarySidebar({
  activeCategory,
  onCategoryChange,
  counts,
  dateFilter,
  uploadSection,
  theme
}: LibrarySidebarProps) {
  const primaryColor = theme?.primaryColor || 'primary';
  const isCustomColor = primaryColor.startsWith('#');
  
  const getButtonClass = (isActive: boolean) => {
    if (isActive) {
      if (isCustomColor) {
        return 'text-white';
      }
      return `bg-${primaryColor}/20 text-${primaryColor}`;
    }
    return 'hover:bg-gray-800 text-gray-400 hover:text-white';
  };

  const categories: Array<{
    id: LibraryCategory;
    icon: React.ReactNode;
    label: string;
  }> = [
    {
      id: 'favorites',
      icon: <Heart className="w-5 h-5" />,
      label: 'Favorites'
    },
    {
      id: 'clips',
      icon: <Video className="w-5 h-5" />,
      label: 'Clips'
    },
    {
      id: 'projects',
      icon: <Folder className="w-5 h-5" />,
      label: 'Projects'
    },
    {
      id: 'uploads',
      icon: <Upload className="w-5 h-5" />,
      label: 'Uploads'
    }
  ];

  return (
    <div className="w-[200px] bg-gray-900 border-r border-gray-700 p-4">
      <div className="space-y-2">
        {categories.map((category) => {
          const isActive = activeCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`w-full px-4 py-3 rounded-lg text-left transition-colors flex items-center justify-between
                ${getButtonClass(isActive)}`}
              style={isActive && isCustomColor ? {
                backgroundColor: `${primaryColor}20`,
                color: primaryColor
              } : undefined}
            >
              <div className="flex items-center gap-3">
                {category.icon}
                <span className="text-sm font-medium">{category.label}</span>
              </div>
              <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                {counts[category.id]}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Upload Section */}
      {activeCategory === 'uploads' && uploadSection && (
        <div className="mt-4">
          {uploadSection}
        </div>
      )}

      {/* Date Filter */}
      {dateFilter?.enabled && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <p className="text-xs text-gray-500 mb-3">Filter by date</p>
          <div className="space-y-2">
            <Input
              type="date"
              className="bg-gray-800 text-white text-xs border-gray-600 focus:border-primary h-8"
              value={dateFilter.startDate}
              onChange={(e) => dateFilter.onStartDateChange(e.target.value)}
              placeholder="Start"
            />
            <span className="text-gray-500 text-xs block text-center">to</span>
            <Input
              type="date"
              className="bg-gray-800 text-white text-xs border-gray-600 focus:border-primary h-8"
              value={dateFilter.endDate}
              onChange={(e) => dateFilter.onEndDateChange(e.target.value)}
              placeholder="End"
            />
          </div>
        </div>
      )}
    </div>
  );
}
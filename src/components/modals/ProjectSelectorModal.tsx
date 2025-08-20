'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, Plus, Film, Clock, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { fetchUserProjects, deleteProject, formatRelativeTime, formatDuration } from '@/lib/api/projects';
import type { ProjectListItem } from '@/lib/api/projects';

interface ProjectSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewProject?: () => void;  // 새 프로젝트 콜백 추가
}

interface ProjectCardProps {
  project?: ProjectListItem;
  isNew?: boolean;
  onClick: () => void;
  onDelete?: () => void;
}

// 프로젝트 카드 컴포넌트
function ProjectCard({ project, isNew, onClick, onDelete }: ProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000); // 3초 후 자동 취소
    } else {
      onDelete?.();
      setShowDeleteConfirm(false);
    }
  };
  
  if (isNew) {
    return (
      <button
        onClick={onClick}
        className="relative aspect-video bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 hover:border-blue-500 transition-colors group"
      >
        <div className="flex flex-col items-center justify-center h-full gap-2">
          <Plus className="w-12 h-12 text-gray-400 group-hover:text-blue-500" />
          <span className="text-gray-400 group-hover:text-blue-500 font-medium">
            새 프로젝트
          </span>
        </div>
      </button>
    );
  }
  
  if (!project) return null;
  
  return (
    <div
      className="relative cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* 썸네일 영역 */}
      <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden">
        {project.thumbnail_url ? (
          <Image
            src={project.thumbnail_url}
            alt={project.project_name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-800 to-gray-900">
            <Film className="w-12 h-12 text-gray-600" />
          </div>
        )}
        
        {/* 호버 오버레이 */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-white text-center">
              <p className="text-sm font-medium mb-1">클릭하여 편집</p>
              {project.duration_frames && (
                <p className="text-xs opacity-75">
                  {formatDuration(project.duration_frames)}
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* 삭제 버튼 */}
        {isHovered && !showDeleteConfirm && (
          <button
            onClick={handleDelete}
            className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 rounded-full transition-colors"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        )}
        
        {/* 삭제 확인 */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-red-500/90 flex items-center justify-center">
            <div className="text-white text-center">
              <p className="text-sm font-medium mb-2">정말 삭제하시겠습니까?</p>
              <button
                onClick={handleDelete}
                className="px-3 py-1 bg-white text-red-500 rounded text-xs font-medium"
              >
                삭제
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* 프로젝트 정보 */}
      <div className="mt-2">
        <h3 className="text-sm font-medium text-gray-100 truncate">
          {project.project_name}
        </h3>
        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
          <Clock className="w-3 h-3" />
          <span>{formatRelativeTime(project.updated_at)}</span>
        </div>
      </div>
    </div>
  );
}

export function ProjectSelectorModal({ isOpen, onClose, onNewProject }: ProjectSelectorModalProps) {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // 프로젝트 목록 로드
  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const projectList = await fetchUserProjects();
      setProjects(projectList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load projects';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // 모달이 열릴 때 프로젝트 목록 로드
  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen, loadProjects]);
  
  // 프로젝트 선택 핸들러
  const handleProjectSelect = (projectName: string) => {
    router.push(`/video-editor?projectName=${encodeURIComponent(projectName)}`);
    onClose();
  };
  
  // 새 프로젝트 시작
  const handleNewProject = () => {
    if (onNewProject) {
      onNewProject();  // 부모 컴포넌트에서 처리
    } else {
      // 기본 동작: 빈 video-editor로 이동
      router.push('/video-editor');
    }
    onClose();
  };
  
  // 프로젝트 삭제
  const handleDeleteProject = async (projectName: string) => {
    try {
      await deleteProject(projectName);
      // 목록에서 제거
      setProjects(prev => prev.filter(p => p.project_name !== projectName));
    } catch {
      // 에러 처리는 UI에서 별도로 표시
    }
  };
  
  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 백드롭 */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 모달 컨텐츠 */}
      <div className="relative bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[80vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-100">
              프로젝트 선택
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              편집할 프로젝트를 선택하거나 새로 시작하세요
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        {/* 컨텐츠 영역 */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={loadProjects}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                다시 시도
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* 새 프로젝트 카드 */}
              <ProjectCard
                isNew
                onClick={handleNewProject}
              />
              
              {/* 기존 프로젝트 카드들 */}
              {projects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => handleProjectSelect(project.project_name)}
                  onDelete={() => handleDeleteProject(project.project_name)}
                />
              ))}
              
              {/* 프로젝트가 없을 때 */}
              {projects.length === 0 && (
                <div className="col-span-full text-center py-8">
                  <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">
                    아직 저장된 프로젝트가 없습니다
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    새 프로젝트를 시작하여 비디오를 편집해보세요
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
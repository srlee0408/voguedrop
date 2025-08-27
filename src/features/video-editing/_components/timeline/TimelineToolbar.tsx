'use client';

/**
 * TimelineToolbar - 타임라인 액션 및 레인 관리 툴바
 * 
 * 역할:
 * - 클립 액션 버튼 제공 (편집, 복제, 분할, 삭제)
 * - 레인 추가/제거 제어
 * - 다중 선택된 클립 일괄 처리
 * - 액션 버튼 활성화/비활성화 상태 관리
 * 
 * 특징:
 * - 선택된 클립 타입에 따라 버튼 활성화 상태 동적 변경
 * - 레인 최대 개수 제한 (각 타입별 3개)
 * - 다중 선택 시 삭제 카운트 표시
 * - 접근성을 위한 disabled 상태 및 title 속성 제공
 */

import React from 'react';
import { VideoClip, TextClip, SoundClip } from '@/shared/types/video-editor';
import { canAddNewVideoLane, canAddNewTextLane, canAddNewLane } from '@/features/video-editing/_utils/lane-arrangement';

interface TimelineToolbarProps {
  // 클립 선택 상태
  selectedClip: string | null;
  selectedClipType: 'video' | 'text' | 'sound' | null;
  rectSelectedClips: Array<{id: string; type: 'video' | 'text' | 'sound'}>;
  
  // 클립 데이터 (분할 가능 여부 체크용)
  clips: VideoClip[];
  textClips: TextClip[];
  soundClips: SoundClip[];
  
  // 레인 상태
  videoLanes: number[];
  textLanes: number[];
  soundLanes: number[];
  
  // 재생 상태 (분할 가능 여부 체크용)
  currentTime: number;
  
  // 이벤트 핸들러
  onToolbarAction: (action: 'edit' | 'duplicate' | 'split' | 'delete') => void;
  onAddVideoLane: () => void;
  onAddTextLane: () => void;
  onAddSoundLane: () => void;
}

/**
 * 선택된 클립이 현재 재생 시간에서 분할 가능한지 확인
 * @param selectedClip - 선택된 클립 ID
 * @param selectedClipType - 클립 타입
 * @param clips - 비디오 클립 배열
 * @param textClips - 텍스트 클립 배열
 * @param soundClips - 사운드 클립 배열
 * @param currentTime - 현재 재생 시간
 * @returns 분할 가능 여부
 */
function canSplitClip(
  selectedClip: string | null,
  selectedClipType: 'video' | 'text' | 'sound' | null,
  clips: VideoClip[],
  textClips: TextClip[],
  soundClips: SoundClip[],
  currentTime: number
): boolean {
  if (!selectedClip || !selectedClipType) return false;

  let clip;
  if (selectedClipType === 'video') {
    clip = clips.find(c => c.id === selectedClip);
  } else if (selectedClipType === 'text') {
    clip = textClips.find(c => c.id === selectedClip);
  } else if (selectedClipType === 'sound') {
    clip = soundClips.find(c => c.id === selectedClip);
  }

  if (!clip) return false;

  // 현재 시간이 클립 범위 내에 있고, 시작과 끝이 아닌 곳에 있는지 확인
  const clipStart = clip.position / 40; // Convert to seconds
  const clipEnd = (clip.position + clip.duration) / 40;
  
  return currentTime > clipStart && currentTime < clipEnd;
}

export function TimelineToolbar({
  selectedClip,
  selectedClipType,
  rectSelectedClips,
  clips,
  textClips,
  soundClips,
  videoLanes,
  textLanes,
  soundLanes,
  currentTime,
  onToolbarAction,
  onAddVideoLane,
  onAddTextLane,
  onAddSoundLane,
}: TimelineToolbarProps) {
  
  // 편집 가능 여부 확인 (텍스트, 사운드 클립만 편집 가능)
  const canEdit = selectedClip && (selectedClipType === 'text' || selectedClipType === 'sound');
  
  // 복제 가능 여부 확인 (선택된 클립이 있어야 함)
  const canDuplicate = Boolean(selectedClip);
  
  // 분할 가능 여부 확인 (재생 헤드가 클립 내부에 있어야 함)
  const canSplit = canSplitClip(selectedClip, selectedClipType, clips, textClips, soundClips, currentTime);
  
  // 삭제 가능 여부 확인 (선택된 클립이나 다중 선택된 클립이 있어야 함)
  const canDelete = selectedClip || rectSelectedClips.length > 0;

  return (
    <div className="flex border-b border-gray-700 bg-gray-900">
      {/* 액션 라벨 영역 */}
      <div className="w-48 flex-shrink-0 p-1 border-r border-gray-700 flex items-center justify-center">
        <span className="text-[10px] text-gray-400 font-medium">Actions</span>
      </div>
      
      {/* 액션 버튼 및 레인 컨트롤 영역 */}
      <div className="flex-1 p-1 flex items-center gap-2 px-3">
        
        {/* 클립 액션 버튼들 */}
        <div className="flex items-center gap-2">
          {/* 편집 버튼 - 텍스트/사운드 클립만 편집 가능 */}
          <button
            onClick={() => onToolbarAction('edit')}
            disabled={!canEdit}
            className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
              canEdit
                ? 'bg-gray-800 hover:bg-gray-700 text-white'
                : 'bg-gray-900 text-gray-500 cursor-not-allowed'
            }`}
            title={canEdit ? 'Edit selected clip' : 'Select a text or sound clip to edit'}
          >
            <i className="ri-edit-line text-[11px]"></i>
            <span>Edit</span>
          </button>
          
          {/* 복제 버튼 */}
          <button
            onClick={() => onToolbarAction('duplicate')}
            disabled={!canDuplicate}
            className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
              canDuplicate
                ? 'bg-gray-800 hover:bg-gray-700 text-white'
                : 'bg-gray-900 text-gray-500 cursor-not-allowed'
            }`}
            title={canDuplicate ? 'Duplicate selected clip' : 'Select a clip to duplicate'}
          >
            <i className="ri-file-copy-line text-[11px]"></i>
            <span>Duplicate</span>
          </button>
          
          {/* 분할 버튼 - 재생헤드가 클립 내부에 있을 때만 활성화 */}
          <button
            onClick={() => onToolbarAction('split')}
            disabled={!canSplit}
            className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
              canSplit 
                ? 'bg-gray-800 hover:bg-gray-700 text-white' 
                : 'bg-gray-900 text-gray-500 cursor-not-allowed'
            }`}
            title={canSplit ? 'Split clip at playhead position' : 'Position playhead inside a clip to split'}
          >
            <i className="ri-scissors-line text-[11px]"></i>
            <span>Split</span>
          </button>
          
          {/* 삭제 버튼 - 다중 선택 시 카운트 표시 */}
          <button
            onClick={() => onToolbarAction('delete')}
            disabled={!canDelete}
            className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
              canDelete
                ? 'bg-red-900/50 hover:bg-red-800/50 text-red-400 hover:text-red-300'
                : 'bg-gray-900 text-gray-500 cursor-not-allowed'
            }`}
            title={canDelete ? 'Delete selected clips' : 'Select clips to delete'}
          >
            <i className="ri-delete-bin-line text-[11px]"></i>
            <span>
              {rectSelectedClips.length > 0 ? `Delete (${rectSelectedClips.length})` : 'Delete'}
            </span>
          </button>
        </div>
        
        {/* 레인 관리 컨트롤 */}
        <div className="flex items-center gap-2 ml-6">
          <span className="text-[10px] text-gray-400 font-medium">Lanes:</span>
          
          {/* 비디오 레인 추가 버튼 */}
          {canAddNewVideoLane(videoLanes) ? (
            <button 
              onClick={onAddVideoLane}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs flex items-center gap-1 transition-colors border border-gray-600 border-dashed"
              title="Add new video lane"
            >
              <i className="ri-video-line text-[11px] text-green-400"></i>
              <span className="text-[10px] text-gray-300">+Video</span>
              <span className="text-[10px] text-gray-500">({videoLanes.length}/3)</span>
            </button>
          ) : (
            <div 
              className="px-2 py-1 bg-gray-900 rounded text-xs flex items-center gap-1 border border-gray-700"
              title="Maximum video lanes reached"
            >
              <i className="ri-video-line text-[11px] text-gray-600"></i>
              <span className="text-[10px] text-gray-600">Video</span>
              <span className="text-[10px] text-gray-600">(3/3)</span>
            </div>
          )}
          
          {/* 텍스트 레인 추가 버튼 */}
          {canAddNewTextLane(textLanes) ? (
            <button 
              onClick={onAddTextLane}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs flex items-center gap-1 transition-colors border border-gray-600 border-dashed"
              title="Add new text lane"
            >
              <i className="ri-text text-[11px] text-blue-400"></i>
              <span className="text-[10px] text-gray-300">+Text</span>
              <span className="text-[10px] text-gray-500">({textLanes.length}/3)</span>
            </button>
          ) : (
            <div 
              className="px-2 py-1 bg-gray-900 rounded text-xs flex items-center gap-1 border border-gray-700"
              title="Maximum text lanes reached"
            >
              <i className="ri-text text-[11px] text-gray-600"></i>
              <span className="text-[10px] text-gray-600">Text</span>
              <span className="text-[10px] text-gray-600">(3/3)</span>
            </div>
          )}

          {/* 사운드 레인 추가 버튼 */}
          {canAddNewLane(soundLanes) ? (
            <button 
              onClick={onAddSoundLane}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs flex items-center gap-1 transition-colors border border-gray-600 border-dashed"
              title="Add new sound lane"
            >
              <i className="ri-music-line text-[11px] text-amber-400"></i>
              <span className="text-[10px] text-gray-300">+Sound</span>
              <span className="text-[10px] text-gray-500">({soundLanes.length}/3)</span>
            </button>
          ) : (
            <div 
              className="px-2 py-1 bg-gray-900 rounded text-xs flex items-center gap-1 border border-gray-700"
              title="Maximum sound lanes reached"
            >
              <i className="ri-music-line text-[11px] text-gray-600"></i>
              <span className="text-[10px] text-gray-600">Sound</span>
              <span className="text-[10px] text-gray-600">(3/3)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
/**
 * TimelineSection - 타임라인 섹션 래퍼 컴포넌트 🎬
 * 
 * 📌 주요 역할:
 * 1. Timeline 컴포넌트와 Context Provider들을 연결하는 중간 계층
 * 2. 비디오 에디터의 모든 상태와 핸들러를 Timeline에 주입
 * 3. 멀티레인 지원 (사운드/텍스트/비디오 각각 여러 레인 관리)
 * 4. 클립 조작 이벤트들을 Context Hook으로 연결
 * 
 * 🎯 핵심 특징:
 * - Context Providers (useClips, usePlayback, useHistory, useProject) 통합
 * - 비디오/텍스트/사운드 클립별 CRUD 작업 핸들러 관리
 * - 멀티레인 시스템 (soundLanes, textLanes, videoLanes)
 * - 클립 분할, 복제, 리사이즈, 위치 변경 등 고급 편집 기능
 * - 실행 취소/다시 실행 상태 연결
 * 
 * 🚧 주의사항:
 * - Props로 받는 이벤트 핸들러들이 상위 컴포넌트와 일치해야 함
 * - Timeline 높이는 useProject Hook을 통해 동적으로 관리
 * - 모든 클립 타입(비디오/텍스트/사운드)에 대한 일관된 인터페이스 제공
 * - 레인 인덱스 관리로 멀티트랙 편집 지원
 */
'use client';

import Timeline from './Timeline';
import { useClips, usePlayback, useHistory, useProject } from '../_context/Providers';

interface TimelineSectionProps {
  PIXELS_PER_SECOND: number;
  soundLanes?: number[]; // 사운드 레인 배열
  textLanes?: number[]; // 텍스트 레인 배열
  videoLanes?: number[]; // 비디오 레인 배열
  onSplitVideoClip: (id: string) => void;
  onSplitTextClip: (id: string) => void;
  onSplitSoundClip: (id: string) => void;
  onAddText: () => void;
  onEditSoundClip: () => void;
  onAddSoundLane?: () => void; // 사운드 레인 추가
  onDeleteSoundLane?: (laneIndex: number) => void; // 사운드 레인 삭제
  onAddSoundToLane?: (laneIndex: number) => void; // 특정 레인에 사운드 추가
  onUpdateSoundClipLane?: (id: string, laneIndex: number) => void; // 사운드 클립 레인 변경
  onAddTextLane?: () => void; // 텍스트 레인 추가
  onDeleteTextLane?: (laneIndex: number) => void; // 텍스트 레인 삭제
  onAddTextToLane?: (laneIndex: number) => void; // 특정 레인에 텍스트 추가
  onUpdateTextClipLane?: (id: string, laneIndex: number) => void; // 텍스트 클립 레인 변경
  onAddVideoLane?: () => void; // 비디오 레인 추가
  onDeleteVideoLane?: (laneIndex: number) => void; // 비디오 레인 삭제
  onAddVideoToLane?: (laneIndex: number) => void; // 특정 레인에 비디오 추가
  onUpdateVideoClipLane?: (id: string, laneIndex: number) => void; // 비디오 클립 레인 변경
}

export default function TimelineSection({
  PIXELS_PER_SECOND,
  soundLanes,
  textLanes,
  videoLanes,
  onSplitVideoClip,
  onSplitTextClip,
  onSplitSoundClip,
  onAddText,
  onEditSoundClip,
  onAddSoundLane,
  onDeleteSoundLane,
  onAddSoundToLane,
  onUpdateSoundClipLane,
  onAddTextLane,
  onDeleteTextLane,
  onAddTextToLane,
  onUpdateTextClipLane,
  onAddVideoLane,
  onDeleteVideoLane,
  onAddVideoToLane,
  onUpdateVideoClipLane,
}: TimelineSectionProps) {
  const { timelineHeight } = useProject();
  
  const {
    timelineClips,
    textClips,
    soundClips,
    handleDeleteVideoClip,
    handleDuplicateVideoClip,
    handleResizeVideoClip,
    handleUpdateVideoClipPosition,
    handleUpdateAllVideoClips,
    handleReorderVideoClips,
    handleEditTextClip,
    handleDeleteTextClip,
    handleDuplicateTextClip,
    handleResizeTextClip,
    handleUpdateTextClipPosition,
    handleUpdateAllTextClips,
    handleReorderTextClips,
    handleDeleteSoundClip,
    handleDuplicateSoundClip,
    handleResizeSoundClip,
    handleUpdateSoundClipPosition,
    handleUpdateAllSoundClips,
    handleReorderSoundClips,
    handleUpdateSoundVolume,
    handleUpdateSoundFade,
  } = useClips();
  
  const {
    currentTime,
    totalDuration,
    isPlaying,
    handlePlayPause,
    handleSeek,
  } = usePlayback();
  
  const {
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
  } = useHistory();

  const {
    handleAddClip,
    handleAddSound,
  } = useProject();

  return (
    <div 
      className="flex-shrink-0 relative"
      style={{ height: `${timelineHeight}px` }}
    >
      <Timeline 
        clips={timelineClips}
        textClips={textClips}
        soundClips={soundClips}
        soundLanes={soundLanes}
        textLanes={textLanes}
        videoLanes={videoLanes}
        onAddClip={handleAddClip}
        onAddText={onAddText}
        onAddSound={handleAddSound}
        onAddSoundLane={onAddSoundLane}
        onDeleteSoundLane={onDeleteSoundLane}
        onAddSoundToLane={onAddSoundToLane}
        onAddTextLane={onAddTextLane}
        onDeleteTextLane={onDeleteTextLane}
        onAddTextToLane={onAddTextToLane}
        onAddVideoLane={onAddVideoLane}
        onDeleteVideoLane={onDeleteVideoLane}
        onAddVideoToLane={onAddVideoToLane}
        onEditTextClip={handleEditTextClip}
        onEditSoundClip={onEditSoundClip}
        onDeleteTextClip={handleDeleteTextClip}
        onDeleteSoundClip={handleDeleteSoundClip}
        onDeleteVideoClip={handleDeleteVideoClip}
        onDuplicateVideoClip={handleDuplicateVideoClip}
        onDuplicateTextClip={handleDuplicateTextClip}
        onDuplicateSoundClip={handleDuplicateSoundClip}
        onSplitVideoClip={onSplitVideoClip}
        onSplitTextClip={onSplitTextClip}
        onSplitSoundClip={onSplitSoundClip}
        onResizeTextClip={handleResizeTextClip}
        onResizeSoundClip={handleResizeSoundClip}
        onReorderVideoClips={handleReorderVideoClips}
        onReorderTextClips={handleReorderTextClips}
        onReorderSoundClips={handleReorderSoundClips}
        onResizeVideoClip={handleResizeVideoClip}
        onUpdateVideoClipPosition={handleUpdateVideoClipPosition}
        onUpdateTextClipPosition={handleUpdateTextClipPosition}
        onUpdateSoundClipPosition={handleUpdateSoundClipPosition}
        onUpdateAllVideoClips={handleUpdateAllVideoClips}
        onUpdateAllTextClips={handleUpdateAllTextClips}
        onUpdateAllSoundClips={handleUpdateAllSoundClips}
        onUpdateSoundVolume={handleUpdateSoundVolume}
        onUpdateSoundFade={handleUpdateSoundFade}
        onUpdateSoundClipLane={onUpdateSoundClipLane}
        onUpdateTextClipLane={onUpdateTextClipLane}
        onUpdateVideoClipLane={onUpdateVideoClipLane}
        pixelsPerSecond={PIXELS_PER_SECOND}
        currentTime={currentTime}
        totalDuration={totalDuration}
        isPlaying={isPlaying}
        onSeek={handleSeek}
        onPlayPause={handlePlayPause}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
    </div>
  );
}
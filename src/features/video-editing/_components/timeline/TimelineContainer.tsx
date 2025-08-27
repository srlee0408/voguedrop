'use client';

/**
 * TimelineContainer - 비디오 편집 타임라인의 메인 컨테이너
 * 
 * 📌 주요 역할:
 * 1. 비디오, 텍스트, 사운드 클립들을 시간축에 표시
 * 2. 사용자가 클릭/드래그로 클립을 편집할 수 있는 인터페이스 제공
 * 3. 재생 위치(playhead)를 표시하고 조작 가능하게 함
 * 4. 줌 인/아웃으로 타임라인 확대/축소 기능
 * 5. 클립 선택, 복제, 분할, 삭제 등의 편집 기능
 * 
 * 🔧 내부 구조:
 * - TimelineToolbar: 편집 액션 버튼들 (복제, 분할, 삭제 등)
 * - TimelineRuler: 시간 눈금자 (0초, 1초, 2초... 표시)
 * - TimelinePlayheadController: 빨간색 재생 위치 표시선
 * - TimelineTrack: 각 레인별 클립들을 렌더링
 * - useTimelineState: 줌 레벨, 선택 상태 등 관리
 * - useTimelineDragLogic: 드래그로 클립 이동하는 로직
 * 
 * 🎯 사용 예시:
 * - 사용자가 5초 위치에 텍스트 클립을 드래그해서 배치
 * - 재생헤드를 10초로 이동한 후 비디오 클립을 분할
 * - 여러 클립을 선택해서 한번에 삭제
 * 
 * ⚠️ 현재 상태:
 * - 새로 분할된 구조로, 기존 Timeline.tsx(1957줄)을 대체 예정
 * - 일부 기능은 TODO로 표시되어 아직 완전히 구현되지 않음
 * - 점진적으로 기존 코드를 이 구조로 마이그레이션할 계획
 */

import React from 'react';
import { VideoClip, TextClip, SoundClip } from '@/shared/types/video-editor';
import TimelineControls from '@/app/video-editor/_components/TimelineControls';
import TimelineGrid from '@/app/video-editor/_components/TimelineGrid';
import TimelineTrack from '@/app/video-editor/_components/TimelineTrack';
import TimelineSelectionBox from '@/app/video-editor/_components/TimelineSelectionBox';
import { TimelineToolbar } from './TimelineToolbar';
import { TimelineRuler } from './TimelineRuler';
import { TimelinePlayheadController } from './TimelinePlayheadController';
import { useTimelineState } from '../../_hooks/useTimelineState';
import { useTimelineDragLogic } from '../../_hooks/useTimelineDragLogic';

/**
 * TimelineContainer에 전달되는 props 정의
 * 
 * 📊 데이터 props:
 * - clips, textClips, soundClips: 타임라인에 표시할 클립 목록
 * - videoLanes, textLanes, soundLanes: 각 타입별 레인(트랙) 번호 배열 [0, 1, 2...]
 * - currentTime: 현재 재생 위치 (초 단위)
 * - totalDuration: 전체 비디오 길이 (초 단위)
 * - pixelsPerSecond: 줌 레벨 (1초당 픽셀 수, 기본 40px)
 * 
 * 🎮 재생 제어 props:
 * - isPlaying: 재생 중인지 여부
 * - onSeek: 재생 위치 변경 시 호출 (사용자가 재생헤드 드래그할 때)
 * - onPlayPause: 재생/일시정지 버튼 클릭 시 호출
 * 
 * ✏️ 편집 액션 props:
 * - onEditTextClip, onEditSoundClip: 클립 편집 모달 열기
 * - onDeleteVideoClip, onDeleteTextClip, onDeleteSoundClip: 클립 삭제
 * - onDuplicateVideoClip, onDuplicateTextClip, onDuplicateSoundClip: 클립 복제
 * - onSplitVideoClip, onSplitTextClip, onSplitSoundClip: 클립 분할
 * 
 * 🛤️ 레인 관리 props:
 * - onAddVideoLane, onAddTextLane, onAddSoundLane: 새 레인 추가
 * - onDeleteVideoLane 등: 레인 삭제 (현재 미구현)
 * 
 * 📚 실행취소/재실행 props:
 * - onUndo, onRedo: 실행취소/재실행 액션
 * - canUndo, canRedo: 버튼 활성화 여부
 * 
 * ⚠️ 주의사항:
 * - 현재 많은 props가 선언되어 있지만 실제로는 사용되지 않음
 * - 향후 기능 구현 시 점진적으로 활용될 예정
 * - 사용하지 않는 props는 eslint-disable-line으로 경고 무시
 */
interface TimelineContainerProps {
  // 필수 데이터
  clips: VideoClip[];
  textClips?: TextClip[];
  soundClips?: SoundClip[];
  
  // 레인 구성 (각 타입별로 몇 개의 레인이 있는지)
  soundLanes?: number[];  // 예: [0, 1, 2] = 3개의 사운드 레인
  textLanes?: number[];   // 예: [0, 1] = 2개의 텍스트 레인
  videoLanes?: number[];  // 예: [0] = 1개의 비디오 레인
  
  // 레인 관리 (새 레인 추가 기능)
  onAddVideoLane?: () => void;
  onAddTextLane?: () => void;
  onAddSoundLane?: () => void;
  
  // 클립 편집 액션
  onEditTextClip?: (clip: TextClip) => void;
  onEditSoundClip?: (clip: SoundClip) => void;
  onDeleteTextClip?: (id: string) => void;
  onDeleteSoundClip?: (id: string) => void;
  onDeleteVideoClip?: (id: string) => void;
  onDuplicateVideoClip?: (id: string) => void;
  onDuplicateTextClip?: (id: string) => void;
  onDuplicateSoundClip?: (id: string) => void;
  onSplitVideoClip?: (id: string) => void;
  onSplitTextClip?: (id: string) => void;
  onSplitSoundClip?: (id: string) => void;
  
  // 재생 제어
  pixelsPerSecond?: number;  // 줌 레벨 (1초 = 몇 픽셀인지)
  currentTime?: number;      // 현재 재생 위치 (초)
  totalDuration?: number;    // 전체 길이 (초)
  isPlaying?: boolean;       // 재생 중인지
  onSeek?: (time: number) => void;        // 재생 위치 변경
  onPlayPause?: () => void;               // 재생/정지 토글
  
  // 실행취소/재실행
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

/**
 * 메인 타임라인 컨테이너 함수
 * 
 * 🏗️ 함수 구조 설명:
 * 1. Props 받기 - 상위 컴포넌트에서 클립 데이터와 콜백 함수들 받음
 * 2. 상태 관리 - useTimelineState로 줌, 선택상태 등 관리
 * 3. 드래그 로직 - useTimelineDragLogic으로 클립 드래그 처리
 * 4. UI 렌더링 - 각 서브 컴포넌트들을 조합해서 완성된 타임라인 만들기
 * 
 * 📝 매개변수 설명:
 * - clips, textClips, soundClips: 타임라인에 보여줄 클립들
 * - onEdit..., onDelete..., onSplit... : 사용자가 버튼 클릭할 때 실행할 함수들
 * - currentTime, isPlaying: 현재 재생 상태
 * - pixelsPerSecond: 줌 레벨 (40이면 1초가 40픽셀로 표시)
 */
export function TimelineContainer({
  // 📊 데이터 props (타임라인에 표시할 클립들)
  clips,
  textClips = [],
  soundClips = [],
  soundLanes = [0],
  textLanes = [0], 
  videoLanes = [0],
  
  // 🛠️ 레인 관리 함수들 (새 레인 추가)
  onAddVideoLane,
  onAddTextLane, 
  onAddSoundLane,
  
  // ✏️ 클립 편집 함수들 (사용자 액션 시 호출됨)
  onEditTextClip,
  onEditSoundClip,
  onDeleteTextClip,
  onDeleteSoundClip,
  onDeleteVideoClip,
  onDuplicateVideoClip,
  onDuplicateTextClip,
  onDuplicateSoundClip,
  onSplitVideoClip,
  onSplitTextClip,
  onSplitSoundClip,
  
  // 🎮 재생 제어 props
  pixelsPerSecond: initialPixelsPerSecond = 40, // 기본 줌 레벨
  currentTime = 0,
  totalDuration,
  isPlaying = false,
  onSeek,
  onPlayPause,
  
  // 📚 실행취소/재실행
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: TimelineContainerProps) {
  
  /**
   * 🎛️ 상태 관리 훅 초기화
   * 
   * timelineState: 타임라인의 모든 상태를 중앙에서 관리
   * - 줌 레벨 (pixelsPerSecond): 사용자가 줌인/아웃할 때 변경
   * - 선택된 클립 (selectedClipId): 사용자가 클립 클릭할 때 변경
   * - 드래그 타겟 레인: 클립을 드래그할 때 어느 레인 위에 있는지
   * - 시간 계산: 총 시간, 타임라인 길이, 재생헤드 위치 등
   */
  const timelineState = useTimelineState({
    initialPixelsPerSecond,
    totalDuration,
    currentTime,
    clips,
    textClips,
    soundClips,
    videoLanes,
    textLanes,
    soundLanes,
  });
  
  /**
   * 🖱️ 드래그 로직 훅 초기화
   * 
   * dragLogic: 마우스로 클립을 드래그/리사이즈하는 모든 로직
   * - 클립 드래그: 클립을 다른 시간/레인으로 이동
   * - 클립 리사이즈: 클립의 시작/끝 지점을 조절해서 길이 변경
   * - 레인 감지: 드래그 중에 어느 레인 위에 있는지 실시간 감지
   * - 고스트 프리뷰: 드래그 중에 반투명한 미리보기 표시
   */
  const dragLogic = useTimelineDragLogic({
    clips,
    textClips,
    soundClips,
    videoLanes,
    textLanes,
    soundLanes,
    pixelsPerSecond: timelineState.pixelsPerSecond,
    currentTime,
    totalDurationInSeconds: timelineState.totalDurationInSeconds,
    timelineLengthInSeconds: timelineState.timelineLengthInSeconds,
    activeClip: timelineState.activeClip,
    activeClipType: timelineState.activeClipType,
    setActiveClipInfo: timelineState.setActiveClipInfo,
    dragTargetLane: timelineState.dragTargetLane,
    setDragTargetLane: timelineState.setDragTargetLane,
    lastHoverLane: timelineState.lastHoverLane,
    setLastHoverLane: timelineState.setLastHoverLane,
    latestValidLaneRef: timelineState.latestValidLaneRef,
    lastMouseX: timelineState.lastMouseX,
    setLastMouseX: timelineState.setLastMouseX,
    lastMouseY: timelineState.lastMouseY,
    setLastMouseY: timelineState.setLastMouseY,
    newLaneTargetType: timelineState.newLaneTargetType,
    setNewLaneTargetType: timelineState.setNewLaneTargetType,
    selectedClip: timelineState.selectedClip,
    selectedClipType: timelineState.selectedClipType,
    rectSelectedClips: timelineState.rectSelectedClips,
    selectClip: timelineState.selectClip,
    clearSelection: timelineState.clearSelection,
    setRectSelectedClips: timelineState.setRectSelectedClips,
    isDraggingPlayhead: false, // TODO: 재생헤드 드래그 상태 연결 필요
    setIsDraggingPlayhead: () => {}, // TODO: 재생헤드 드래그 함수 연결 필요
    askReplaceOnOverlap: timelineState.askReplaceOnOverlap,
    onSeek,
    onAddVideoLane,
    onAddTextLane,
    onAddSoundLane,
  });
  
  /**
   * 🎯 툴바 액션 핸들러
   * 
   * 사용자가 툴바의 버튼(편집, 복제, 분할, 삭제)을 클릭했을 때 실행되는 함수
   * 
   * 작동 방식:
   * 1. 'delete' 액션: 다중 선택된 클립들이 있으면 모두 삭제, 없으면 선택된 클립 하나 삭제
   * 2. 'edit', 'duplicate', 'split': 현재 선택된 클립에 대해서만 실행
   * 3. 각 클립 타입(video/text/sound)별로 해당하는 콜백 함수 호출
   * 
   * 예시: 사용자가 텍스트 클립을 선택하고 '편집' 버튼 클릭 → onEditTextClip 함수 호출
   */
  const handleToolbarAction = (action: 'edit' | 'duplicate' | 'split' | 'delete') => {
    // 삭제 액션: 다중 선택된 클립들 우선 처리
    if (action === 'delete') {
      if (timelineState.rectSelectedClips.length > 0) {
        // 다중 선택된 클립들을 각각 삭제
        timelineState.rectSelectedClips.forEach(({ id, type }) => {
          if (type === 'video' && onDeleteVideoClip) onDeleteVideoClip(id);
          if (type === 'text' && onDeleteTextClip) onDeleteTextClip(id);
          if (type === 'sound' && onDeleteSoundClip) onDeleteSoundClip(id);
        });
        // 선택 상태 초기화
        timelineState.setRectSelectedClips([]);
        timelineState.clearSelection();
        return;
      }
    }
    
    // 단일 클립 액션: 선택된 클립이 있어야 실행 가능
    if (!timelineState.selectedClip || !timelineState.selectedClipType) return;
    
    switch (action) {
      case 'edit':
        // 텍스트와 사운드 클립만 편집 가능 (비디오는 편집 불가)
        if (timelineState.selectedClipType === 'text' && onEditTextClip) {
          const clip = textClips.find(c => c.id === timelineState.selectedClip);
          if (clip) onEditTextClip(clip);
        } else if (timelineState.selectedClipType === 'sound' && onEditSoundClip) {
          const clip = soundClips.find(c => c.id === timelineState.selectedClip);
          if (clip) onEditSoundClip(clip);
        }
        break;
        
      case 'duplicate':
        // 모든 클립 타입에 대해 복제 가능
        if (timelineState.selectedClipType === 'video' && onDuplicateVideoClip) {
          onDuplicateVideoClip(timelineState.selectedClip);
        } else if (timelineState.selectedClipType === 'text' && onDuplicateTextClip) {
          onDuplicateTextClip(timelineState.selectedClip);
        } else if (timelineState.selectedClipType === 'sound' && onDuplicateSoundClip) {
          onDuplicateSoundClip(timelineState.selectedClip);
        }
        break;
        
      case 'split':
        // 재생헤드 위치에서 클립을 둘로 나누기
        if (timelineState.selectedClipType === 'video' && onSplitVideoClip) {
          onSplitVideoClip(timelineState.selectedClip);
        } else if (timelineState.selectedClipType === 'text' && onSplitTextClip) {
          onSplitTextClip(timelineState.selectedClip);
        } else if (timelineState.selectedClipType === 'sound' && onSplitSoundClip) {
          onSplitSoundClip(timelineState.selectedClip);
        }
        break;
        
      case 'delete':
        // 단일 클립 삭제
        if (timelineState.selectedClipType === 'video' && onDeleteVideoClip) {
          onDeleteVideoClip(timelineState.selectedClip);
        } else if (timelineState.selectedClipType === 'text' && onDeleteTextClip) {
          onDeleteTextClip(timelineState.selectedClip);
        } else if (timelineState.selectedClipType === 'sound' && onDeleteSoundClip) {
          onDeleteSoundClip(timelineState.selectedClip);
        }
        timelineState.clearSelection(); // 삭제 후 선택 해제
        break;
    }
  };
  
  /**
   * 📍 DOM 참조
   * 
   * containerRef: 스크롤 가능한 타임라인 영역의 DOM 참조
   * - TimelinePlayheadController에서 마우스 위치 계산에 사용
   * - 클릭한 위치를 시간으로 변환할 때 필요한 기준점 제공
   */
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  /**
   * 🎨 UI 렌더링
   * 
   * 타임라인 전체 구조:
   * 1. TimelineControls: 상단 재생/일시정지, 실행취소/재실행 버튼
   * 2. TimelineToolbar: 클립 편집 액션 버튼들 (편집, 복제, 분할, 삭제)
   * 3. 왼쪽 레이블 영역: 각 트랙의 이름 표시 (Video 1, Text 1, Sound 1...)
   * 4. 오른쪽 스크롤 영역: 
   *    - TimelineRuler: 시간 눈금 (0s, 1s, 2s...)
   *    - TimelinePlayheadController: 빨간색 재생 위치 선
   *    - TimelineGrid: 배경 격자무늬
   *    - TimelineTrack들: 실제 클립들이 표시되는 트랙들
   *    - TimelineSelectionBox: 드래그로 다중 선택할 때 나타나는 박스
   */
  return (
    <div className="bg-gray-800 border-t border-gray-700 flex flex-col h-full select-none">
      {/* 🎮 상단 재생 컨트롤 바 */}
      <TimelineControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        totalDuration={timelineState.totalDurationInSeconds}
        onPlayPause={onPlayPause || (() => {})}
        onSeek={onSeek || (() => {})}
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      
      <div className="relative flex-1 overflow-y-auto min-h-0 timeline-content">
        {/* 🛠️ 편집 액션 툴바 (편집, 복제, 분할, 삭제 버튼) */}
        <TimelineToolbar
          selectedClip={timelineState.selectedClip}
          selectedClipType={timelineState.selectedClipType}
          rectSelectedClips={timelineState.rectSelectedClips}
          clips={clips}
          textClips={textClips}
          soundClips={soundClips}
          videoLanes={videoLanes}
          textLanes={textLanes}
          soundLanes={soundLanes}
          currentTime={currentTime}
          onToolbarAction={handleToolbarAction}
          onAddVideoLane={onAddVideoLane || (() => {})}
          onAddTextLane={onAddTextLane || (() => {})}
          onAddSoundLane={onAddSoundLane || (() => {})}
        />
        
        {/* 📐 메인 타임라인 영역 (좌우 분할) */}
        <div className="flex overflow-x-auto">
          {/* 📝 왼쪽 고정 레이블 영역 (트랙 이름들) */}
          <div className="flex-shrink-0 w-48">
            {/* 헤더 */}
            <div className="border-b border-r border-gray-700 p-1 h-8 flex items-center justify-center">
              <span className="text-[10px] text-gray-400 font-medium">Timeline</span>
            </div>
            
            {/* 각 트랙별 레이블 영역 */}
            <div className="border-r border-gray-700 bg-gray-900 min-h-[200px]">
              {/* 비디오 트랙 레이블들 */}
              {videoLanes.map((laneIndex) => (
                <div 
                  key={`video-label-${laneIndex}`}
                  className="h-8 border-b border-gray-700 px-2 flex items-center text-xs text-gray-400"
                >
                  Video {laneIndex + 1}
                </div>
              ))}
              
              {/* 텍스트 트랙 레이블들 */}
              {textLanes.map((laneIndex) => (
                <div 
                  key={`text-label-${laneIndex}`}
                  className="h-8 border-b border-gray-700 px-2 flex items-center text-xs text-gray-400"
                >
                  Text {laneIndex + 1}
                </div>
              ))}
              
              {/* 사운드 트랙 레이블들 (높이 48px로 더 큼) */}
              {soundLanes.map((laneIndex) => (
                <div 
                  key={`sound-label-${laneIndex}`}
                  className="h-12 border-b border-gray-700 px-2 flex items-center text-xs text-gray-400"
                >
                  Sound {laneIndex + 1}
                </div>
              ))}
            </div>
          </div>
          
          {/* 📏 오른쪽 스크롤 가능한 타임라인 영역 */}
          <div className="flex-1 relative" ref={containerRef}>
            {/* ⏱️ 시간 눈금자 (0초, 1초, 2초...) */}
            <TimelineRuler
              timelineLengthInSeconds={timelineState.timelineLengthInSeconds}
              pixelsPerSecond={timelineState.pixelsPerSecond}
              totalDurationInSeconds={timelineState.totalDurationInSeconds}
              onSeek={onSeek}
              isSelectingRange={false} // TODO: 드래그 선택 상태 연결 필요
              isAdjustingSelection={false}
              isMovingSelection={false}
              isResizing={false}
              isDragging={false}
            />
            
            {/* 재생헤드 (빨간 세로 선) */}
            <TimelinePlayheadController
              currentTime={currentTime}
              pixelsPerSecond={timelineState.pixelsPerSecond}
              totalDurationInSeconds={timelineState.totalDurationInSeconds}
              isDraggingPlayhead={false} // TODO: 재생헤드 드래그 상태 연결 필요
              setIsDraggingPlayhead={() => {}} // TODO: 재생헤드 드래그 함수 연결 필요
              onSeek={onSeek}
              containerRef={containerRef as React.RefObject<HTMLDivElement>}
            />
            
            {/* 🌐 배경 격자무늬 */}
            <TimelineGrid
              timelineLengthInSeconds={timelineState.timelineLengthInSeconds}
              pixelsPerSecond={timelineState.pixelsPerSecond}
              height={400} // TODO: 실제 트랙 높이에 맞춰 동적 계산 필요
            />
            
            {/* 🎬 실제 클립들이 표시되는 트랙들 */}
            <div className="relative">
              {/* 비디오 트랙들 (높이 32px) */}
              {videoLanes.map((laneIndex) => (
                <TimelineTrack
                  key={`video-track-${laneIndex}`}
                  type="video"
                  clips={clips.filter(c => (c.laneIndex ?? 0) === laneIndex)}
                  laneIndex={laneIndex}
                  selectedClips={timelineState.selectedClipId ? [timelineState.selectedClipId] : []}
                  rectSelectedClips={timelineState.rectSelectedClips}
                  onClipClick={timelineState.selectClip}
                  onMouseDown={dragLogic.handleMouseDown}
                  onResizeStart={dragLogic.handleResizeStart}
                />
              ))}
              
              {/* 텍스트 트랙들 (높이 32px) */}
              {textLanes.map((laneIndex) => (
                <TimelineTrack
                  key={`text-track-${laneIndex}`}
                  type="text"
                  clips={textClips.filter(c => (c.laneIndex ?? 0) === laneIndex)}
                  laneIndex={laneIndex}
                  selectedClips={timelineState.selectedClipId ? [timelineState.selectedClipId] : []}
                  rectSelectedClips={timelineState.rectSelectedClips}
                  onClipClick={timelineState.selectClip}
                  onMouseDown={dragLogic.handleMouseDown}
                  onResizeStart={dragLogic.handleResizeStart}
                />
              ))}
              
              {/* 사운드 트랙들 (높이 48px, 파형 표시 공간 필요) */}
              {soundLanes.map((laneIndex) => (
                <TimelineTrack
                  key={`sound-track-${laneIndex}`}
                  type="sound"
                  clips={soundClips.filter(c => (c.laneIndex ?? 0) === laneIndex)}
                  laneIndex={laneIndex}
                  selectedClips={timelineState.selectedClipId ? [timelineState.selectedClipId] : []}
                  rectSelectedClips={timelineState.rectSelectedClips}
                  onClipClick={timelineState.selectClip}
                  onMouseDown={dragLogic.handleMouseDown}
                  onResizeStart={dragLogic.handleResizeStart}
                />
              ))}
            </div>
            
            {/* 📦 다중 선택 박스 (드래그로 여러 클립 선택시 나타남) */}
            <TimelineSelectionBox
              left={0}    // TODO: 실제 선택 영역 좌표로 연결 필요
              top={0}     // TODO: 실제 선택 영역 좌표로 연결 필요
              width={0}   // TODO: 실제 선택 영역 크기로 연결 필요
              height={0}  // TODO: 실제 선택 영역 크기로 연결 필요
              isActive={false} // TODO: 선택 중인지 상태 연결 필요
            />
          </div>
        </div>
      </div>
    </div>
  );
}
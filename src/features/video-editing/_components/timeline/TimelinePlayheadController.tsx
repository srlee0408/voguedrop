'use client';

/**
 * TimelinePlayheadController - 재생헤드 드래그 및 위치 제어
 * 
 * 주요 역할:
 * 1. 재생헤드(빨간 선) 위치 계산 및 표시
 * 2. 재생헤드 드래그로 영상 탐색 (Seek) 기능 제공
 * 3. 마우스 근접 감지로 정확한 드래그 시작점 판단
 * 4. 드래그 중 실시간 시간 업데이트 및 커서 변경
 * 
 * 핵심 기능:
 * - 8픽셀 이내 근접 감지로 정확한 드래그 시작
 * - 3분(180초) 제한 및 실제 컨텐츠 길이 제한 적용
 * - 전역 마우스 이벤트로 타임라인 영역 밖에서도 드래그 지원
 * - 드래그 중 시각적 피드백 (커서 변경: col-resize)
 * 
 * 사용법:
 * ```tsx
 * <TimelinePlayheadController
 *   currentTime={30}                    // 현재 재생 시간 (30초)
 *   pixelsPerSecond={40}               // 줌 레벨 (1초당 40픽셀)
 *   totalDurationInSeconds={120}       // 총 영상 길이 (2분)
 *   isDraggingPlayhead={false}         // 드래그 상태
 *   setIsDraggingPlayhead={setDrag}    // 드래그 상태 변경
 *   onSeek={(time) => seekTo(time)}    // 시간 이동 콜백
 *   containerRef={timelineRef}         // 타임라인 컨테이너 참조
 * />
 * ```
 * 
 * 주의사항:
 * - 드래그 중에는 다른 타임라인 인터랙션과 충돌할 수 있음
 * - 컨테이너 ref가 null이면 위치 계산 불가
 * - 마우스 이벤트가 전역으로 등록되므로 cleanup 필수
 */

import React, { useEffect, useCallback } from 'react';
import TimelinePlayhead from '@/app/video-editor/_components/TimelinePlayhead';

/**
 * 재생헤드 컨트롤러 Props 인터페이스
 * 
 * 📋 Props 그룹별 설명:
 * 
 * 🕐 **시간 및 위치 관련**:
 * - currentTime: 현재 재생 중인 시간 (초 단위)
 * - pixelsPerSecond: 타임라인 줌 레벨 (1초를 몇 픽셀로 표시할지)
 * - totalDurationInSeconds: 영상의 실제 길이 (드래그 범위 제한용)
 * 
 * 🖱️ **드래그 상태 관리**:
 * - isDraggingPlayhead: 현재 재생헤드를 드래그 중인지 여부
 * - setIsDraggingPlayhead: 드래그 상태를 변경하는 함수
 * 
 * 🎯 **이벤트 핸들러**:
 * - onSeek: 사용자가 재생헤드를 이동시켰을 때 호출되는 함수
 * 
 * 📐 **레이아웃 참조**:
 * - containerRef: 타임라인 컨테이너 DOM 요소 (상대 위치 계산용)
 */
interface TimelinePlayheadControllerProps {
  /** 🕐 현재 재생 시간 (초) - 예: 30 = 30초 지점 */
  currentTime: number;
  
  /** 📏 줌 레벨 - 1초당 픽셀 수 - 예: 40 = 1초당 40픽셀로 표시 */
  pixelsPerSecond: number;
  
  /** ⏱️ 실제 컨텐츠 총 시간 (초) - 드래그 제한용 - 예: 180 = 3분 영상 */
  totalDurationInSeconds: number;
  
  /** 🖱️ 재생헤드 드래그 상태 - true일 때 드래그 중 */
  isDraggingPlayhead: boolean;
  /** 🖱️ 재생헤드 드래그 상태 변경 함수 */
  setIsDraggingPlayhead: (dragging: boolean) => void;
  
  /** 🎯 시간 변경 핸들러 - 새로운 시간으로 이동 요청 시 호출 */
  onSeek?: (time: number) => void;
  
  /** 📐 타임라인 컨테이너 참조 - 상대 위치 계산용 DOM 요소 */
  containerRef: React.RefObject<HTMLDivElement>;
}

/**
 * 마우스 위치가 재생헤드 근처에 있는지 확인하는 유틸리티 함수
 * 
 * 📌 동작 원리:
 * 1. 마우스 절대 좌표를 타임라인 상대 좌표로 변환
 * 2. 재생헤드 위치와의 거리 계산
 * 3. 8픽셀 이내면 "근접"으로 판단
 * 
 * @param clientX - 마우스 절대 X 좌표 (화면 기준)
 * @param containerRef - 타임라인 컨테이너 참조
 * @param playheadPosition - 재생헤드 픽셀 위치 (컨테이너 내 상대 위치)
 * @returns 근접 여부 (8픽셀 이내면 true)
 * 
 * 💡 사용 예시:
 * ```typescript
 * const isNear = isMouseNearPlayhead(event.clientX, containerRef, 120);
 * if (isNear) {
 *   // 커서를 'col-resize'로 변경하여 드래그 가능함을 표시
 * }
 * ```
 */
function isMouseNearPlayhead(
  clientX: number, 
  containerRef: React.RefObject<HTMLDivElement>, 
  playheadPosition: number
): boolean {
  const container = containerRef.current;
  if (!container) return false;
  
  // 🖼️ 컨테이너의 화면 상 위치 정보 가져오기
  const rect = container.getBoundingClientRect();
  // 📐 마우스의 절대 좌표를 컨테이너 내 상대 좌표로 변환
  const relativeX = clientX - rect.left;
  
  // 🎯 8픽셀 이내면 근접한 것으로 간주 (사용자 친화적인 드래그 영역)
  return Math.abs(relativeX - playheadPosition) < 8;
}

/**
 * 마우스 X 좌표를 시간으로 변환하고 제한 적용하는 핵심 함수
 * 
 * 📌 변환 과정:
 * 1. 마우스 절대 좌표 → 타임라인 상대 좌표
 * 2. 픽셀 거리 → 시간 (초) 변환
 * 3. 시간 범위 제한 적용 (0초 ~ 3분 or 실제 길이)
 * 
 * @param clientX - 마우스 절대 X 좌표 (화면 기준)
 * @param containerRef - 타임라인 컨테이너 참조
 * @param pixelsPerSecond - 줌 레벨 (1초 = n픽셀)
 * @param totalDurationInSeconds - 실제 컨텐츠 길이 (초)
 * @returns 계산된 시간 (초) - 제한 범위 내로 조정됨
 * 
 * 💡 계산 예시:
 * ```
 * 마우스가 타임라인 시작점에서 400픽셀 떨어진 곳에 있고
 * pixelsPerSecond가 40이라면:
 * 400px ÷ 40px/초 = 10초
 * ```
 */
function calculateTimeFromMouse(
  clientX: number,
  containerRef: React.RefObject<HTMLDivElement>,
  pixelsPerSecond: number,
  totalDurationInSeconds: number
): number {
  const container = containerRef.current;
  if (!container) return 0;
  
  // 🖼️ 컨테이너 위치 정보 가져오기
  const rect = container.getBoundingClientRect();
  // 📐 마우스 절대 좌표를 컨테이너 내 상대 좌표로 변환
  const relativeX = clientX - rect.left;
  // ⏱️ 픽셀 거리를 시간으로 변환 (픽셀 ÷ 픽셀/초 = 초)
  const rawTime = relativeX / pixelsPerSecond;
  
  // 🚧 시간 범위 제한 적용
  // 0초 이하는 0으로, 3분(180초) 또는 실제 길이를 넘지 않도록 제한
  const maxTime = Math.min(180, totalDurationInSeconds); // 3분 제한
  return Math.max(0, Math.min(rawTime, maxTime));
}

/**
 * 재생헤드 컨트롤러 메인 컴포넌트
 * 
 * 📌 컴포넌트 구조:
 * 1. 재생헤드 위치 계산 (시간 → 픽셀 변환)
 * 2. 근접 감지 함수 메모화
 * 3. 드래그 이벤트 핸들러 정의
 * 4. 전역 마우스 이벤트 리스너 등록 (드래그 중)
 * 5. 커서 변경 로직 (재생헤드 근처에서)
 * 6. TimelinePlayhead 컴포넌트 렌더링
 */
export function TimelinePlayheadController({
  currentTime,
  pixelsPerSecond,
  totalDurationInSeconds,
  isDraggingPlayhead,
  setIsDraggingPlayhead,
  onSeek,
  containerRef,
}: TimelinePlayheadControllerProps) {
  
  // 🎯 재생헤드 픽셀 위치 계산 (시간 × 줌 레벨 = 픽셀 위치)
  // 예: 30초 × 40픽셀/초 = 1200픽셀 위치
  const playheadPosition = currentTime * pixelsPerSecond;
  
  /**
   * 마우스가 재생헤드 근처에 있는지 확인하는 메모화된 함수
   * 
   * 📌 메모화 이유:
   * - playheadPosition이 변경될 때만 함수 재생성
   * - 불필요한 리렌더링 방지로 성능 최적화
   * - 마우스 이벤트 핸들러에서 자주 호출되므로 최적화 필수
   */
  const isNearPlayhead = useCallback((clientX: number): boolean => {
    return isMouseNearPlayhead(clientX, containerRef, playheadPosition);
  }, [containerRef, playheadPosition]);
  
  /**
   * 재생헤드 직접 클릭 핸들러
   * 
   * 📌 동작 과정:
   * 1. 이벤트 전파 중단 (다른 타임라인 클릭 이벤트와 충돌 방지)
   * 2. 드래그 상태를 true로 변경
   * 3. useEffect에서 전역 마우스 이벤트 등록됨
   * 
   * 🚧 주의사항:
   * - preventDefault()로 기본 동작 차단
   * - stopPropagation()으로 이벤트 버블링 방지
   */
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();    // 🚫 기본 마우스 동작 차단
    e.stopPropagation();   // 🚫 이벤트 전파 중단
    setIsDraggingPlayhead(true);  // 🖱️ 드래그 상태 활성화
  };
  
  /**
   * 재생헤드 드래그 처리 useEffect
   * 전역 마우스 이벤트로 화면 밖 드래그도 지원
   * 
   * 📌 핵심 기능:
   * 1. 드래그 중일 때만 전역 마우스 이벤트 등록
   * 2. 마우스 이동 시 실시간 시간 계산 및 업데이트
   * 3. 마우스 업 시 드래그 종료
   * 4. cleanup 함수로 메모리 누수 방지
   * 
   * 🌟 전역 이벤트 사용 이유:
   * - 타임라인 영역 밖에서도 드래그 계속 가능
   * - 빠른 마우스 이동 시에도 놓치지 않음
   * - 사용자 경험 향상 (드래그 중 마우스가 벗어나도 OK)
   */
  useEffect(() => {
    // 🚧 드래그 중이 아니거나 시간 변경 콜백이 없으면 이벤트 등록 안함
    if (!isDraggingPlayhead || !onSeek) return;
    
    /**
     * 마우스 이동 중 시간 계산 및 업데이트 핸들러
     */
    const handlePlayheadMouseMove = (e: MouseEvent) => {
      // 📐 현재 마우스 위치를 시간으로 변환
      const newTime = calculateTimeFromMouse(
        e.clientX,                    // 마우스 X 좌표
        containerRef,                 // 타임라인 컨테이너 참조
        pixelsPerSecond,             // 줌 레벨
        totalDurationInSeconds       // 최대 시간 제한
      );
      // 🎯 계산된 시간으로 재생 위치 업데이트
      onSeek(newTime);
    };

    /**
     * 마우스 업 시 드래그 종료 핸들러
     */
    const handlePlayheadMouseUp = () => {
      setIsDraggingPlayhead(false);  // 🔚 드래그 상태 비활성화
    };

    // 🌐 전역 이벤트 리스너 등록 (document에 등록하여 화면 전체에서 동작)
    document.addEventListener('mousemove', handlePlayheadMouseMove);
    document.addEventListener('mouseup', handlePlayheadMouseUp);
    
    // 🧹 정리 함수 - 컴포넌트 언마운트 또는 의존성 변경 시 이벤트 제거
    return () => {
      document.removeEventListener('mousemove', handlePlayheadMouseMove);
      document.removeEventListener('mouseup', handlePlayheadMouseUp);
    };
  }, [isDraggingPlayhead, onSeek, containerRef, pixelsPerSecond, totalDurationInSeconds, setIsDraggingPlayhead]);
  
  /**
   * 재생헤드 근처에서 커서 변경 처리 useEffect
   * 다른 인터랙션 중이 아닐 때만 동작
   * 
   * 📌 기능 설명:
   * 1. 마우스가 재생헤드 8픽셀 이내에 있을 때 커서를 'col-resize'로 변경
   * 2. 재생헤드에서 벗어나면 커서를 기본 상태로 복원
   * 3. 시각적 피드백으로 드래그 가능성을 사용자에게 알림
   * 
   * 🎯 UX 개선 효과:
   * - 사용자가 드래그 가능 영역을 직관적으로 인식
   * - 정밀한 재생 위치 조정 시 도움
   * - 타임라인 인터페이스의 전문성 향상
   * 
   * 🚧 TODO: 다른 드래그 작업 중일 때 커서 변경 방지 로직 추가 필요
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    /**
     * 마우스 이동 시 커서 변경 핸들러
     */
    const handleMouseMove = (e: MouseEvent) => {
      // 🚧 TODO: 다른 드래그나 선택 작업 중일 때는 커서 변경하지 않도록 개선 필요
      // 이 부분은 부모 컴포넌트에서 상태를 전달받아야 함
      
      // 🎯 재생헤드 근처 여부 확인
      if (isNearPlayhead(e.clientX)) {
        // ↔️ 크기 조정 커서로 변경 (드래그 가능함을 시각적으로 표시)
        container.style.cursor = 'col-resize';
      } else {
        // 🔄 기본 커서로 복원
        container.style.cursor = '';
      }
    };
    
    // 🎧 컨테이너에 마우스 이벤트 리스너 등록
    container.addEventListener('mousemove', handleMouseMove);
    
    // 🧹 정리 함수
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      // 🔄 정리 시 커서 초기화 (메모리 누수 방지)
      container.style.cursor = '';
    };
  }, [containerRef, isNearPlayhead]);

  // 🎬 렌더링: TimelinePlayhead 컴포넌트에 계산된 위치와 핸들러 전달
  return (
    <TimelinePlayhead
      position={playheadPosition}           // 📍 계산된 픽셀 위치
      onMouseDown={handlePlayheadMouseDown} // 🖱️ 드래그 시작 핸들러
    />
  );
}

/**
 * 재생헤드 근처 클릭 감지를 위한 유틸리티 함수
 * 다른 컴포넌트에서 재생헤드 드래그 시작을 위해 사용
 * 
 * 📌 사용 사례:
 * - 타임라인 컨테이너에서 일반 클릭 vs 재생헤드 클릭 구분
 * - 다른 드래그 로직에서 재생헤드 우선순위 처리
 * - 복잡한 인터랙션에서 재생헤드 감지 필요 시
 * 
 * @param clientX - 마우스 절대 X 좌표
 * @param containerRef - 타임라인 컨테이너 참조
 * @param currentTime - 현재 재생 시간 (초)
 * @param pixelsPerSecond - 줌 레벨 (픽셀/초)
 * @returns 재생헤드 근처 클릭 여부
 * 
 * 💡 사용 예시:
 * ```typescript
 * if (checkPlayheadClick(event.clientX, containerRef, currentTime, 40)) {
 *   // 재생헤드 드래그 시작
 *   startPlayheadDrag();
 * } else {
 *   // 일반 타임라인 클릭 처리
 *   handleTimelineClick();
 * }
 * ```
 */
export function checkPlayheadClick(
  clientX: number,
  containerRef: React.RefObject<HTMLDivElement>,
  currentTime: number,
  pixelsPerSecond: number
): boolean {
  // 🎯 현재 시간을 픽셀 위치로 변환
  const playheadPosition = currentTime * pixelsPerSecond;
  // 🔍 마우스가 재생헤드 근처에 있는지 확인
  return isMouseNearPlayhead(clientX, containerRef, playheadPosition);
}

/**
 * 마우스 위치를 시간으로 변환하는 유틸리티 함수
 * 다른 컴포넌트에서 시간 계산에 사용
 * 
 * 📌 사용 사례:
 * - 타임라인 클릭 시 해당 시간으로 이동
 * - 클립 배치 시 시간 위치 계산
 * - 마커 생성 시 시간 위치 확인
 * - 드래그 앤 드롭에서 시간 기반 위치 결정
 * 
 * @param clientX - 마우스 절대 X 좌표
 * @param containerRef - 타임라인 컨테이너 참조  
 * @param pixelsPerSecond - 줌 레벨 (픽셀/초)
 * @param totalDurationInSeconds - 최대 허용 시간 (초)
 * @returns 계산된 시간 (초) - 0~최대시간 범위로 제한됨
 * 
 * 💡 사용 예시:
 * ```typescript
 * const clickTime = mouseToTime(event.clientX, containerRef, 40, 180);
 * seekToTime(clickTime); // 클릭한 위치의 시간으로 이동
 * ```
 */
export function mouseToTime(
  clientX: number,
  containerRef: React.RefObject<HTMLDivElement>,
  pixelsPerSecond: number,
  totalDurationInSeconds: number
): number {
  // 🔄 내부 함수 호출로 시간 계산 (DRY 원칙)
  return calculateTimeFromMouse(clientX, containerRef, pixelsPerSecond, totalDurationInSeconds);
}
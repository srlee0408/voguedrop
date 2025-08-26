/**
 * Canvas Active Jobs Storage (sessionStorage 기반)
 * - 페이지 이동 간에도 진행 중 작업 정보를 보존하여 복원에 사용
 */

export interface ActiveJobInfo {
  /** 슬롯 인덱스 */
  slot_index: number;
  /** 작업 시작 시각 (ms since epoch) */
  started_at: number;
  /** 마지막으로 표시한 진행률 (0-100) */
  last_progress: number;
  /** 입력 이미지 URL (슬롯 매핑 힌트) */
  image_url: string;
}

export interface ActiveJobsState {
  [job_id: string]: ActiveJobInfo;
}

const STORAGE_KEY = 'voguedrop_canvas_active_jobs_v1';

/**
 * sessionStorage에서 활성 작업 전체를 로드
 */
export function get_active_jobs(): ActiveJobsState {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ActiveJobsState;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * 활성 작업 전체를 저장
 */
export function set_active_jobs(state: ActiveJobsState): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 저장 실패는 무시 (용량 등)
  }
}

/**
 * 단일 작업 정보를 추가/갱신
 */
export function upsert_active_job(job_id: string, info: ActiveJobInfo): void {
  const current = get_active_jobs();
  current[job_id] = info;
  set_active_jobs(current);
}

/**
 * 단일 작업 일부 필드를 업데이트
 */
export function update_active_job(job_id: string, partial: Partial<ActiveJobInfo>): void {
  const current = get_active_jobs();
  const existing = current[job_id];
  if (!existing) return;
  current[job_id] = { ...existing, ...partial };
  set_active_jobs(current);
}

/**
 * 단일 작업 제거
 */
export function remove_active_job(job_id: string): void {
  const current = get_active_jobs();
  if (current[job_id]) {
    delete current[job_id];
    set_active_jobs(current);
  }
}

/**
 * 모든 작업 제거
 */
export function clear_active_jobs(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}



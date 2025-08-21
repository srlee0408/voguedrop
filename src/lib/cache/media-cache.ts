/**
 * IndexedDB 기반 미디어 캐싱 시스템
 * 
 * 비디오, 오디오, 썸네일 등의 미디어 파일을 효율적으로 캐싱하고
 * LRU 알고리즘을 통해 메모리를 관리합니다.
 * 
 * 주요 기능:
 * - 미디어 파일 Blob 캐싱
 * - 비디오 메타데이터 캐싱
 * - 썸네일 이미지 캐싱
 * - 오디오 웨이브폼 데이터 캐싱
 * - 자동 가비지 컬렉션 (100MB 제한)
 */

import { VideoMetadata } from '@/app/video-editor/_utils/video-metadata';

// IndexedDB 설정
const DB_NAME = 'VogueDropMediaCache';
const DB_VERSION = 1;
const STORE_NAME = 'mediaCache';
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB

// 캐시 엔트리 타입 정의
export interface MediaCacheEntry {
  /** 캐시 키 (URL 기반) */
  id: string;
  /** 원본 미디어 URL */
  url: string;
  /** 미디어 파일 Blob */
  blob: Blob;
  /** 미디어 타입 */
  type: 'video' | 'audio' | 'image';
  /** 비디오 메타데이터 (비디오인 경우) */
  metadata?: VideoMetadata;
  /** 썸네일 이미지 (비디오인 경우) */
  thumbnail?: Blob;
  /** 오디오 웨이브폼 데이터 (오디오인 경우) */
  waveform?: Float32Array;
  /** 생성 시간 */
  createdAt: number;
  /** 마지막 접근 시간 */
  lastAccessed: number;
  /** 파일 크기 (바이트) */
  size: number;
}

// 캐시 통계
export interface CacheStats {
  totalSize: number;
  entryCount: number;
  hitRate: number;
  lastCleanup: number;
}

// 캐시 키 생성
function generateCacheKey(url: string, type: string): string {
  return `${type}_${btoa(url).replace(/[+/=]/g, '_')}`;
}

// IndexedDB 초기화
async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('size', 'size', { unique: false });
      }
    };
  });
}

/**
 * 미디어 캐시 매니저 클래스
 */
class MediaCacheManager {
  private db: IDBDatabase | null = null;
  private stats: CacheStats = {
    totalSize: 0,
    entryCount: 0,
    hitRate: 0,
    lastCleanup: 0
  };
  private hitCount = 0;
  private missCount = 0;

  /**
   * 캐시 매니저 초기화
   */
  async init(): Promise<void> {
    if (this.db) return;
    
    try {
      this.db = await initDB();
      await this.updateStats();
      
      // 초기화 시 필요하면 정리 실행
      if (this.stats.totalSize > MAX_CACHE_SIZE) {
        await this.cleanup();
      }
    } catch (error) {
      console.error('Failed to initialize media cache:', error);
      throw error;
    }
  }

  /**
   * 미디어 파일 캐싱
   */
  async set(url: string, blob: Blob, options: {
    type: 'video' | 'audio' | 'image';
    metadata?: VideoMetadata;
    thumbnail?: Blob;
    waveform?: Float32Array;
  }): Promise<void> {
    if (!this.db) await this.init();
    
    const id = generateCacheKey(url, options.type);
    const now = Date.now();
    
    // 썸네일과 웨이브폼 크기도 포함
    let totalSize = blob.size;
    if (options.thumbnail) totalSize += options.thumbnail.size;
    if (options.waveform) totalSize += options.waveform.byteLength;
    
    const entry: MediaCacheEntry = {
      id,
      url,
      blob,
      type: options.type,
      metadata: options.metadata,
      thumbnail: options.thumbnail,
      waveform: options.waveform,
      createdAt: now,
      lastAccessed: now,
      size: totalSize
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      transaction.oncomplete = async () => {
        await this.updateStats();
        
        // 크기 제한 확인 및 정리
        if (this.stats.totalSize > MAX_CACHE_SIZE) {
          await this.cleanup();
        }
        
        resolve();
      };
      
      transaction.onerror = () => reject(transaction.error);
      
      store.put(entry);
    });
  }

  /**
   * 미디어 파일 조회
   */
  async get(url: string, type: 'video' | 'audio' | 'image'): Promise<MediaCacheEntry | null> {
    if (!this.db) await this.init();
    
    const id = generateCacheKey(url, type);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      
      request.onsuccess = () => {
        const entry = request.result as MediaCacheEntry | undefined;
        
        if (entry) {
          // 마지막 접근 시간 업데이트
          entry.lastAccessed = Date.now();
          store.put(entry);
          
          this.hitCount++;
          resolve(entry);
        } else {
          this.missCount++;
          resolve(null);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 특정 엔트리 삭제
   */
  async delete(url: string, type: 'video' | 'audio' | 'image'): Promise<void> {
    if (!this.db) await this.init();
    
    const id = generateCacheKey(url, type);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      transaction.oncomplete = async () => {
        await this.updateStats();
        resolve();
      };
      
      transaction.onerror = () => reject(transaction.error);
      
      store.delete(id);
    });
  }

  /**
   * 전체 캐시 클리어
   */
  async clear(): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      transaction.oncomplete = async () => {
        await this.updateStats();
        resolve();
      };
      
      transaction.onerror = () => reject(transaction.error);
      
      store.clear();
    });
  }

  /**
   * LRU 기반 캐시 정리
   */
  async cleanup(): Promise<void> {
    if (!this.db) await this.init();
    
    const targetSize = MAX_CACHE_SIZE * 0.8; // 80%까지 줄임
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('lastAccessed');
      
      // 오래된 순서로 정렬하여 조회
      const request = index.openCursor();
      const entriesToDelete: string[] = [];
      let currentSize = this.stats.totalSize;
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor && currentSize > targetSize) {
          const entry = cursor.value as MediaCacheEntry;
          entriesToDelete.push(entry.id);
          currentSize -= entry.size;
          cursor.continue();
        } else {
          // 삭제 실행
          Promise.all(
            entriesToDelete.map(id => {
              return new Promise<void>((res, rej) => {
                const deleteRequest = store.delete(id);
                deleteRequest.onsuccess = () => res();
                deleteRequest.onerror = () => rej(deleteRequest.error);
              });
            })
          ).then(async () => {
            await this.updateStats();
            this.stats.lastCleanup = Date.now();
            resolve();
          }).catch(reject);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 캐시 통계 업데이트
   */
  private async updateStats(): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const entries = request.result as MediaCacheEntry[];
        
        this.stats.totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
        this.stats.entryCount = entries.length;
        
        const totalRequests = this.hitCount + this.missCount;
        this.stats.hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;
        
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 캐시 통계 조회
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 특정 타입의 엔트리 수 조회
   */
  async getEntriesByType(type: 'video' | 'audio' | 'image'): Promise<MediaCacheEntry[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('type');
      const request = index.getAll(type);
      
      request.onsuccess = () => resolve(request.result as MediaCacheEntry[]);
      request.onerror = () => reject(request.error);
    });
  }
}

// 싱글톤 인스턴스
const mediaCacheManager = new MediaCacheManager();

// 공개 API
export const mediaCache = {
  /**
   * 초기화
   */
  init: () => mediaCacheManager.init(),

  /**
   * 미디어 파일 저장
   */
  setVideo: (url: string, blob: Blob, metadata?: VideoMetadata, thumbnail?: Blob) => 
    mediaCacheManager.set(url, blob, { type: 'video', metadata, thumbnail }),

  setAudio: (url: string, blob: Blob, waveform?: Float32Array) => 
    mediaCacheManager.set(url, blob, { type: 'audio', waveform }),

  setImage: (url: string, blob: Blob) => 
    mediaCacheManager.set(url, blob, { type: 'image' }),

  /**
   * 미디어 파일 조회
   */
  getVideo: (url: string) => mediaCacheManager.get(url, 'video'),
  getAudio: (url: string) => mediaCacheManager.get(url, 'audio'),
  getImage: (url: string) => mediaCacheManager.get(url, 'image'),

  /**
   * 삭제 및 정리
   */
  delete: (url: string, type: 'video' | 'audio' | 'image') => 
    mediaCacheManager.delete(url, type),
  clear: () => mediaCacheManager.clear(),
  cleanup: () => mediaCacheManager.cleanup(),

  /**
   * 통계 및 정보
   */
  getStats: () => mediaCacheManager.getStats(),
  getEntriesByType: (type: 'video' | 'audio' | 'image') => 
    mediaCacheManager.getEntriesByType(type)
};
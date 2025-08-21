/**
 * API 응답 캐싱 유틸리티
 * 
 * SoundLibraryModal 등의 API 응답을 IndexedDB에 캐싱하여
 * 네트워크 요청을 줄이고 사용자 경험을 향상시킵니다.
 */

// IndexedDB 설정
const API_CACHE_DB_NAME = 'VogueDropAPICache';
const API_CACHE_DB_VERSION = 1;
const API_CACHE_STORE_NAME = 'apiCache';

// 캐시 엔트리 타입
export interface APICacheEntry<T = unknown> {
  /** 캐시 키 */
  key: string;
  /** API 응답 데이터 */
  data: T;
  /** 생성 시간 */
  createdAt: number;
  /** 마지막 접근 시간 */
  lastAccessed: number;
  /** TTL (밀리초) */
  ttl: number;
  /** 만료 시간 */
  expiresAt: number;
}

// API 캐시 초기화
async function initAPIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(API_CACHE_DB_NAME, API_CACHE_DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(API_CACHE_STORE_NAME)) {
        const store = db.createObjectStore(API_CACHE_STORE_NAME, { keyPath: 'key' });
        store.createIndex('expiresAt', 'expiresAt', { unique: false });
        store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
      }
    };
  });
}

/**
 * API 캐시 매니저
 */
class APICacheManager {
  private db: IDBDatabase | null = null;

  /**
   * 캐시 초기화
   */
  async init(): Promise<void> {
    if (this.db) return;
    
    try {
      this.db = await initAPIDB();
      // 초기화 시 만료된 캐시 정리
      await this.cleanup();
    } catch (error) {
      console.error('Failed to initialize API cache:', error);
      throw error;
    }
  }

  /**
   * API 응답 캐싱
   */
  async set<T>(key: string, data: T, ttl: number = 30 * 60 * 1000): Promise<void> {
    if (!this.db) await this.init();
    
    const now = Date.now();
    const entry: APICacheEntry<T> = {
      key,
      data,
      createdAt: now,
      lastAccessed: now,
      ttl,
      expiresAt: now + ttl
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([API_CACHE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(API_CACHE_STORE_NAME);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      
      store.put(entry);
    });
  }

  /**
   * API 응답 조회
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([API_CACHE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(API_CACHE_STORE_NAME);
      const request = store.get(key);
      
      request.onsuccess = () => {
        const entry = request.result as APICacheEntry<T> | undefined;
        
        if (!entry) {
          resolve(null);
          return;
        }

        // 만료 확인
        const now = Date.now();
        if (now > entry.expiresAt) {
          // 만료된 캐시 삭제
          store.delete(key);
          resolve(null);
          return;
        }

        // 마지막 접근 시간 업데이트
        entry.lastAccessed = now;
        store.put(entry);
        
        resolve(entry.data);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 특정 키 삭제
   */
  async delete(key: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([API_CACHE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(API_CACHE_STORE_NAME);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      
      store.delete(key);
    });
  }

  /**
   * 키 패턴으로 삭제 (예: 'sound-*' 모든 사운드 캐시 삭제)
   */
  async deleteByPattern(pattern: string): Promise<void> {
    if (!this.db) await this.init();
    
    const regex = new RegExp(pattern.replace('*', '.*'));
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([API_CACHE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(API_CACHE_STORE_NAME);
      const request = store.openCursor();
      
      const keysToDelete: string[] = [];
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const entry = cursor.value as APICacheEntry;
          if (regex.test(entry.key)) {
            keysToDelete.push(entry.key);
          }
          cursor.continue();
        } else {
          // 일괄 삭제
          Promise.all(
            keysToDelete.map(key => {
              return new Promise<void>((res, rej) => {
                const deleteRequest = store.delete(key);
                deleteRequest.onsuccess = () => res();
                deleteRequest.onerror = () => rej(deleteRequest.error);
              });
            })
          ).then(() => resolve()).catch(reject);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 전체 캐시 클리어
   */
  async clear(): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([API_CACHE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(API_CACHE_STORE_NAME);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      
      store.clear();
    });
  }

  /**
   * 만료된 캐시 정리
   */
  async cleanup(): Promise<void> {
    if (!this.db) await this.init();
    
    const now = Date.now();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([API_CACHE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(API_CACHE_STORE_NAME);
      const index = store.index('expiresAt');
      
      // 만료된 항목들 찾기
      const request = index.openCursor(IDBKeyRange.upperBound(now));
      const keysToDelete: string[] = [];
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const entry = cursor.value as APICacheEntry;
          keysToDelete.push(entry.key);
          cursor.continue();
        } else {
          // 만료된 항목들 삭제
          Promise.all(
            keysToDelete.map(key => {
              return new Promise<void>((res, rej) => {
                const deleteRequest = store.delete(key);
                deleteRequest.onsuccess = () => res();
                deleteRequest.onerror = () => rej(deleteRequest.error);
              });
            })
          ).then(() => resolve()).catch(reject);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 캐시 통계 조회
   */
  async getStats(): Promise<{ count: number; size: number }> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([API_CACHE_STORE_NAME], 'readonly');
      const store = transaction.objectStore(API_CACHE_STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const entries = request.result as APICacheEntry[];
        const count = entries.length;
        const size = entries.reduce((total, entry) => {
          return total + JSON.stringify(entry).length * 2; // 대략적인 바이트 크기
        }, 0);
        
        resolve({ count, size });
      };
      
      request.onerror = () => reject(request.error);
    });
  }
}

// 싱글톤 인스턴스
const apiCacheManager = new APICacheManager();

// 공개 API
export const apiCache = {
  /**
   * 초기화
   */
  init: () => apiCacheManager.init(),

  /**
   * 사운드 라이브러리 캐싱
   */
  setSoundLibrary: (filter: string, data: unknown, ttl: number = 30 * 60 * 1000) => 
    apiCacheManager.set(`sound-library-${filter}`, data, ttl),

  getSoundLibrary: (filter: string) => 
    apiCacheManager.get(`sound-library-${filter}`),

  /**
   * 사운드 히스토리 캐싱
   */
  setSoundHistory: (filter: string, data: unknown, ttl: number = 5 * 60 * 1000) => 
    apiCacheManager.set(`sound-history-${filter}`, data, ttl),

  getSoundHistory: (filter: string) => 
    apiCacheManager.get(`sound-history-${filter}`),

  /**
   * 업로드 음악 목록 캐싱
   */
  setUploadedMusic: (data: unknown, ttl: number = 10 * 60 * 1000) => 
    apiCacheManager.set('uploaded-music', data, ttl),

  getUploadedMusic: () => 
    apiCacheManager.get('uploaded-music'),

  /**
   * 캐시 관리
   */
  delete: (key: string) => apiCacheManager.delete(key),
  deleteByPattern: (pattern: string) => apiCacheManager.deleteByPattern(pattern),
  clear: () => apiCacheManager.clear(),
  cleanup: () => apiCacheManager.cleanup(),
  getStats: () => apiCacheManager.getStats()
};
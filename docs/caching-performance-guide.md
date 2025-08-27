# 비디오 에디터 캐싱 시스템 성능 측정 가이드

이 문서는 구현된 캐싱 시스템의 성능 개선 효과를 측정하고 검증하는 방법을 제공합니다.

## 🎯 측정 목표

### 예상 개선 효과
- 비디오 로딩 시간 **70% 감소**
- 메모리 사용량 **30% 감소**
- API 호출 **50% 감소**
- 리렌더링 **40% 감소**

## 📊 성능 측정 방법

### 1. 브라우저 개발자 도구 활용

#### Network 탭
```javascript
// 캐시 히트율 측정
console.log('Cache hit rate:', (cachedRequests / totalRequests) * 100 + '%');

// API 호출 감소 확인
const apiCalls = performance.getEntriesByType('navigation')
  .concat(performance.getEntriesByType('resource'))
  .filter(entry => entry.name.includes('/api/'));
console.log('API calls:', apiCalls.length);
```

#### Performance 탭
```javascript
// 페이지 로드 시간 측정
performance.mark('video-editor-start');
// ... 비디오 에디터 로드 완료 후
performance.mark('video-editor-end');
performance.measure('video-editor-load', 'video-editor-start', 'video-editor-end');
```

#### Memory 탭
```javascript
// 메모리 사용량 측정
if (performance.memory) {
  console.log('Heap Size:', {
    used: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
    total: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
    limit: (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB'
  });
}
```

### 2. 캐시 통계 확인

#### 미디어 캐시 통계
```javascript
import { mediaCache } from '@/lib/cache/media-cache';

// 캐시 통계 조회
const stats = mediaCache.getStats();
console.log('Media Cache Stats:', {
  totalSize: (stats.totalSize / 1024 / 1024).toFixed(2) + ' MB',
  entryCount: stats.entryCount,
  hitRate: (stats.hitRate * 100).toFixed(1) + '%',
  lastCleanup: new Date(stats.lastCleanup).toLocaleString()
});

// 타입별 엔트리 수 확인
const videoEntries = await mediaCache.getEntriesByType('video');
const audioEntries = await mediaCache.getEntriesByType('audio');
console.log('Cached Videos:', videoEntries.length);
console.log('Cached Audio:', audioEntries.length);
```

#### API 캐시 통계
```javascript
import { apiCache } from '@/lib/cache/api-cache';

const apiStats = await apiCache.getStats();
console.log('API Cache Stats:', {
  count: apiStats.count,
  size: (apiStats.size / 1024).toFixed(2) + ' KB'
});
```

### 3. React 렌더링 최적화 확인

#### React DevTools Profiler 사용
```javascript
// 컴포넌트 렌더링 횟수 추적
let renderCount = 0;

const VideoPreview = memo(() => {
  renderCount++;
  console.log('VideoPreview rendered:', renderCount);
  // ... 컴포넌트 로직
});
```

#### Context 리렌더링 추적
```javascript
// ProjectContext 사용 컴포넌트에서
const useRenderTracker = (componentName) => {
  const renderCount = useRef(0);
  renderCount.current++;
  console.log(`${componentName} render #${renderCount.current}`);
};
```

## 🧪 테스트 시나리오

### 시나리오 1: 첫 방문 vs 재방문
```javascript
// 첫 방문 시간 측정
localStorage.clear();
sessionStorage.clear();
// IndexedDB 클리어
await mediaCache.clear();
await apiCache.clear();

// 비디오 에디터 접근 및 로딩 시간 측정
const startTime = performance.now();
// ... 페이지 로드 완료 후
const endTime = performance.now();
console.log('First visit load time:', endTime - startTime, 'ms');

// 재방문 시간 측정 (캐시 활용)
location.reload();
```

### 시나리오 2: 대용량 비디오 처리
```javascript
// 10개 이상의 비디오 클립 로드
const heavyTestClips = Array(15).fill(null).map((_, i) => ({
  id: `test-${i}`,
  url: `https://example.com/video-${i}.mp4`,
  duration: 30000
}));

// 로딩 시간 및 메모리 사용량 추적
```

### 시나리오 3: 사운드 라이브러리 성능
```javascript
// 사운드 라이브러리 모달 열기 (캐시 없음)
const beforeApiCall = performance.now();
// 사운드 라이브러리 API 호출
const afterApiCall = performance.now();

// 모달 닫고 다시 열기 (캐시 활용)
const beforeCacheHit = performance.now();
// 캐시에서 데이터 로드
const afterCacheHit = performance.now();

console.log('API call time:', afterApiCall - beforeApiCall, 'ms');
console.log('Cache hit time:', afterCacheHit - beforeCacheHit, 'ms');
console.log('Speed improvement:', 
  ((afterApiCall - beforeApiCall) / (afterCacheHit - beforeCacheHit)).toFixed(1) + 'x');
```

## 📈 성능 벤치마크

### 측정 코드 예시
```javascript
// 성능 벤치마크 실행 함수
async function runPerformanceBenchmark() {
  const results = {
    videoLoadTime: [],
    apiCallTime: [],
    renderCount: 0,
    memoryUsage: [],
    cacheHitRate: 0
  };

  // 1. 비디오 로딩 시간 측정 (5회 평균)
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    await loadTestVideo();
    const end = performance.now();
    results.videoLoadTime.push(end - start);
  }

  // 2. API 호출 시간 측정
  const apiStart = performance.now();
  await fetch('/api/sound/history');
  const apiEnd = performance.now();
  results.apiCallTime.push(apiEnd - apiStart);

  // 3. 캐시 히트율 확인
  const cacheStats = mediaCache.getStats();
  results.cacheHitRate = cacheStats.hitRate;

  // 4. 메모리 사용량 기록
  if (performance.memory) {
    results.memoryUsage.push(performance.memory.usedJSHeapSize);
  }

  return results;
}

// 벤치마크 실행 및 결과 출력
runPerformanceBenchmark().then(results => {
  console.log('Performance Benchmark Results:', {
    avgVideoLoadTime: results.videoLoadTime.reduce((a, b) => a + b) / results.videoLoadTime.length,
    avgApiCallTime: results.apiCallTime.reduce((a, b) => a + b) / results.apiCallTime.length,
    cacheHitRate: (results.cacheHitRate * 100).toFixed(1) + '%',
    avgMemoryUsage: (results.memoryUsage.reduce((a, b) => a + b) / results.memoryUsage.length / 1024 / 1024).toFixed(2) + ' MB'
  });
});
```

## 🔧 디버깅 도구

### 캐시 상태 모니터링
```javascript
// 개발 환경에서 캐시 상태를 실시간 모니터링
if (process.env.NODE_ENV === 'development') {
  setInterval(async () => {
    const mediaStats = mediaCache.getStats();
    const apiStats = await apiCache.getStats();
    
    console.table({
      'Media Cache': {
        'Size (MB)': (mediaStats.totalSize / 1024 / 1024).toFixed(2),
        'Entries': mediaStats.entryCount,
        'Hit Rate': (mediaStats.hitRate * 100).toFixed(1) + '%'
      },
      'API Cache': {
        'Size (KB)': (apiStats.size / 1024).toFixed(2),
        'Entries': apiStats.count,
        'Hit Rate': 'N/A'
      }
    });
  }, 10000); // 10초마다 체크
}
```

### 성능 경고 시스템
```javascript
// 성능 임계점 모니터링
const PERFORMANCE_THRESHOLDS = {
  videoLoadTime: 3000, // 3초
  memoryUsage: 100 * 1024 * 1024, // 100MB
  cacheHitRate: 0.6 // 60%
};

function checkPerformanceThresholds(metrics) {
  const warnings = [];
  
  if (metrics.videoLoadTime > PERFORMANCE_THRESHOLDS.videoLoadTime) {
    warnings.push(`비디오 로딩 시간이 ${metrics.videoLoadTime}ms로 임계점을 초과했습니다.`);
  }
  
  if (metrics.memoryUsage > PERFORMANCE_THRESHOLDS.memoryUsage) {
    warnings.push(`메모리 사용량이 ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB로 임계점을 초과했습니다.`);
  }
  
  if (metrics.cacheHitRate < PERFORMANCE_THRESHOLDS.cacheHitRate) {
    warnings.push(`캐시 히트율이 ${(metrics.cacheHitRate * 100).toFixed(1)}%로 낮습니다.`);
  }
  
  return warnings;
}
```

## 📝 보고서 양식

### 성능 개선 보고서 템플릿
```markdown
# 캐싱 시스템 성능 개선 보고서

## 측정 환경
- 브라우저: [Chrome 120.0]
- 디바이스: [MacBook Pro M2]
- 네트워크: [Fast 3G]

## 측정 결과

### Before (캐싱 적용 전)
- 비디오 로딩 시간: [5.2초]
- 메모리 사용량: [150MB]
- API 호출 수: [12회]
- 컴포넌트 렌더링: [45회]

### After (캐싱 적용 후)
- 비디오 로딩 시간: [1.8초]  **65% 개선**
- 메모리 사용량: [110MB]  **27% 개선**
- API 호출 수: [6회]  **50% 개선**
- 컴포넌트 렌더링: [28회]  **38% 개선**

## 결론
목표 달성률: 4/4 (100%)
전반적인 성능 개선 효과가 확인되었습니다.
```

이 가이드를 따라 정기적으로 성능을 측정하고 모니터링하여 캐싱 시스템의 효과를 지속적으로 확인하세요.
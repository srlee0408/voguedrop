/**
 * Remotion 폰트 로더
 * Lambda와 브라우저 환경에서 웹폰트를 로드합니다.
 * 
 * Lambda 환경:
 * - CSS @import로 Google Fonts 로드
 * - FontFace API로 추가 보장
 * - /public/fonts TTF 파일 폴백
 * 
 * 브라우저 환경:
 * - CSS @import로 Google Fonts 로드
 * - document.fonts API 활용
 */

import { continueRender, delayRender, getRemotionEnvironment } from 'remotion';
import { FONT_OPTIONS } from '@/shared/constants/fonts';

let fontsLoaded = false;
let fontLoadHandle: number | null = null;

// 실패한 폰트 추적
const failedFonts = new Set<string>();

/**
 * 시스템 폰트 체크
 */
function isSystemFont(fontFamily: string): boolean {
  const systemFonts = [
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia',
    'Courier New', 'Verdana', 'Trebuchet MS', 'Impact',
    'Comic Sans MS', 'system-ui', '-apple-system', 'BlinkMacSystemFont',
    'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell',
    'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'default'
  ];
  
  return systemFonts.includes(fontFamily);
}

/**
 * Google Fonts CSS를 동적으로 삽입
 */
function injectGoogleFontsCSS(): void {
  if (typeof document === 'undefined') return;
  
  // 이미 추가된 경우 스킵
  if (document.querySelector('link[data-font-loader="remotion"]')) {
    return;
  }
  
  const families = FONT_OPTIONS
    .filter(font => font.googleFontUrl && !isSystemFont(font.value))
    .map(font => {
      const weight = font.weight ? `:wght@${font.weight}` : ':wght@400;700';
      return `${font.value.replace(/ /g, '+')}${weight}`;
    });
  
  if (families.length === 0) return;
  
  // Preconnect for performance
  const preconnect1 = document.createElement('link');
  preconnect1.rel = 'preconnect';
  preconnect1.href = 'https://fonts.googleapis.com';
  document.head.appendChild(preconnect1);
  
  const preconnect2 = document.createElement('link');
  preconnect2.rel = 'preconnect';
  preconnect2.href = 'https://fonts.gstatic.com';
  preconnect2.crossOrigin = 'anonymous';
  document.head.appendChild(preconnect2);
  
  // Main font link
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${families.join('&family=')}&display=swap`;
  link.setAttribute('data-font-loader', 'remotion');
  document.head.appendChild(link);
  
  console.log('[Font Loader] Google Fonts CSS injected');
}

/**
 * Lambda와 로컬 환경 모두에서 작동하는 웹폰트 로더
 * CSS @import와 FontFace API를 동시에 사용
 */
export async function loadCoreFonts(): Promise<void> {
  if (fontsLoaded) {
    return;
  }

  const environment = getRemotionEnvironment();
  const isLambda = environment.isRendering;
  
  console.log(`[Font Loader] ========================================`);
  console.log(`[Font Loader] Starting font loading process...`);
  console.log(`[Font Loader] Environment: ${isLambda ? '🔴 Lambda/Rendering' : '🟢 Studio/Player'}`);
  console.log(`[Font Loader] ========================================`);

  // 렌더링 환경에서만 지연 처리
  if (isLambda) {
    fontLoadHandle = delayRender('Loading fonts...');
  }

  try {
    // 1. CSS @import 방식으로 Google Fonts 로드
    injectGoogleFontsCSS();
    
    // 2. FontFace API로 추가 로드 (Lambda 환경 대비)
    if (typeof document !== 'undefined' && document.fonts) {
      const webFonts = FONT_OPTIONS.filter(font => font.googleFontUrl && !isSystemFont(font.value));
      console.log(`[Font Loader] Loading ${webFonts.length} fonts with FontFace API`);
      
      const fontPromises: Promise<void>[] = [];
      const loadedFonts: string[] = [];
      
      for (const font of webFonts) {
        const fontIdentifier = `${font.value} (${font.weight || '400'})`;
        
        // 이미 실패한 폰트는 건너뛰기
        if (failedFonts.has(fontIdentifier)) {
          console.log(`[Font Loader] ⏭️  Skipping: ${fontIdentifier}`);
          continue;
        }
        
        const loadPromise = new Promise<void>(async (resolve) => {
          try {
            // FontFace API 사용
            const fontFace = new FontFace(
              font.value,
              `url(${font.googleFontUrl})`,
              {
                weight: font.weight || '400',
                style: 'normal',
                display: 'swap'
              } as FontFaceDescriptors
            );
            
            await fontFace.load();
            document.fonts.add(fontFace);
            console.log(`[Font Loader] ✅ Loaded: ${fontIdentifier}`);
            loadedFonts.push(fontIdentifier);
            resolve();
          } catch {
            console.warn(`[Font Loader] ⚠️  Failed: ${fontIdentifier}`);
            failedFonts.add(fontIdentifier);
            // 개별 폰트 로드 실패해도 전체 프로세스는 계속
            resolve();
          }
        });
        
        fontPromises.push(loadPromise);
      }
      
      // 모든 폰트 로드 대기
      await Promise.all(fontPromises);
      
      console.log(`[Font Loader] ========================================`);
      console.log(`[Font Loader] Summary:`);
      console.log(`[Font Loader] ✅ Loaded: ${loadedFonts.length} fonts`);
      console.log(`[Font Loader] ⚠️  Failed: ${failedFonts.size} fonts`);
      console.log(`[Font Loader] ========================================`);
    }
    
    // 폰트 로딩 완료 표시
    fontsLoaded = true;
    
  } catch (error) {
    console.error('[Font Loader] Fatal error during font loading:', error);
  } finally {
    // 렌더링 지연 해제
    if (fontLoadHandle !== null) {
      continueRender(fontLoadHandle);
      fontLoadHandle = null;
    }
  }
}

/**
 * 텍스트 에디터용 폰트 로더
 * 개별 폰트를 동적으로 로드
 */
export async function loadFontForEditor(fontFamily: string): Promise<boolean> {
  if (isSystemFont(fontFamily)) {
    return true;
  }

  const fontOption = FONT_OPTIONS.find(f => f.value === fontFamily);
  if (!fontOption || !fontOption.googleFontUrl) {
    return false;
  }

  const fontIdentifier = `${fontFamily} (${fontOption.weight || '400'})`;
  
  // 이미 실패한 폰트는 재시도하지 않음
  if (failedFonts.has(fontIdentifier)) {
    return false;
  }

  try {
    if (typeof document !== 'undefined' && document.fonts) {
      // 먼저 이미 로드되었는지 확인
      const loaded = await document.fonts.load(`16px "${fontFamily}"`);
      if (loaded.length > 0) {
        return true;
      }
      
      // 로드되지 않았다면 FontFace API로 로드
      const fontFace = new FontFace(
        fontFamily,
        `url(${fontOption.googleFontUrl})`,
        {
          weight: fontOption.weight || '400',
          style: 'normal',
          display: 'swap'
        } as FontFaceDescriptors
      );
      
      await fontFace.load();
      document.fonts.add(fontFace);
      console.log(`[Font Loader] Editor font loaded: ${fontIdentifier}`);
      return true;
    }
  } catch {
    console.warn(`[Font Loader] Failed to load editor font: ${fontIdentifier}`);
    failedFonts.add(fontIdentifier);
  }
  
  return false;
}
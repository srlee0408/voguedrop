import { loadFont } from '@remotion/fonts';

// 폰트 이름과 Google Fonts URL 매핑
export const FONT_URLS: Record<string, string> = {
  // Sans-serif fonts
  'Arial': '', // System font
  'Helvetica': '', // System font
  'Roboto': 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
  'Open Sans': 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap',
  'Montserrat': 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700&display=swap',
  'Poppins': 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap',
  
  // Serif fonts
  'Times New Roman': '', // System font
  'Georgia': '', // System font
  'Playfair Display': 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap',
  'Merriweather': 'https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap',
  
  // Script & Casual fonts
  'Dancing Script': 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap',
  'Pacifico': 'https://fonts.googleapis.com/css2?family=Pacifico&display=swap',
  'Lobster': 'https://fonts.googleapis.com/css2?family=Lobster&display=swap',
  
  // Display fonts
  'Bebas Neue': 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap',
  'Oswald': 'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;600;700&display=swap',
  
  // Korean fonts
  'Noto Sans KR': 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap',
  
  // Monospace fonts
  'Courier New': '', // System font
};

// 폰트 패밀리 이름을 Google Fonts에서 사용하는 형식으로 변환
export const getFontFamily = (fontName: string): string => {
  // 'default'나 빈 값은 기본 폰트 사용
  if (!fontName || fontName === 'default') {
    return 'sans-serif';
  }
  
  // 시스템 폰트는 그대로 반환
  if (['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New'].includes(fontName)) {
    return fontName;
  }
  
  // Google Fonts는 따옴표로 감싸서 반환
  return `"${fontName}", sans-serif`;
};

// 모든 폰트를 한 번에 로드하는 함수
export const loadAllFonts = async (): Promise<void> => {
  const fontPromises: Promise<void>[] = [];
  
  for (const [fontName, url] of Object.entries(FONT_URLS)) {
    if (url) {
      // loadFont는 @remotion/fonts 패키지의 함수로, 
      // Google Fonts URL을 사용해 폰트를 로드합니다
      fontPromises.push(
        loadFont({
          family: fontName,
          url,
        }).catch((err) => {
          console.warn(`Failed to load font ${fontName}:`, err);
        })
      );
    }
  }
  
  await Promise.all(fontPromises);
};

// 특정 폰트만 로드하는 함수
export const loadSpecificFonts = async (fontNames: string[]): Promise<void> => {
  const uniqueFonts = [...new Set(fontNames)];
  const fontPromises: Promise<void>[] = [];
  
  for (const fontName of uniqueFonts) {
    const url = FONT_URLS[fontName];
    if (url) {
      fontPromises.push(
        loadFont({
          family: fontName,
          url,
        }).catch((err) => {
          console.warn(`Failed to load font ${fontName}:`, err);
        })
      );
    }
  }
  
  await Promise.all(fontPromises);
};

// CSS @import 문자열 생성 (대체 방법)
export const generateFontImports = (): string => {
  const imports: string[] = [];
  
  for (const url of Object.values(FONT_URLS)) {
    if (url) {
      imports.push(`@import url('${url}');`);
    }
  }
  
  return imports.join('\n');
};
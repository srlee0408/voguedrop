/**
 * 폰트 옵션 중앙 관리
 * TextEditorModal과 Remotion 렌더링에서 공통 사용
 */

export interface FontOption {
  value: string;
  label: string;
  googleFontUrl?: string; // Google Fonts WOFF2 file URL
  weight?: string;
}

// Google Fonts에서 제공하는 실제 WOFF2 파일 URL
// @remotion/fonts loadFont()에서 직접 로드 가능
export const FONT_OPTIONS: FontOption[] = [
  { 
    value: 'default', 
    label: 'Default' 
  },
  
  // System fonts (no URL needed)
  { 
    value: 'Arial', 
    label: 'Arial' 
  },
  { 
    value: 'Helvetica', 
    label: 'Helvetica' 
  },
  { 
    value: 'Times New Roman', 
    label: 'Times New Roman' 
  },
  { 
    value: 'Georgia', 
    label: 'Georgia' 
  },
  { 
    value: 'Courier New', 
    label: 'Courier New' 
  },
  
  // Modern Sans-Serif (with Google Fonts WOFF2 URLs)
  { 
    value: 'Roboto', 
    label: 'Roboto',
    googleFontUrl: 'https://fonts.gstatic.com/s/roboto/v48/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbVmZiArmlw.woff2',
    weight: '400'
  },
  { 
    value: 'Roboto', 
    label: 'Roboto Bold',
    googleFontUrl: 'https://fonts.gstatic.com/s/roboto/v48/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWuYjalmZiArmlw.woff2',
    weight: '700'
  },
  { 
    value: 'Open Sans', 
    label: 'Open Sans',
    googleFontUrl: 'https://fonts.gstatic.com/s/opensans/v43/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4taVIGxA.woff2',
    weight: '400'
  },
  { 
    value: 'Open Sans', 
    label: 'Open Sans Bold',
    googleFontUrl: 'https://fonts.gstatic.com/s/opensans/v43/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsg-1x4taVIGxA.woff2',
    weight: '700'
  },
  { 
    value: 'Montserrat', 
    label: 'Montserrat',
    googleFontUrl: 'https://fonts.gstatic.com/s/montserrat/v30/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw0aXpsog.woff2',
    weight: '400'
  },
  { 
    value: 'Montserrat', 
    label: 'Montserrat Bold',
    googleFontUrl: 'https://fonts.gstatic.com/s/montserrat/v30/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCuM73w0aXpsog.woff2',
    weight: '700'
  },
  { 
    value: 'Poppins', 
    label: 'Poppins',
    googleFontUrl: 'https://fonts.gstatic.com/s/poppins/v23/pxiEyp8kv8JHgFVrJJbecmNE.woff2',
    weight: '400'
  },
  { 
    value: 'Poppins', 
    label: 'Poppins Bold',
    googleFontUrl: 'https://fonts.gstatic.com/s/poppins/v23/pxiByp8kv8JHgFVrLCz7Z11lFc-K.woff2',
    weight: '700'
  },
  
  // Serif
  { 
    value: 'Playfair Display', 
    label: 'Playfair Display',
    googleFontUrl: 'https://fonts.gstatic.com/s/playfairdisplay/v39/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDTbtPY_Q.woff2',
    weight: '400'
  },
  { 
    value: 'Playfair Display', 
    label: 'Playfair Display Bold',
    googleFontUrl: 'https://fonts.gstatic.com/s/playfairdisplay/v39/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKeiunDTbtPY_Q.woff2',
    weight: '700'
  },
  { 
    value: 'Merriweather', 
    label: 'Merriweather',
    googleFontUrl: 'https://fonts.gstatic.com/s/merriweather/v32/u-4D0qyriQwlOrhSvowK_l5UcA6zuSYEqOzpPe3HOZJ5eX1WtLaQwmYiScCmDxhtNOKl8yDr3icaGV31GvU.woff2',
    weight: '400'
  },
  { 
    value: 'Merriweather', 
    label: 'Merriweather Bold',
    googleFontUrl: 'https://fonts.gstatic.com/s/merriweather/v32/u-4D0qyriQwlOrhSvowK_l5UcA6zuSYEqOzpPe3HOZJ5eX1WtLaQwmYiScCmDxhtNOKl8yDrOSAaGV31GvU.woff2',
    weight: '700'
  },
  
  // Script & Casual
  { 
    value: 'Dancing Script', 
    label: 'Dancing Script',
    googleFontUrl: 'https://fonts.gstatic.com/s/dancingscript/v28/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7BMSo3Rep8ltA.woff2',
    weight: '400'
  },
  { 
    value: 'Dancing Script', 
    label: 'Dancing Script Bold',
    googleFontUrl: 'https://fonts.gstatic.com/s/dancingscript/v28/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7B1i03Rep8ltA.woff2',
    weight: '700'
  },
  { 
    value: 'Pacifico', 
    label: 'Pacifico',
    googleFontUrl: 'https://fonts.gstatic.com/s/pacifico/v22/FwZY7-Qmy14u9lezJ-6K6MmTpA.woff2',
    weight: '400'
  },
  { 
    value: 'Lobster', 
    label: 'Lobster',
    googleFontUrl: 'https://fonts.gstatic.com/s/lobster/v31/neILzCirqoswsqX9zo-mM5Ez.woff2',
    weight: '400'
  },
  
  // Display & Impact
  { 
    value: 'Bebas Neue', 
    label: 'Bebas Neue',
    googleFontUrl: 'https://fonts.gstatic.com/s/bebasneue/v15/JTUSjIg69CK48gW7PXoo9Wdhyzbi.woff2',
    weight: '400'
  },
  { 
    value: 'Oswald', 
    label: 'Oswald',
    googleFontUrl: 'https://fonts.gstatic.com/s/oswald/v56/TK3_WkUHHAIjg75cFRf3bXL8LICs1_FvsUtiZTaR.woff2',
    weight: '400'
  },
  { 
    value: 'Oswald', 
    label: 'Oswald Bold',
    googleFontUrl: 'https://fonts.gstatic.com/s/oswald/v56/TK3_WkUHHAIjg75cFRf3bXL8LICs1xZosUtiZTaR.woff2',
    weight: '700'
  },
  
  // Korean - 한글 폰트 (subset 포함)
  { 
    value: 'Noto Sans KR', 
    label: 'Noto Sans KR',
    googleFontUrl: 'https://fonts.gstatic.com/s/notosanskr/v37/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLGC5nwuDo-KBTUm6CryotyJROlrnQ.0.woff2',
    weight: '400'
  },
  { 
    value: 'Noto Sans KR', 
    label: 'Noto Sans KR Bold',
    googleFontUrl: 'https://fonts.gstatic.com/s/notosanskr/v37/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzg01eLGC5nwuDo-KBTUm6CryotyJROlrnQ.0.woff2',
    weight: '700'
  },
];

// 폰트 패밀리별로 그룹화 (UI 표시용)
export const FONT_FAMILIES = [
  { value: 'default', label: 'Default' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Merriweather', label: 'Merriweather' },
  { value: 'Dancing Script', label: 'Dancing Script' },
  { value: 'Pacifico', label: 'Pacifico' },
  { value: 'Lobster', label: 'Lobster' },
  { value: 'Bebas Neue', label: 'Bebas Neue' },
  { value: 'Oswald', label: 'Oswald' },
  { value: 'Noto Sans KR', label: 'Noto Sans KR' },
];

// 시스템 폰트 확인
export function isSystemFont(fontFamily: string): boolean {
  const systemFonts = [
    'default',
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Georgia',
    'Courier New',
    'Verdana',
    'Tahoma',
    'Impact',
    'sans-serif',
    'serif',
    'monospace',
  ];
  
  return systemFonts.includes(fontFamily);
}

// 폰트가 지원되는지 확인
export function isSupportedFont(fontFamily: string): boolean {
  return FONT_FAMILIES.some(f => f.value === fontFamily) || isSystemFont(fontFamily);
}
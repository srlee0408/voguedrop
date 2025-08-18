/**
 * Lambda 렌더링을 위한 폰트 스타일 인젝션
 * CSS import 대신 직접 스타일 태그 삽입
 */

export function injectFontStyles(): void {
  if (typeof document === 'undefined') return;
  
  // 이미 추가된 경우 스킵
  if (document.getElementById('remotion-fonts-style')) {
    return;
  }
  
  const fontStyleSheet = `
    /* Google Fonts Import */
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Lobster&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap');
    
    /* Local font fallbacks */
    @font-face {
      font-family: 'Dancing Script';
      font-weight: 400;
      font-style: normal;
      src: url('/fonts/DancingScript-Regular.ttf') format('truetype');
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Dancing Script';
      font-weight: 700;
      font-style: normal;
      src: url('/fonts/DancingScript-Bold.ttf') format('truetype');
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Pacifico';
      font-weight: 400;
      font-style: normal;
      src: url('/fonts/Pacifico-Regular.ttf') format('truetype');
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Lobster';
      font-weight: 400;
      font-style: normal;
      src: url('/fonts/Lobster-Regular.ttf') format('truetype');
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Roboto';
      font-weight: 400;
      font-style: normal;
      src: url('/fonts/Roboto-Regular.ttf') format('truetype');
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Roboto';
      font-weight: 700;
      font-style: normal;
      src: url('/fonts/Roboto-Bold.ttf') format('truetype');
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Montserrat';
      font-weight: 400;
      font-style: normal;
      src: url('/fonts/Montserrat-Regular.ttf') format('truetype');
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Montserrat';
      font-weight: 700;
      font-style: normal;
      src: url('/fonts/Montserrat-Bold.ttf') format('truetype');
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Open Sans';
      font-weight: 400;
      font-style: normal;
      src: url('/fonts/OpenSans-Regular.ttf') format('truetype');
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Open Sans';
      font-weight: 700;
      font-style: normal;
      src: url('/fonts/OpenSans-Bold.ttf') format('truetype');
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Poppins';
      font-weight: 400;
      font-style: normal;
      src: url('/fonts/Poppins-Regular.ttf') format('truetype');
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Poppins';
      font-weight: 700;
      font-style: normal;
      src: url('/fonts/Poppins-Bold.ttf') format('truetype');
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Playfair Display';
      font-weight: 400;
      font-style: normal;
      src: url('/fonts/PlayfairDisplay-Regular.ttf') format('truetype');
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Playfair Display';
      font-weight: 700;
      font-style: normal;
      src: url('/fonts/PlayfairDisplay-Bold.ttf') format('truetype');
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Merriweather';
      font-weight: 400;
      font-style: normal;
      src: url('/fonts/Merriweather-Regular.ttf') format('truetype');
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Merriweather';
      font-weight: 700;
      font-style: normal;
      src: url('/fonts/Merriweather-Bold.ttf') format('truetype');
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Bebas Neue';
      font-weight: 400;
      font-style: normal;
      src: url('/fonts/BebasNeue-Regular.ttf') format('truetype');
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Oswald';
      font-weight: 400;
      font-style: normal;
      src: url('/fonts/Oswald-Regular.ttf') format('truetype');
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Oswald';
      font-weight: 700;
      font-style: normal;
      src: url('/fonts/Oswald-Bold.ttf') format('truetype');
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Noto Sans KR';
      font-weight: 400;
      font-style: normal;
      src: url('/fonts/NotoSansKR-Regular.ttf') format('truetype');
      font-display: swap;
    }
  `;
  
  const style = document.createElement('style');
  style.id = 'remotion-fonts-style';
  style.textContent = fontStyleSheet;
  document.head.appendChild(style);
  
  console.log('[Font Injector] Font styles injected into document');
}
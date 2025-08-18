import { registerRoot } from 'remotion';
import { VideoComposition } from './VideoComposition';
import { loadCoreFonts } from './load-fonts';
import { injectFontStyles } from './inject-fonts';

// 폰트 스타일 인젝션 (Lambda 환경 대비)
injectFontStyles();

// 폰트 로딩 초기화 - Lambda와 로컬 모두에서 실행
loadCoreFonts().catch(console.error);

// Remotion Root 컴포지션 등록
registerRoot(VideoComposition);
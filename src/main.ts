// import { GM_registerMenuCommand } from '$';
// import { initHLSEnhancer } from './hlsEnhancer';
import { initHLSEnhancer } from './hlsEnhancerv2';
import { initTranslation } from './translation';

console.log('X-Enhance userscript loaded');

// 初始化 HLS 增強功能
initHLSEnhancer();

// 初始化翻譯功能
initTranslation();

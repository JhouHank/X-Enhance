import { GM_registerMenuCommand } from '$';
import { initHLSEhnancer } from './hlsEnhancer';

console.log('X-Enhance userscript loaded');

// 初始化 HLS 增強功能
initHLSEhnancer();

// 註冊選單
GM_registerMenuCommand('問候', () => showMessage('你好！')());

function showMessage(message: string) {
  return function () {
    alert(message);
  };
}

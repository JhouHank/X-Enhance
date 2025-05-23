import { baseSelector } from './utils';

async function translate_gg(raw: string): Promise<string> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url: `https://translate.google.com/translate_a/t?client=gtx&sl=auto&tl=zh-TW&q=${encodeURIComponent(raw)}`,
      anonymous: true,
      nocache: true,
      onload: (response) => {
        try {
          console.log('Google 翻譯原始回應:', response.responseText);
          const result = JSON.parse(response.responseText)[0][0];
          console.log('Google 翻譯結果:', result);
          resolve(result);
        } catch (error) {
          console.error('解析翻譯結果時出錯:', error);
          reject(error);
        }
      },
      onerror: (error) => {
        console.error('Google 翻譯出錯:', error);
        reject(error);
      },
    });
  });
}

/**
 * 初始化翻譯功能
 * @returns {void}
 */
export const initTranslation = async (): Promise<void> => {
  try {
    console.log('[Translation] Initialized successfully');
    await translate_gg('Hello, how are you today?');

    // 每 5 秒執行一次選擇器
    const selector = baseSelector('div[dir="auto"][lang]', undefined, 5000);
    console.log('初始結果:', selector.result);

    // 如果需要清除定時器，可以調用 selector.clear()
    // 例如：setTimeout(() => selector.clear(), 60000); // 1分鐘後停止

    const selector2 = baseSelector(
      'div[data-testid=birdwatch-pivot]>div[dir=ltr]',
      undefined,
      5000,
    );
    console.log('初始結果2:', selector2.result);
  } catch (error) {
    console.error('[Translation] Initialization failed:', error);
    throw error;
  }
};

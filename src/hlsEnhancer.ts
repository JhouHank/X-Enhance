/**
 * HLS 增強功能
 * 自動選擇最高畫質的串流
 */

/**
 * 擴展 XMLHttpRequest 的類型定義，用於處理自定義的 response 和 responseText 屬性
 */
type ExtendedXMLHttpRequest = Omit<
  XMLHttpRequest,
  'response' | 'responseText'
> & {
  /** 自定義的 response 屬性，用於返回修改後的內容 */
  response: any;
  /** 自定義的 responseText 屬性，用於返回修改後的字串內容 */
  responseText: string | ArrayBuffer | null;
};

/** 用於匹配 Twitter 影片的 HLS 播放列表 URL 正則表達式 */
const HLS_URL_REG = /^https:\/\/video\.twimg\.com\/.+\.m3u8(\?.*)?$/i;

/** 用於從主播放列表中提取串流資訊的正則表達式 */
const HLS_MASTER_PLAYLIST_REG = /^#EXT-X-STREAM-INF:.*BANDWIDTH=(\d+).*\r?\n.*$/gm;

/**
 * 檢查給定的 URL 是否為 HLS 播放列表
 * @param {string} url - 要檢查的 URL
 * @returns {boolean} 如果是 HLS 播放列表則返回 true，否則返回 false
 */
const isHlsPlaylist = (url: string): boolean => HLS_URL_REG.test(url);

/**
 * 檢查給定的文字內容是否為主播放列表
 * @param {string} text - 要檢查的文字內容
 * @returns {boolean} 如果是主播放列表則返回 true，否則返回 false
 */
const isMasterPlaylist = (text: string): boolean =>
  !text.includes('#EXT-X-TARGETDURATION') && text.includes('#EXT-X-STREAM-INF');

/**
 * 修改主播放列表，選擇最高位元率的串流
 * @param {string} text - 原始播放列表內容
 * @returns {string} 修改後的播放列表內容
 */
const modifyMasterPlaylist = (text: string): string => {
  let result = text;
  let stream = HLS_MASTER_PLAYLIST_REG.exec(text);

  if (stream) {
    const globalTags = text.substring(0, stream.index);
    let maxBitrateStream = stream;

    // 尋找最高位元率的串流
    while ((stream = HLS_MASTER_PLAYLIST_REG.exec(text)) !== null) {
      if (parseInt(stream[1]) > parseInt(maxBitrateStream[1])) {
        maxBitrateStream = stream;
      }
    }

    result = globalTags + maxBitrateStream[0];
  }

  return result;
}

/**
 * 處理 XMLHttpRequest 的 readystatechange 事件
 * @this {XMLHttpRequest} - XMLHttpRequest 實例
 * @param {Event} e - 事件物件
 * @returns {void}
 */
function handleReadyStateChange(this: XMLHttpRequest, e: Event): void {
  if (this.readyState === 4) {
    const target = e.target as ExtendedXMLHttpRequest;
    const originalText = target.responseText as string;

    if (originalText && isMasterPlaylist(originalText)) {
      const modifiedText = modifyMasterPlaylist(originalText);

      // 修改 response 和 responseText
      Object.defineProperty(this, 'response', {
        get: () => modifiedText,
      });
      Object.defineProperty(this, 'responseText', {
        get: () => modifiedText,
      });
    }
  }
}

/**
 * 攔截並包裝 XMLHttpRequest 的 open 方法
 * @this {XMLHttpRequest} - XMLHttpRequest 實例
 * @param {Function} realOpen - 原始的 open 方法
 * @param {string} method - HTTP 方法 (GET, POST 等)
 * @param {string|URL} url - 請求的 URL
 * @param {boolean} [async=true] - 是否非同步請求
 * @param {string|null} [username] - 認證使用者名稱
 * @param {string|null} [password] - 認證密碼
 * @returns {any} 原始 open 方法的返回值
 */
function hijackedOpen(
  this: XMLHttpRequest,
  realOpen: typeof XMLHttpRequest.prototype.open,
  method: string,
  url: string | URL,
  async: boolean = true,
  username?: string | null,
  password?: string | null,
): ReturnType<typeof realOpen> {
  const urlStr = url.toString();
  const result = realOpen.call(this, method, url, async, username, password);

  if (isHlsPlaylist(urlStr)) {
    this.addEventListener('readystatechange', handleReadyStateChange.bind(this));
  }

  return result;
}

/**
 * 初始化 HLS 攔截功能，重寫 XMLHttpRequest 的 open 方法
 * @returns {void}
 */
function initHijack(): void {
  const realOpen = window.XMLHttpRequest.prototype.open;
  
  // 保存原始 open 方法的引用
  window.XMLHttpRequest.prototype.open = function(
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async: boolean = true,
    username?: string | null,
    password?: string | null,
  ): ReturnType<typeof realOpen> {
    return hijackedOpen.call(this, realOpen, method, url, async, username, password);
  };
}

/**
 * 初始化 HLS 增強功能，啟用 HLS 串流攔截
 * @returns {void}
 */
export const initHLSEnhancer = (): void => {
  initHijack();
  console.log('HLS Enhancer initialized');
}

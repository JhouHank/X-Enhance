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

/** 串流資訊接口 */
interface StreamInfo {
  bandwidth: number;
  content: string;
  index: number;
}

/** 用於匹配 Twitter 影片的 HLS 播放列表 URL 正則表達式 */
const HLS_URL_REG = /^https:\/\/video\.twimg\.com\/.+\.m3u8(\?.*)?$/i;

/** 用於從主播放列表中提取串流資訊的正則表達式 */
const HLS_MASTER_PLAYLIST_REG = /^#EXT-X-STREAM-INF:.*BANDWIDTH=(\d+).*(?:\r?\n)(.*)$/gm;

/** 用於緩存已處理的播放列表 */
const processedPlaylists = new WeakSet<XMLHttpRequest>();

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
 * 解析主播放列表中的所有串流資訊
 * @param {string} text - 播放列表內容
 * @returns {StreamInfo[]} 串流資訊陣列
 */
const parseStreams = (text: string): StreamInfo[] => {
  const streams: StreamInfo[] = [];
  let match: RegExpExecArray | null;
  
  // 重置正則表達式的 lastIndex
  HLS_MASTER_PLAYLIST_REG.lastIndex = 0;
  
  while ((match = HLS_MASTER_PLAYLIST_REG.exec(text)) !== null) {
    streams.push({
      bandwidth: parseInt(match[1], 10),
      content: match[0],
      index: match.index!
    });
  }
  
  return streams;
};

/**
 * 修改主播放列表，選擇最高位元率的串流
 * @param {string} text - 原始播放列表內容
 * @returns {string} 修改後的播放列表內容
 */
const modifyMasterPlaylist = (text: string): string => {
  try {
    const streams = parseStreams(text);
    
    if (streams.length === 0) {
      return text;
    }
    
    // 找到最高位元率的串流
    const maxBitrateStream = streams.reduce((max, current) => 
      current.bandwidth > max.bandwidth ? current : max
    );
    
    // 提取全域標籤（第一個串流之前的內容）
    const globalTags = text.substring(0, maxBitrateStream.index);
    
    return globalTags + maxBitrateStream.content;
  } catch (error) {
    console.warn('[HLS Enhancer] Failed to modify playlist:', error);
    return text;
  }
};

/**
 * 安全地重新定義物件屬性
 * @param {object} target - 目標物件
 * @param {string} property - 屬性名稱
 * @param {any} value - 新值
 */
const safeDefineProperty = (target: any, property: string, value: any): void => {
  try {
    Object.defineProperty(target, property, {
      get: () => value,
      configurable: true,
      enumerable: true
    });
  } catch (error) {
    console.warn(`[HLS Enhancer] Failed to redefine ${property}:`, error);
  }
};

/**
 * 處理 XMLHttpRequest 的 readystatechange 事件
 * @this {XMLHttpRequest} - XMLHttpRequest 實例
 * @param {Event} e - 事件物件
 * @returns {void}
 */
function handleReadyStateChange(this: XMLHttpRequest, e: Event): void {
  // 避免重複處理
  if (this.readyState !== 4 || processedPlaylists.has(this)) {
    return;
  }
  
  try {
    const target = e.target as ExtendedXMLHttpRequest;
    const originalText = target.responseText as string;
    
    if (!originalText || typeof originalText !== 'string') {
      return;
    }
    
    if (isMasterPlaylist(originalText)) {
      const modifiedText = modifyMasterPlaylist(originalText);
      
      // 只有在內容確實被修改時才重新定義屬性
      if (modifiedText !== originalText) {
        safeDefineProperty(this, 'response', modifiedText);
        safeDefineProperty(this, 'responseText', modifiedText);
        
        console.debug('[HLS Enhancer] Playlist modified for highest quality');
      }
      
      // 標記為已處理
      processedPlaylists.add(this);
    }
  } catch (error) {
    console.warn('[HLS Enhancer] Error handling response:', error);
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
  try {
    const urlStr = url.toString();
    const result = realOpen.call(this, method, url, async, username, password);

    if (isHlsPlaylist(urlStr)) {
      // 使用 once 選項避免重複監聽，使用 passive 提升性能
      this.addEventListener('readystatechange', handleReadyStateChange.bind(this), {
        passive: true
      });
    }

    return result;
  } catch (error) {
    console.warn('[HLS Enhancer] Error in hijacked open:', error);
    // 發生錯誤時回退到原始方法
    return realOpen.call(this, method, url, async, username, password);
  }
}

/**
 * 檢查是否已經初始化過
 */
let isInitialized = false;

/**
 * 初始化 HLS 攔截功能，重寫 XMLHttpRequest 的 open 方法
 * @returns {void}
 */
function initHijack(): void {
  if (isInitialized) {
    console.warn('[HLS Enhancer] Already initialized');
    return;
  }
  
  try {
    const realOpen = window.XMLHttpRequest.prototype.open;
    
    if (typeof realOpen !== 'function') {
      throw new Error('XMLHttpRequest.prototype.open is not a function');
    }
    
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
    
    isInitialized = true;
  } catch (error) {
    console.error('[HLS Enhancer] Failed to initialize hijack:', error);
    throw error;
  }
}

/**
 * 初始化 HLS 增強功能，啟用 HLS 串流攔截
 * @returns {void}
 */
export const initHLSEnhancer = (): void => {
  try {
    initHijack();
    console.log('[HLS Enhancer] Initialized successfully');
  } catch (error) {
    console.error('[HLS Enhancer] Initialization failed:', error);
  }
};

/**
 * 清理資源（可選，用於測試或重置）
 * @returns {void}
 */
export const cleanupHLSEnhancer = (): void => {
  isInitialized = false;
  // 注意：WeakSet 沒有 clear() 方法，我們依賴垃圾回收來自動清理
  console.log('[HLS Enhancer] Cleaned up');
};
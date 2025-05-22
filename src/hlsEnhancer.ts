/**
 * HLS 增強功能
 * 自動選擇最高畫質的串流
 */

// 使用交叉類型來擴展 XMLHttpRequest 的類型定義
type ExtendedXMLHttpRequest = Omit<
  XMLHttpRequest,
  'response' | 'responseText'
> & {
  response: any; // 使用 any 類型，因為我們會動態設置它
  responseText: string | ArrayBuffer | null;
};

/**
 * 初始化 HLS 攔截功能
 */
export function initHijack(): void {
  const realOpen = window.XMLHttpRequest.prototype.open;

  function isHLSPlaylist(url: string): boolean {
    const reg = /^https:\/\/video\.twimg\.com\/.+m3u8?/i;
    return reg.test(url);
  }

  function isMasterPlaylist(text: string): boolean {
    return (
      text.indexOf('#EXT-X-TARGETDURATION') === -1 &&
      text.indexOf('#EXT-X-STREAM-INF') !== -1
    );
  }

  function modifyMasterPlaylist(text: string): string {
    let result = text;
    const reg = /^#EXT-X-STREAM-INF:.*BANDWIDTH=(\d+).*\r?\n.*$/gm;
    let stream = reg.exec(text);

    if (stream) {
      const globalTags = text.substring(0, stream.index);
      let maxBitrateStream = stream;

      // 尋找最高位元率的串流
      while ((stream = reg.exec(text)) !== null) {
        if (parseInt(stream[1]) > parseInt(maxBitrateStream[1])) {
          maxBitrateStream = stream;
        }
      }

      result = globalTags + maxBitrateStream[0];
    }

    return result;
  }

  function hijackedOpen(
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async = true,
    username?: string | null,
    password?: string | null,
  ): ReturnType<typeof realOpen> {
    const urlStr = url.toString();

    if (isHLSPlaylist(urlStr)) {
      this.addEventListener(
        'readystatechange',
        function (this: XMLHttpRequest, e: Event) {
          if (this.readyState === 4) {
            const target = e.target as ExtendedXMLHttpRequest;
            const originalText = target.responseText as string;

            if (originalText && isMasterPlaylist(originalText)) {
              const modifiedText = modifyMasterPlaylist(originalText);

              // 修改 response 和 responseText
              Object.defineProperty(this, 'response', {
                writable: true,
                value: modifiedText,
              });

              Object.defineProperty(this, 'responseText', {
                writable: true,
                value: modifiedText,
              });
            }
          }
        },
      );
    }

    return realOpen.call(this, method, url, async, username, password);
  }

  // 覆蓋原始的 open 方法
  // 使用類型斷言來覆蓋原始的 open 方法
  (window.XMLHttpRequest.prototype.open as typeof realOpen) = hijackedOpen;
}

/**
 * 初始化使用者介面
 */
export function initUI(): void {
  // 添加標記以識別腳本是否成功載入
  const disableHQ = localStorage.getItem('vqfft-disablehq');

  if (!disableHQ) {
    const mark = document.createElement('button');
    mark.innerText = 'HQ';
    mark.style.cssText =
      'position: fixed; right: 5px; top: 5px; color: white; border-width: 0px; border-radius: 5px; background-color: gray; opacity: 0.5; z-index: 9999;';

    mark.onclick = function () {
      if (window.confirm('Do not display HQ mark anymore?')) {
        localStorage.setItem('vqfft-disablehq', 'true');
        mark.remove();
      }
    };

    document.body.appendChild(mark);
  }
}

/**
 * 初始化 HLS 增強功能
 */
export function initHLSEhnancer(): void {
  initHijack();
  initUI();
  console.log('HLS Enhancer initialized');
}

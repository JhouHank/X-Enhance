/**
 * 基礎選擇器函式，用於選取並過濾 DOM 元素
 * @param selector - CSS 選擇器字串
 * @param customFilter - 可選的自定義過濾函式
 * @param interval - 可選的執行間隔（毫秒），如果提供，則會定時執行選擇器
 * @returns 返回一個函式，執行後會返回過濾後的 DOM 元素陣列，如果設定了間隔，還會返回清除定時器的函式
 */
export function baseSelector(
  selector: string,
  customFilter?: (elements: HTMLElement[]) => HTMLElement[],
  interval?: number,
) {
  const execute = () => {
    try {
      const items = document.querySelectorAll<HTMLElement>(selector);
      console.log(
        `[baseSelector] 找到 ${items.length} 個匹配 ${selector} 的元素`,
      );

      let filterResult = Array.from(items).filter((item) => {
        const nodes = item.querySelectorAll('[data-translate]');
        return (
          !item.dataset.translate &&
          !(nodes && Array.from(nodes).some((node) => node.parentNode === item))
        );
      });

      if (customFilter) {
        filterResult = customFilter(filterResult);
      }

      filterResult.forEach((item) => {
        item.dataset.translate = 'processed';
        console.log('[baseSelector] 標記元素:', item);
      });

      return filterResult;
    } catch (error) {
      console.error('[baseSelector] 執行錯誤:', error);
      return [];
    }
  };

  // 立即執行一次
  const result = execute();

  // 如果需要定時執行
  if (interval && interval > 0) {
    const timerId = setInterval(execute, interval);
    console.log(`[baseSelector] 已設定定時器，每 ${interval} 毫秒執行一次`);

    // 返回清除定時器的函式
    return {
      result,
      clear: () => {
        clearInterval(timerId);
        console.log('[baseSelector] 已清除定時器');
      },
    };
  }

  return { result };
}

/**
 * 取得元素的文字內容
 * @param e - 目標 DOM 元素
 * @returns 返回元素的文字內容
 */
export function baseTextGetter(e: HTMLElement): string {
  return e.innerText;
}

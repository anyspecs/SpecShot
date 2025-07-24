export interface ClickResult {
  success: boolean;
  message: string;
  element?: Element;
}

export class DOMClicker {
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 处理:contains()伪选择器
  private static querySelectorWithContains(selector: string): NodeListOf<Element> {
    const containsMatch = selector.match(/^(.+):contains\("([^"]+)"\)$/);
    if (!containsMatch) {
      return document.querySelectorAll(selector);
    }

    const [, baseSelector, text] = containsMatch;
    const baseElements = document.querySelectorAll(baseSelector || '*');
    const matchingElements: Element[] = [];

    baseElements.forEach(element => {
      if (element.textContent?.includes(text)) {
        matchingElements.push(element);
      }
    });

    // 转换为NodeListOf<Element>类似的结构
    const nodeList = {
      length: matchingElements.length,
      [Symbol.iterator]: () => matchingElements[Symbol.iterator](),
      forEach: (callback: (element: Element, index: number) => void) => {
        matchingElements.forEach(callback);
      }
    };

    return nodeList as any;
  }

  private static isElementClickable(element: Element): boolean {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return rect.width > 0 && 
           rect.height > 0 && 
           style.visibility !== 'hidden' &&
           style.display !== 'none' &&
           !element.hasAttribute('disabled');
  }

  private static smartClick(element: Element): boolean {
    const clickMethods = [
      // 直接点击
      () => {
        if ('click' in element && typeof element.click === 'function') {
          (element as HTMLElement).click();
          return true;
        }
        return false;
      },
      // 如果是SVG或span，点击父容器
      () => {
        if (element.tagName === 'SVG' || element.tagName === 'SPAN') {
          const parent = element.closest('.simple-button, .icon, [role="button"], button');
          if (parent && parent !== element && 'click' in parent && typeof parent.click === 'function') {
            (parent as HTMLElement).click();
            return true;
          }
        }
        return false;
      },
      // 派发鼠标事件
      () => element.dispatchEvent(new MouseEvent('click', { 
        bubbles: true, 
        cancelable: true,
        view: window 
      })),
      // 点击父容器 
      () => {
        const parent = element.closest('.simple-button, .icon, [role="button"], button');
        if (parent && 'click' in parent && typeof parent.click === 'function') {
          (parent as HTMLElement).click();
          return true;
        }
        return false;
      },
      // 触发焦点和键盘事件
      () => {
        if ('focus' in element && typeof element.focus === 'function') {
          (element as HTMLElement).focus();
        }
        element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        return true;
      }
    ];

    for (let i = 0; i < clickMethods.length; i++) {
      try {
        const result = clickMethods[i]();
        if (result !== false) {
          console.log(`✅ 点击方法 ${i+1} 成功`);
          return true;
        }
      } catch (e) {
        console.warn(`❌ 点击方法 ${i+1} 失败:`, e);
      }
    }
    return false;
  }

  static async findAndClick(
    selectors: string[], 
    description: string,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<ClickResult> {
    
    console.log(`🔍 开始寻找 ${description}，选择器数量: ${selectors.length}`);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`📝 第${attempt}次尝试寻找 ${description}`);
      
      // 尝试所有选择器
      for (let i = 0; i < selectors.length; i++) {
        const selector = selectors[i];
        try {
          let elements: NodeListOf<Element>;
          
          // 处理:contains()伪选择器
          if (selector.includes(':contains(')) {
            elements = this.querySelectorWithContains(selector);
          } else {
            elements = document.querySelectorAll(selector);
          }
          
          console.log(`🎯 选择器 ${i+1}/${selectors.length} [${selector}] 找到 ${elements.length} 个元素`);
          
          // 如果是导出按钮且找到多个，优先选择最后一个
          const elementsArray = Array.from(elements);
          const shouldClickLast = description.includes('导出') && elementsArray.length > 1;
          
          if (shouldClickLast) {
            console.log(`🎯 找到${elementsArray.length}个导出按钮，将点击最后一个`);
            const lastElement = elementsArray[elementsArray.length - 1];
            const isClickable = this.isElementClickable(lastElement);
            console.log(`📋 最后一个元素: 可点击=${isClickable}`, {
              tagName: lastElement.tagName,
              className: lastElement.className,
              textContent: lastElement.textContent?.substring(0, 50)
            });
            
            if (isClickable) {
              console.log(`🖱️ 尝试点击最后一个导出按钮`);
              const clicked = this.smartClick(lastElement);
              
              if (clicked) {
                console.log(`✅ ${description} 点击成功！`);
                return {
                  success: true,
                  message: `${description} 点击成功`,
                  element: lastElement
                };
              }
            }
          } else {
            // 正常遍历所有元素
            for (let j = 0; j < elements.length; j++) {
              const element = elements[j];
              const isClickable = this.isElementClickable(element);
              console.log(`📋 元素 ${j+1}: 可点击=${isClickable}`, {
                tagName: element.tagName,
                className: element.className,
                textContent: element.textContent?.substring(0, 50)
              });
              
              if (isClickable) {
                console.log(`🖱️ 尝试点击元素 ${j+1}`);
                const clicked = this.smartClick(element);
                
                if (clicked) {
                  console.log(`✅ ${description} 点击成功！`);
                  return {
                    success: true,
                    message: `${description} 点击成功`,
                    element
                  };
                } else {
                  console.log(`❌ 元素点击失败`);
                }
              }
            }
          }
        } catch (error) {
          console.warn(`❌ 选择器失败: ${selector}`, error);
        }
      }

      // 如果不是最后一次尝试，等待后重试
      if (attempt < maxRetries) {
        console.log(`⏳ ${description} 第${attempt}次尝试失败，${retryDelay}ms后重试`);
        await this.delay(retryDelay);
      }
    }

    console.log(`💥 ${description} 所有尝试都失败了`);
    return {
      success: false,
      message: `${description} 未找到或无法点击 (已尝试${maxRetries}次)`
    };
  }

  static async waitForElement(
    selectors: string[], 
    timeout: number = 5000
  ): Promise<Element | null> {
    const endTime = Date.now() + timeout;
    
    while (Date.now() < endTime) {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && this.isElementClickable(element)) {
          return element;
        }
      }
      await this.delay(100);
    }
    
    return null;
  }
}
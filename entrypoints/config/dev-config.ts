// 开发者配置 - 控制调试功能的显示和启用
export const DEV_CONFIG = {
  // 是否显示调试日志
  showDebugLogs: false,
  
  // 是否在控制台输出详细信息
  enableConsoleLogging: false,
  
  // 是否启用详细错误信息
  enableVerboseErrors: false,
  
  // 是否显示性能监控信息
  enablePerformanceMonitoring: false,
};

// 开发者日志工具 - 只在开发模式下输出
export const devLog = {
  info: (message: string, ...args: any[]) => {
    if (DEV_CONFIG.enableConsoleLogging) {
      console.log(`[DEV] ${message}`, ...args);
    }
  },
  
  error: (message: string, ...args: any[]) => {
    if (DEV_CONFIG.enableConsoleLogging) {
      console.error(`[DEV ERROR] ${message}`, ...args);
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    if (DEV_CONFIG.enableConsoleLogging) {
      console.warn(`[DEV WARN] ${message}`, ...args);
    }
  },
  
  debug: (message: string, ...args: any[]) => {
    if (DEV_CONFIG.enableConsoleLogging) {
      console.debug(`[DEV DEBUG] ${message}`, ...args);
    }
  },
  
  performance: (label: string, fn: () => void) => {
    if (DEV_CONFIG.enablePerformanceMonitoring) {
      const start = performance.now();
      fn();
      const end = performance.now();
      console.log(`[PERF] ${label}: ${end - start}ms`);
    } else {
      fn();
    }
  }
};

// 类型定义
export type DevLogLevel = 'info' | 'error' | 'warn' | 'debug';
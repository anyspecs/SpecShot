/**
 * 认证管理器 - 处理用户认证状态和token管理
 */

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  avatar: string;
}

export interface AuthData {
  token: string | null;
  userInfo: UserInfo | null;
}

export interface JWTValidationResult {
  valid: boolean;
  user?: UserInfo;
  error?: string;
}

export class AuthManager {
  private static readonly API_BASE = 'http://localhost:5000/api';
  
  /**
   * 保存认证信息到chrome.storage.local
   */
  static async saveAuthData(token: string, userInfo: UserInfo): Promise<void> {
    await chrome.storage.local.set({
      authToken: token,
      userInfo: userInfo,
      authTimestamp: Date.now()
    });
  }
  
  /**
   * 从chrome.storage.local获取认证信息
   */
  static async getAuthData(): Promise<AuthData> {
    const result = await chrome.storage.local.get(['authToken', 'userInfo']);
    return {
      token: result.authToken || null,
      userInfo: result.userInfo || null
    };
  }
  
  /**
   * 清除认证信息
   */
  static async clearAuthData(): Promise<void> {
    await chrome.storage.local.remove(['authToken', 'userInfo', 'authTimestamp']);
  }
  
  /**
   * 验证JWT并获取用户信息 - 恢复后端验证
   */
  static async validateJWT(token: string): Promise<JWTValidationResult> {
    try {
      const response = await fetch(`${AuthManager.API_BASE}/auth/validate`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          valid: true,
          user: {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            avatar: data.user.avatar
          }
        };
      } else {
        return { valid: false, error: 'Token validation failed' };
      }
    } catch (error) {
      console.error('JWT validation failed:', error);
      return { valid: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  }
  
  /**
   * 检查认证状态 - 新的简化流程
   */
  static async checkAuthStatus(): Promise<'authenticated' | 'unauthenticated'> {
    // 1. 先检查插件本地存储
    let authData = await this.getAuthData();
    
    if (authData.token) {
      const validation = await this.validateJWT(authData.token);
      if (validation.valid && validation.user) {
        // 确保用户信息是最新的
        await this.saveAuthData(authData.token, validation.user);
        return 'authenticated';
      } else {
        // token失效，清除存储
        await this.clearAuthData();
      }
    }
    
    // 2. 尝试从网页读取JWT
    const webJWT = await this.getJWTFromWebpage();
    if (webJWT) {
      const validation = await this.validateJWT(webJWT);
      if (validation.valid && validation.user) {
        // 同步到插件存储
        await this.saveAuthData(webJWT, validation.user);
        return 'authenticated';
      }
    }
    
    return 'unauthenticated';
  }
  
  /**
   * 从网页localStorage读取JWT
   */
  static async getJWTFromWebpage(): Promise<string | null> {
    try {
      const tabs = await chrome.tabs.query({url: "http://localhost:3000/*"});
      if (tabs.length === 0) {
        console.log('No web app tabs found');
        return null;
      }
      
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id! },
        function: () => {
          // 尝试多个可能的token key名称
          return localStorage.getItem('authToken') || 
                 localStorage.getItem('jwt_token') || 
                 localStorage.getItem('access_token') ||
                 localStorage.getItem('token');
        }
      });
      
      const jwt = results[0]?.result;
      console.log('JWT from webpage:', jwt ? 'Found' : 'Not found');
      return jwt || null;
    } catch (error) {
      console.error('Failed to read JWT from webpage:', error);
      return null;
    }
  }
  
  /**
   * 仅保存JWT到本地存储（用于同步网页状态）
   */
  static async saveJWTOnly(token: string): Promise<void> {
    // 先验证JWT获取用户信息
    const validation = await this.validateJWT(token);
    if (validation.valid && validation.user) {
      await this.saveAuthData(token, validation.user);
    } else {
      throw new Error('Invalid JWT token');
    }
  }
  
  /**
   * 登出用户 - 离线版本
   */
  static async logout(): Promise<void> {
    // 清除本地存储
    await this.clearAuthData();
    
    // 尝试清除网页存储（如果网页还在的话）
    try {
      const tabs = await chrome.tabs.query({url: "http://localhost:3000/*"});
      if (tabs.length > 0) {
        await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id! },
          function: () => {
            // 清除所有可能的token key
            localStorage.removeItem('authToken');
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('access_token');
            localStorage.removeItem('token');
          }
        });
      }
    } catch (error) {
      console.error('Failed to clear webpage storage:', error);
    }
  }
  
  /**
   * 获取当前认证状态（不进行网络请求）
   */
  static async getAuthStatusSync(): Promise<'loading' | 'authenticated' | 'unauthenticated'> {
    const authData = await this.getAuthData();
    return authData.token ? 'authenticated' : 'unauthenticated';
  }

  /**
   * 刷新认证状态（强制重新检查）
   */
  static async refreshAuthStatus(): Promise<'authenticated' | 'unauthenticated'> {
    // 清除当前存储，强制重新检查
    await this.clearAuthData();
    return await this.checkAuthStatus();
  }
}
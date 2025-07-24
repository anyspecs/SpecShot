export interface AuthTokenResponse {
  success: boolean;
  access_token?: string;
  user?: {
    id: number;
    username: string;
    email: string;
  };
  error?: string;
}

export interface UploadResponse {
  success: boolean;
  filename?: string;
  message?: string;
  error?: string;
}

export class RestFileTransfer {
  private readonly apiUrl = 'http://127.0.0.1:4999';
  private token: string | null = null;
  private username: string = 'testuser'; // 默认测试用户
  
  // 获取认证token
  async getAuthToken(): Promise<AuthTokenResponse> {
    try {
      const url = `${this.apiUrl}/api/test-token/${this.username}`;
      console.log('🔐 正在获取认证token...');
      console.log('📡 请求URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📥 响应状态:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ 响应内容:', errorText);
        throw new Error(`获取token失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📋 响应数据:', result);
      
      if (result.access_token) {
        this.token = result.access_token;
        console.log('✅ Token获取成功');
        return {
          success: true,
          access_token: result.access_token,
          user: result.user
        };
      } else {
        throw new Error('Token响应格式错误');
      }

    } catch (error: any) {
      console.error('❌ 获取token失败:', error);
      console.error('❌ 错误类型:', error.name);
      console.error('❌ 错误堆栈:', error.stack);
      
      // 检查是否是网络错误
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.error('❌ 这是一个fetch网络错误，可能是CORS或URL问题');
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 上传文件
  async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<UploadResponse> {
    if (!this.token) {
      throw new Error('未找到认证token，请先获取token');
    }

    const formData = new FormData();
    formData.append('file', file);

    // 检查XMLHttpRequest是否可用，如果不可用则使用fetch
    if (typeof XMLHttpRequest === 'undefined') {
      console.log('🔄 XMLHttpRequest不可用，使用fetch上传');
      return this.uploadWithFetch(formData, file.name);
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // 上传进度监听
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const result = JSON.parse(xhr.responseText);
            console.log('✅ 文件上传成功:', result);
            resolve({
              success: true,
              filename: file.name,
              message: result.message || '上传成功'
            });
          } catch (error) {
            console.error('❌ 解析响应失败:', error);
            resolve({
              success: true, // 如果上传成功但响应格式有问题，仍然认为成功
              filename: file.name,
              message: '上传成功'
            });
          }
        } else {
          console.error('❌ 上传失败:', xhr.status, xhr.statusText);
          resolve({
            success: false,
            error: `上传失败: ${xhr.status} ${xhr.statusText}`
          });
        }
      });

      xhr.addEventListener('error', () => {
        console.error('❌ 网络错误');
        resolve({
          success: false,
          error: '网络错误'
        });
      });

      xhr.addEventListener('timeout', () => {
        console.error('❌ 上传超时');
        resolve({
          success: false,
          error: '上传超时'
        });
      });

      xhr.timeout = 60000; // 60秒超时
      xhr.open('POST', `${this.apiUrl}/api/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
      xhr.send(formData);
    });
  }

  // 使用fetch的上传方法（备用）
  private async uploadWithFetch(formData: FormData, filename: string): Promise<UploadResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json().catch(() => ({}));
        console.log('✅ 文件上传成功(fetch):', result);
        return {
          success: true,
          filename: filename,
          message: result.message || '上传成功'
        };
      } else {
        throw new Error(`上传失败: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('❌ fetch上传失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 完整的传输流程
  async startTransfer(
    file: File, 
    platform: string,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; redirectUrl?: string; error?: string }> {
    try {
      console.log(`📤 开始文件传输: ${file.name} (${file.size} bytes) - 平台: ${platform}`);

      // 1. 获取JWT token
      const tokenResult = await this.getAuthToken();
      if (!tokenResult.success) {
        throw new Error(tokenResult.error || '获取认证token失败');
      }

      console.log('🔐 认证token获取成功');

      // 2. 上传文件到后端
      const uploadResult = await this.uploadFile(file, onProgress);
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || '文件上传失败');
      }

      console.log('✅ 文件上传完成');

      // 3. 构造文件访问URL
      const redirectUrl = `${this.apiUrl}/${this.username}/${file.name}`;
      console.log(`🌐 文件访问地址: ${redirectUrl}`);

      return { 
        success: true, 
        redirectUrl 
      };

    } catch (error: any) {
      console.error('❌ 文件传输失败:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // 重置token
  reset(): void {
    this.token = null;
  }

  // 设置用户名（如果需要）
  setUsername(username: string): void {
    this.username = username;
    this.token = null; // 重置token
  }
}
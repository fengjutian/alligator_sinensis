import React from "react";
import { hydrateRoot } from "react-dom/client";

/**
 * 客户端入口文件
 * 负责客户端水合和应用初始化
 */

// 客户端应用组件接口
interface ClientAppProps {
  // 可以从服务器传递的初始数据
  initialData?: Record<string, any>;
}

/**
 * 客户端应用组件
 * 用于水合服务器渲染的HTML
 */
function ClientApp({ initialData = {} }: ClientAppProps) {
  // 在客户端初始化应用状态
  // 这里可以从服务器传递的初始数据中获取数据
  // 实际项目中，您可能需要根据具体的路由和组件进行调整
  
  // 如果需要，可以添加客户端特有的逻辑
  React.useEffect(() => {
    console.log("客户端应用已启动");
    console.log("初始数据:", initialData);
    
    // 可以在这里添加客户端特有的初始化代码
    // 例如：设置事件监听、初始化第三方库等
  }, []);
  
  // 注意：这里我们不直接渲染内容，而是水合服务器渲染的内容
  // 实际的组件内容应该在路由组件中定义
  return null;
}

/**
 * 客户端水合函数
 * 将服务器渲染的HTML与React组件关联起来
 */
function hydrateApp() {
  try {
    // 获取根DOM元素
    const rootElement = document.getElementById('root');
    
    if (!rootElement) {
      console.error('根元素 #root 未找到');
      return;
    }
    
    // 尝试从全局变量中获取初始数据
    // 在实际应用中，这些数据通常由服务器在HTML中嵌入
    const initialData = window.__INITIAL_DATA__ || {};
    
    // 执行水合操作
    hydrateRoot(rootElement, (
      <React.StrictMode>
        <ClientApp initialData={initialData} />
      </React.StrictMode>
    ));
    
    console.log("客户端水合完成");
  } catch (error) {
    console.error("客户端水合失败:", error);
    
    // 如果水合失败，可以尝试完全重新渲染
    const rootElement = document.getElementById('root');
    if (rootElement) {
      // 清空根元素内容
      rootElement.innerHTML = '';
      
      // 在这里可以放置错误状态页面或简单的重新渲染逻辑
      rootElement.textContent = '应用加载失败，请刷新页面重试';
    }
  }
}

/**
 * RPC客户端调用函数
 * 用于在客户端调用服务器的RPC方法
 */
export async function callRpc<T = any>(method: string, params: unknown): Promise<T> {
  try {
    const response = await fetch('/api/rpc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ method, params })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data as T;
  } catch (error) {
    console.error(`RPC调用失败 [${method}]:`, error);
    throw error;
  }
}

/**
 * 页面导航函数
 * 提供客户端导航能力
 */
export function navigateTo(url: string, replace = false) {
  if (replace) {
    window.history.replaceState(null, '', url);
  } else {
    window.history.pushState(null, '', url);
  }
  
  // 触发popstate事件，以便路由系统可以处理导航
  const event = new PopStateEvent('popstate');
  window.dispatchEvent(event);
}

/**
 * 全局错误处理
 */
function setupGlobalErrorHandling() {
  // 捕获未处理的Promise拒绝
  window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', event.reason);
    // 可以在这里添加错误上报逻辑
  });
  
  // 捕获未捕获的异常
  window.addEventListener('error', (event) => {
    console.error('未捕获的异常:', event.error);
    // 可以在这里添加错误上报逻辑
  });
}

/**
 * 初始化WebSocket连接（如果需要）
 */
export function initWebSocket(url: string, handlers?: {
  onOpen?: (ws: WebSocket) => void;
  onMessage?: (event: MessageEvent) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}): WebSocket | null {
  try {
    const ws = new WebSocket(url);
    
    ws.onopen = (event) => {
      console.log('WebSocket连接已建立');
      handlers?.onOpen?.(ws);
    };
    
    ws.onmessage = (event) => {
      handlers?.onMessage?.(event);
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket连接已关闭', event.code, event.reason);
      handlers?.onClose?.(event);
    };
    
    ws.onerror = (event) => {
      console.error('WebSocket错误:', event);
      handlers?.onError?.(event);
    };
    
    return ws;
  } catch (error) {
    console.error('WebSocket初始化失败:', error);
    return null;
  }
}

/**
 * 应用初始化函数
 */
function initApp() {
  // 设置全局错误处理
  setupGlobalErrorHandling();
  
  // 执行水合
  hydrateApp();
  
  // 可以在这里添加其他客户端初始化逻辑
}

// 当DOM加载完成后初始化应用
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  // 如果DOM已经加载完成，直接初始化应用
  initApp();
}

// 导出一些常用函数供客户端代码使用
export { hydrateApp };
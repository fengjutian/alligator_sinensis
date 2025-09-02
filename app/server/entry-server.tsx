import React from "react";
import { renderPage } from "../../framework/ssr";
import { commonMiddleware } from "./db";

/**
 * SSR 入口文件
 * 负责服务器端渲染逻辑和处理
 */

// 类型定义
interface RenderOptions {
  Component: React.ComponentType;
  props?: Record<string, any>;
  title?: string;
  context?: Record<string, any>;
}

/**
 * 渲染React组件为HTML响应
 * @param options 渲染选项
 * @returns HTML响应对象
 */
export async function renderComponent(
  options: RenderOptions
): Promise<Response> {
  const { Component, props = {}, title, context = {} } = options;
  
  try {
    // 创建组件实例
    const component = React.createElement(Component, props);
    
    // 使用现有的渲染函数生成HTML响应
    return await renderPage(component, { title });
  } catch (error) {
    console.error("SSR渲染错误:", error);
    return new Response(
      `<!DOCTYPE html><html><body><pre>${error instanceof Error ? error.stack : String(error)}</pre></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
}

/**
 * 创建带中间件支持的渲染器
 * @param middleware 自定义中间件数组
 * @returns 增强的渲染函数
 */
export function createRenderer(
  middleware: Array<(next: any) => any> = []
) {
  // 合并默认中间件和自定义中间件
  const allMiddleware = [commonMiddleware, ...middleware];
  
  return async (options: RenderOptions) => {
    // 创建上下文对象
    const context = {
      locals: {},
      ...options.context
    };
    
    // 创建渲染函数作为最终处理程序
    const renderHandler = async (ctx: any) => {
      return await renderComponent({
        ...options,
        context: ctx
      });
    };
    
    // 应用中间件链
    const handler = applyMiddleware(allMiddleware, renderHandler);
    
    // 执行中间件链
    return await handler(context);
  };
}

/**
 * 应用中间件链
 * @param middlewares 中间件数组
 * @param handler 最终处理程序
 * @returns 组合后的处理函数
 */
export function applyMiddleware(
  middlewares: Array<(next: any) => any>,
  handler: any
) {
  return middlewares.reduceRight((prev, curr) => {
    return curr(prev);
  }, handler);
}

/**
 * 默认渲染器实例
 */
export const defaultRenderer = createRenderer();

/**
 * 导出一个简单的渲染函数作为默认导出
 */
export default function serverRender(
  Component: React.ComponentType,
  props?: Record<string, any>,
  title?: string
) {
  return defaultRenderer({ Component, props, title });
}
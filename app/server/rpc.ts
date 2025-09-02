import { z } from "zod";
import { db } from "./db";

/**
 * RPC 注册中心
 * 定义所有支持的远程过程调用方法
 */
export const rpc = {
  /**
   * 获取用户信息
   */
  getUser: {
    input: z.object({
      id: z.string()
    }),
    resolve: async ({ id }) => {
      const row = db.query("SELECT id, name FROM users WHERE id = ?").get(id);
      if (!row) {
        throw new Error(`用户不存在: ${id}`);
      }
      return { id: row[0], name: row[1] };
    }
  },
  
  /**
   * 获取用户列表
   */
  getUsers: {
    input: z.object({
      limit: z.number().optional().default(10),
      offset: z.number().optional().default(0)
    }),
    resolve: async ({ limit, offset }) => {
      const rows = db.query("SELECT id, name FROM users LIMIT ? OFFSET ?").all(limit, offset);
      return rows.map((r: any) => ({ id: r[0], name: r[1] }));
    }
  },
  
  /**
   * 创建用户
   */
  createUser: {
    input: z.object({
      id: z.string().optional(),
      name: z.string().min(2).max(100)
    }),
    resolve: async ({ id, name }) => {
      const userId = id || Math.random().toString(36).substr(2, 9);
      
      try {
        db.run("INSERT INTO users (id, name) VALUES (?, ?)", userId, name);
        return { id: userId, name };
      } catch (error) {
        if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
          throw new Error(`用户ID已存在: ${userId}`);
        }
        throw error;
      }
    }
  },
  
  /**
   * 更新用户
   */
  updateUser: {
    input: z.object({
      id: z.string(),
      name: z.string().min(2).max(100)
    }),
    resolve: async ({ id, name }) => {
      const result = db.run("UPDATE users SET name = ? WHERE id = ?", name, id);
      if (result.changes === 0) {
        throw new Error(`用户不存在: ${id}`);
      }
      return { id, name };
    }
  },
  
  /**
   * 删除用户
   */
  deleteUser: {
    input: z.object({
      id: z.string()
    }),
    resolve: async ({ id }) => {
      const result = db.run("DELETE FROM users WHERE id = ?", id);
      if (result.changes === 0) {
        throw new Error(`用户不存在: ${id}`);
      }
      return { success: true, id };
    }
  },
  
  /**
   * 统计用户数量
   */
  countUsers: {
    input: z.object({}),
    resolve: async () => {
      const row = db.query("SELECT COUNT(*) FROM users").get();
      return { count: row ? row[0] : 0 };
    }
  }
} as const;

/**
 * RPC方法类型
 */
export type RpcMethod = keyof typeof rpc;

/**
 * 执行RPC调用
 * @param method 方法名
 * @param params 参数
 * @returns 调用结果
 */
export async function executeRpc(
  method: string,
  params: unknown
): Promise<any> {
  const rpcMethod = (rpc as any)[method];
  if (!rpcMethod) {
    throw new Error(`未知的RPC方法: ${method}`);
  }
  
  try {
    // 验证输入参数
    const validatedParams = rpcMethod.input.parse(params);
    
    // 执行方法
    return await rpcMethod.resolve(validatedParams);
  } catch (error) {
    console.error(`RPC执行错误 [${method}]:`, error);
    throw error;
  }
}

/**
 * 创建RPC处理函数
 * 用于在API路由中使用
 */
export function createRpcHandler() {
  return async (ctx: any) => {
    try {
      const body = await ctx.req.json();
      const { method, params } = body;
      
      if (!method) {
        return new Response(
          JSON.stringify({ error: 'Missing method parameter' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      const result = await executeRpc(method, params);
      
      return new Response(
        JSON.stringify({ data: result }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}
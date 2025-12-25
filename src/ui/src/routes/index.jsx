/**
 * 路由配置
 * 
 * 路由结构：
 * /#/                → 文档编辑器（首页）
 * /#/idea            → 想法模块
 * /#/idea/:date      → 想法模块 + 定位到某天
 * /#/settings        → 设置页面
 */

import { createHashRouter, Navigate } from 'react-router-dom';
import App from '../App';

// 路由配置
export const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: null, // 使用 App 内部的 EditorView
      },
      {
        path: 'idea',
        element: null, // 使用 App 内部的 IdeaView
      },
      {
        path: 'idea/:date',
        element: null, // 使用 App 内部的 IdeaView，带日期参数
      },
      {
        path: 'settings',
        element: null, // 使用 App 内部的 SettingsView
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

// 路由路径常量
export const ROUTES = {
  HOME: '/',
  IDEA: '/idea',
  IDEA_DATE: (date) => `/idea/${date}`,
  SETTINGS: '/settings',
};


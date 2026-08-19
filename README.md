# 西安市东部城市设计一张图原型

面向城市设计单元与地块的交互式管控查询原型。用户可在地图上直接点击单元或地块，右侧表格随选择对象显示对应的城市设计管控内容。

## 当前内容

- 38 个城市设计单元、3544 个地块
- 28 类管控数据与空间对象关联
- 地块要求按城市设计导则进行分解表达，不直接照搬单元要求
- 用地布局采用 `20260710.lyr` 色板
- 支持地图点击、高亮、图层切换、搜索与右侧管控结果表格

## 本地运行

```bash
npm install
npm run dev
```

## 校验与静态构建

```bash
npm test
npm run build:static
```

静态文件输出到 `dist-static`，并由 GitHub Actions 自动发布到 GitHub Pages。

## 在线访问

[打开城市设计一张图](https://jvmins.github.io/xian-urban-design-map/)

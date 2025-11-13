# 测试打包应用

## 快速验证白屏修复

### 方法 1: 快速构建测试

```bash
# 1. 编译代码
npm run compile

# 2. 运行诊断
npm run diagnose

# 3. 构建应用（选择你的平台）
npm run build:mac    # macOS
npm run build:win    # Windows
npm run build:linux  # Linux

# 4. 查找并运行打包好的应用
# macOS: release/mac-arm64/Whisper Desktop.app (或 mac-x64)
# Windows: release/win-unpacked/Whisper Desktop.exe
# Linux: release/linux-unpacked/whisper-desktop
```

### 方法 2: 开启开发者工具调试

如果你想查看打包应用的控制台输出，临时修改 `electron/main.ts`：

```typescript
} else {
  // In production, load from local file system
  const indexPath = path.join(__dirname, '../renderer/index.html')
  mainWindow.loadURL(pathToFileURL(indexPath).toString())

  // 临时添加：打开开发者工具查看错误
  mainWindow.webContents.openDevTools()
}
```

重新构建后，打包的应用会自动打开开发者工具，你可以查看：
- Console 标签：JavaScript 错误
- Network 标签：资源加载情况
- Sources 标签：加载的文件

### 预期结果

✅ **修复成功的标志**:
- 应用启动后正常显示界面
- 左侧显示深色侧边栏（"语音转文本"和"设置"）
- 右侧显示文件拖拽区域
- 没有白屏
- 控制台没有 CORS 错误

❌ **仍有问题的标志**:
- 白屏
- 控制台错误：`blocked by CORS policy`
- 控制台错误：`Not allowed to load local resource`
- 控制台错误：`Failed to load resource`

### 检查清单

如果仍然白屏，请按顺序检查：

#### 1. 确认代码是最新的
```bash
git pull
git log --oneline -3
```

应该看到最新的提交：
```
ba2653f Fix CORS issue in packaged app by disabling webSecurity
```

#### 2. 确认 main.ts 包含 webSecurity 配置
```bash
grep -A 5 "webPreferences" electron/main.ts
```

应该看到：
```typescript
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  preload: path.join(__dirname, 'preload.js'),
  // Disable web security in production to allow local file loading
  webSecurity: isDev ? true : false
}
```

#### 3. 清理并重新构建
```bash
# 删除所有构建产物
rm -rf dist
rm -rf release
rm -rf node_modules/.vite

# 重新构建
npm run compile
npm run build:mac  # 或你的平台
```

#### 4. 检查构建输出
```bash
npm run diagnose
```

应该显示：
- ✓ dist/ directory exists
- ✓ main.js
- ✓ preload.js
- ✓ renderer/
- ✓ renderer/index.html

#### 5. 检查 HTML 文件
```bash
cat dist/renderer/index.html
```

确保：
- 没有 `<base>` 标签
- 所有 `<script src="">` 使用相对路径（以 `./` 开头）
- 所有 `<link href="">` 使用相对路径

### 常见问题

**Q: 开发环境正常，打包后白屏**
A: 这正是 CORS 问题。确保已更新到最新代码并重新构建。

**Q: 打包后控制台显示 "webSecurity is disabled"**
A: 这是正常的，这是修复 CORS 问题的方法。

**Q: 担心安全问题**
A: 不用担心。webSecurity 仅在生产环境禁用，且应用只加载本地打包的文件，不访问外部资源。contextIsolation 等其他安全特性仍然启用。

**Q: 某个平台可以，另一个平台白屏**
A: 确保在该平台上重新构建。不要在 macOS 上构建 Windows 版本，反之亦然。

**Q: 构建时显示警告**
A: electron-builder 的一些警告是正常的，只要没有 ERROR 就可以。

### 提交 Issue

如果以上方法都无法解决，请提供：

1. 操作系统和版本
2. `npm run diagnose` 完整输出
3. 打包应用控制台的截图（开启 DevTools 后）
4. 是否在开发环境正常运行
5. `git log --oneline -3` 输出

## 性能测试

应用正常运行后，建议测试：

1. **拖拽文件**: 拖拽音频文件到界面
2. **文件选择**: 点击上传区域选择文件
3. **设置页面**: 切换到设置页面查看依赖状态
4. **界面响应**: 调整窗口大小，检查布局

注意：转换功能需要先安装 FFmpeg、Whisper 和模型文件。

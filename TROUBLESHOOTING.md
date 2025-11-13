# 故障排除指南

## 打包后应用白屏问题

### 问题描述
开发环境运行正常，但打包后的应用（Windows/macOS/Linux）出现白屏，控制台提示：
```
Not allowed to load local resource: file:///...
```

### 解决方案

此问题已在最新版本中修复，包含以下改进：

#### 1. 路径加载优化
- 使用 `pathToFileURL()` 正确处理跨平台文件路径
- 自动检测并使用 asar 解包后的文件路径

#### 2. Electron Builder 配置
- 配置 `asarUnpack` 将 renderer 文件解包
- 确保资源文件正确打包到 extraResources

#### 3. Vite 构建配置
- 设置 `base: './'` 使用相对路径
- 输出目录配置为 `dist/renderer`

### 如何验证修复

运行诊断脚本：
```bash
npm run diagnose
```

该脚本会检查：
- 构建输出目录结构
- HTML 中的资源路径（应该是相对路径）
- 资源文件是否存在
- package.json 配置

### 手动检查清单

如果问题仍然存在，请检查以下内容：

#### 1. 检查构建输出
```bash
npm run compile
npm run diagnose
```

确保输出显示：
- ✓ dist/main.js 存在
- ✓ dist/preload.js 存在
- ✓ dist/renderer/index.html 存在
- ✓ 所有脚本使用相对路径

#### 2. 检查打包应用结构

**macOS:**
```bash
# 查看应用包内容
cd "release/mac-arm64/Whisper Desktop.app/Contents"
ls -la Resources/
```

应该看到：
- `app.asar` - 主程序（已打包）
- `app.asar.unpacked/dist/renderer/` - 解包的前端文件
- `resources/` - 额外资源（ffmpeg, whisper, 模型）

**Windows:**
```bash
# 查看安装目录
cd "release/win-unpacked"
dir Resources
```

#### 3. 启用开发者工具调试

临时在生产版本中启用开发者工具，修改 `electron/main.ts`：
```typescript
if (isDev) {
  mainWindow.loadURL('http://localhost:5173')
  mainWindow.webContents.openDevTools()
} else {
  // ... 生产环境加载逻辑
  mainWindow.webContents.openDevTools() // 临时添加，用于调试
}
```

重新构建并检查控制台错误信息。

### 常见错误和解决方法

#### 错误 1: 找不到 index.html
**原因**: asar 打包路径问题
**解决**: 确保 `package.json` 中配置了 `asarUnpack`

#### 错误 2: 资源文件 404
**原因**: HTML 中使用绝对路径
**解决**: 确保 `vite.config.ts` 中 `base: './'`

#### 错误 3: Cannot find module
**原因**: 依赖没有正确打包
**解决**: 检查 `package.json` 的 `files` 配置

#### 错误 4: preload.js 加载失败
**原因**: preload 路径错误
**解决**: 确保使用 `path.join(__dirname, 'preload.js')`

### 完全重新构建

如果问题持续，尝试完全重新构建：

```bash
# 清理所有构建产物
rm -rf dist
rm -rf release
rm -rf node_modules

# 重新安装依赖
npm install

# 重新构建
npm run compile
npm run diagnose

# 重新打包
npm run build:mac  # 或 build:win / build:linux
```

### 获取帮助

如果以上方法都无法解决问题，请提供以下信息：

1. 操作系统和版本
2. `npm run diagnose` 的完整输出
3. 打包应用的控制台错误信息（开启开发者工具后）
4. `package.json` 的 build 配置部分
5. 打包应用的目录结构截图

## 其他常见问题

### FFmpeg/Whisper 找不到

**症状**: 转换时提示找不到 ffmpeg 或 whisper

**解决方案**:
1. 确认二进制文件在正确的目录
2. 检查文件权限（Unix 系统需要执行权限）
   ```bash
   chmod +x resources/bin/darwin/ffmpeg
   chmod +x resources/bin/darwin/whisper
   ```
3. 验证文件路径：
   ```bash
   npm run diagnose
   ```

### 模型加载失败

**症状**: 转换时报错 "无法加载模型"

**解决方案**:
1. 确认 `.bin` 模型文件在 `resources/models/` 目录
2. 验证模型文件完整性（下载时可能中断）
3. 使用较小的模型测试（如 ggml-tiny.bin）

### 内存不足

**症状**: 转换大文件时崩溃

**解决方案**:
1. 使用较小的模型（tiny 或 base）
2. 分段处理长音频
3. 调整 Whisper 线程数（修改 electron/main.ts 中的 `-t` 参数）

### 转换速度慢

**优化建议**:
1. 使用较小的模型（tiny/base）
2. 增加线程数（但不要超过 CPU 核心数）
3. 确保音频文件不在网络驱动器上

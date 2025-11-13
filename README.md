# Whisper Desktop - 语音转文本应用

基于 Electron + React + Whisper.cpp 的跨平台语音转文本桌面应用。

## 功能特性

- 🎤 **多格式支持**: 支持 MP3、M4A、WAV、FLAC、OGG 等音频格式
- 🎬 **视频处理**: 支持 MP4、AVI、MKV、MOV 等视频格式，自动提取音频
- 🖱️ **拖拽上传**: 直接拖拽文件到界面即可开始转换
- 💻 **跨平台**: 支持 Windows、macOS、Linux
- 🚀 **本地处理**: 所有处理都在本地完成，保护隐私
- 📝 **文本编辑**: 转录结果可编辑、复制和保存

## 界面布局

- 左侧：导航标签栏（语音转文本、设置）
- 右侧主界面：
  - 文件拖拽上传区域
  - 模型选择器
  - 文本输出区域
  - 转换控制按钮

## 安装依赖

```bash
npm install
```

## 准备运行环境

### 1. 下载 Whisper 模型

访问 [Hugging Face](https://huggingface.co/ggerganov/whisper.cpp) 下载模型文件。

推荐模型：
- `ggml-base.bin` - 平衡速度和准确度
- `ggml-small.bin` - 更高准确度
- `ggml-tiny.bin` - 最快速度

将下载的模型文件放入：
```
resources/models/
```

### 2. 准备 FFmpeg 和 Whisper.cpp 二进制文件

根据你的操作系统，将编译好的二进制文件放入对应目录：

**Windows:**
```
resources/bin/win32/
  - ffmpeg.exe
  - whisper.exe
```

**macOS:**
```
resources/bin/darwin/
  - ffmpeg
  - whisper
```

**Linux:**
```
resources/bin/linux/
  - ffmpeg
  - whisper
```

#### 获取二进制文件

**FFmpeg:**
- Windows/macOS/Linux: https://ffmpeg.org/download.html

**Whisper.cpp:**
- 从源码编译: https://github.com/ggerganov/whisper.cpp
- 或下载预编译版本

### 3. 创建目录结构

```bash
mkdir -p resources/bin/win32
mkdir -p resources/bin/darwin
mkdir -p resources/bin/linux
mkdir -p resources/models
```

## 开发运行

```bash
npm run dev
```

这将同时启动：
- Vite 开发服务器（React 前端）
- Electron 主进程

## 构建应用

### 构建所有平台
```bash
npm run build
```

### 构建特定平台
```bash
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

构建产物将输出到 `release/` 目录。

### 构建诊断

如果遇到构建或打包问题，运行诊断脚本：
```bash
npm run diagnose
```

该脚本会检查：
- 构建输出是否完整
- 资源文件是否存在
- 配置是否正确

**常见问题**: 如果打包后应用白屏，请查看 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) 获取详细的解决方案。

## 技术栈

- **Electron**: 跨平台桌面应用框架
- **React**: 用户界面框架
- **TypeScript**: 类型安全的 JavaScript
- **Vite**: 快速的前端构建工具
- **Whisper.cpp**: 高效的语音识别引擎
- **FFmpeg**: 音视频处理工具

## 项目结构

```
whisper-desktop/
├── electron/           # Electron 主进程代码
│   ├── main.ts        # 主进程入口
│   └── preload.ts     # 预加载脚本
├── src/               # React 前端代码
│   ├── components/    # React 组件
│   ├── types/         # TypeScript 类型定义
│   ├── App.tsx        # 根组件
│   └── main.tsx       # 前端入口
├── resources/         # 资源文件
│   ├── bin/          # 平台二进制文件
│   └── models/       # Whisper 模型文件
└── package.json      # 项目配置
```

## 使用说明

1. 启动应用
2. 拖拽音频或视频文件到上传区域，或点击选择文件
3. 选择 Whisper 模型（如果有多个）
4. 点击"开始转换"按钮
5. 等待转换完成，查看转录文本
6. 可以编辑、复制或保存转录结果

## 常见问题

完整的故障排除指南请查看 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

### 打包后应用白屏

**问题**: 开发环境正常，但打包后应用白屏。

**解决**: 此问题已修复。项目使用了以下优化：
- `pathToFileURL()` 处理跨平台路径
- `asarUnpack` 配置解包 renderer 文件
- 自动检测 asar 解包路径

如仍有问题，运行 `npm run diagnose` 检查配置。

### 提示缺少依赖

请检查以下内容：
1. FFmpeg 和 Whisper 二进制文件是否放在正确的平台目录下
2. 文件是否有执行权限（Linux/macOS 需要 `chmod +x`）
3. Whisper 模型文件是否存在于 `resources/models/` 目录

### 转换失败

1. 检查文件格式是否支持
2. 查看控制台错误信息
3. 确认模型文件完整且未损坏

## 开源协议

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

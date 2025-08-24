给你一份“非程序员友好”的整合参考文档，把我们这段时间的改造、调试、踩坑和解决方案完整梳理出来。你可以把它当“操作说明 + 排障手册 + 学习路线图”。你只要跟着步骤做即可。运行npx expo start -c

一、项目逻辑框架（用白话解释）
- 前端（移动端 App，基于 Expo/React Native）
  - 作用：
    - 向系统申请麦克风权限
    - 采集语音、连接后端、把后端返回的文字/语音显示/播放出来
    - 在进入后台、被电话/系统打断时，自动断开实时连接，避免麦克风占用和奇怪状态
  - 关键文件：
    - 前端全局配置和权限声明在 <mcfile name="app.json" path="/Users/kelly_zhu/Documents/GitHub/app/kotoba_expo/app.json"></mcfile>（其中 iOS 已声明麦克风用途说明和后台音频模式 UIBackgroundModes: audio）
    - 首页与文本合并逻辑在 <mcfile name="index.tsx" path="/Users/kelly_zhu/Documents/GitHub/app/kotoba_expo/app/(tabs)/index.tsx"></mcfile>（我们把“文本片段合并”的延迟调成了 1000ms，让字幕更连贯）
    - 实时连接与状态管理在 <mcfile name="useRealtime.ts" path="/Users/kelly_zhu/Documents/GitHub/app/kotoba_expo/hooks/useRealtime.ts"></mcfile>（我们加了 AppState 监听：后台、来电、系统打断都会自动断开连接，并给出清晰提示）
- 后端（本地代理服务）
  - 作用：作为“桥梁”，把前端送来的实时音频流，转发给 OpenAI Realtime API，再把 AI 的实时结果回传给前端
  - 关键文件：
    - 服务器启动与路由在 <mcfile name="index.ts" path="/Users/kelly_zhu/Documents/GitHub/app/kotoba_expo/agent-server/src/index.ts"></mcfile>（默认端口 8788，可通过环境变量 PORT 修改）
    - 颁发 Realtime 临时会话/指令集封装在 <mcfile name="ephemeral.ts" path="/Users/kelly_zhu/Documents/GitHub/app/kotoba_expo/agent-server/src/ephemeral.ts"></mcfile>（我们把“翻译指令”改成更严格的英文指令集，只做翻译，不回答问题、不解释、不输出同语种等，稳定性更好）

二、本次安装了什么（和你相关的）
- expo-dev-client（用于 iOS Dev Client 开发版 App，这样才能在模拟器/真机里运行包含原生模块的项目）
  - 已安装
  - 作用：解决“Expo iOS 预览报错：No development build … is installed”的问题
- iOS 端前置条件（这不是 npm 包，但要确保你的环境具备）
  - Xcode + iOS 模拟器
  - CocoaPods（安装后由 npx expo run:ios 自动调用）
- 项目里已经在用/配置的 Expo 插件和 RN 能力（了解就好）
  - expo-router（路由）
  - expo-audio（麦克风/音频）
  - @config-plugins/react-native-webrtc（为未来可能的 WebRTC 能力做准备）
  - iOS 权限与后台音频在 <mcfile name="app.json" path="/Users/kelly_zhu/Documents/GitHub/app/kotoba_expo/app.json"></mcfile> 的 ios.infoPlist 中已经声明

三、后端做了哪些操作（只需理解“有什么用”）
- 启动一个本地 HTTP 服务（默认端口 8788），供前端连接
- 通过 OpenAI SDK 创建“临时的 Realtime 会话”，并下发“严谨的翻译指令”
  - 指令核心点：只翻译，不解释、不闲聊、不重复原语、不输出与输入相同语言；保持自然对话风格，优先低延迟；遇到噪音/非指定语言就沉默
  - 指令封装在 <mcfile name="ephemeral.ts" path="/Users/kelly_zhu/Documents/GitHub/app/kotoba_expo/agent-server/src/ephemeral.ts"></mcfile>
- 桥接实时数据：前端发来的音频数据会被转发到 OpenAI Realtime，AI 的实时响应（文本/事件）再推回前端
- 环境变量：需要 OPENAI_API_KEY 放在 agent-server 的环境中（常见做法是 agent-server 目录下建 .env 文件，写入 OPENAI_API_KEY=你的密钥）

四、借助的第三方工具/库（功能级理解）
- 前端：Expo、React Native、expo-router、expo-audio、@config-plugins/react-native-webrtc
- 后端：openai / @openai/agents / @openai/agents-realtime、express、ws
- 系统/工具链：Xcode + iOS 模拟器 + CocoaPods、GitHub

五、常见问题与解决方案（踩坑总结）
1) iOS 预览报错：No development build (com.zvbo.kotoba.dev) is installed
- 原因：没有安装 Dev Client
- 解决：
  - 安装 expo-dev-client（已完成）
  - 第一次运行需要构建并安装 Dev Client：在项目目录下执行 npx expo run:ios（会自动编译并装到模拟器/真机）
  - 以后调试：先启动开发服务器，再用 Dev Client 打开
- Bundle Identifier 在 <mcfile name="app.json" path="/Users/kelly_zhu/Documents/GitHub/app/kotoba_expo/app.json"></mcfile> 里为 com.zvbo.kotoba.dev，和提示一致
2) Git 提交找不到带括号的路径（如 app/(tabs)/index.tsx）
- 原因：zsh 对括号做了通配，导致路径没匹配
- 解决：
  - 先 cd 到 app/kotoba_expo，再用相对路径提交；或给括号加引号/转义
  - 我们是通过进入子目录后用相对路径提交的，已经成功
3) 麦克风权限被拒后无法录音
- 表现：连接失败或实时没内容
- 解决：
  - iOS 已在 <mcfile name="app.json" path="/Users/kelly_zhu/Documents/GitHub/app/kotoba_expo/app.json"></mcfile> 里声明 NSMicrophoneUsageDescription 和后台音频
  - 前端会给出清晰的“去设置开启权限”的引导；你手动到系统设置开启即可
4) 进入后台/来电/系统打断后，实时连接卡住/占用麦克风
- 解决：我们在 <mcfile name="useRealtime.ts" path="/Users/kelly_zhu/Documents/GitHub/app/kotoba_expo/hooks/useRealtime.ts"></mcfile> 里增加了 AppState 监听，遇到这些场景会自动断开，回到前台时再手动重连
5) 文本字幕断断续续、不连贯
- 表现：AI 返回是“逐字/逐句”片段，直出太“跳”
- 解决：在 <mcfile name="index.tsx" path="/Users/kelly_zhu/Documents/GitHub/app/kotoba_expo/app/(tabs)/index.tsx"></mcfile> 中把“文本合并”的延迟从 600ms 调整为 1000ms，兼顾实时感与可读性
6) 移动设备无法访问后端
- 原因：真机默认不能访问电脑的 localhost
- 解决：
  - 用模拟器调试优先（可访问宿主机 localhost）
  - 真机则使用电脑的局域网 IP（同一 Wi‑Fi），或者使用 Expo 提供的隧道（Tunnel）模式
7) 首次 iOS 编译很慢
- 原因：Pods 依赖需要首次编译/缓存
- 解决：耐心等待；若失败，进入 ios 目录手动 pod install，然后重新 npx expo run:ios；确保 Xcode 命令行工具已安装

六、我们做过的改动（“项目整理过程”回顾）
- 后端（agent-server）
  - 把“翻译指令”改为稳定可靠的英文版，只做翻译、不回答或解释、语种判定严格、遇到噪音沉默，并强调低延迟与自然口吻（在 <mcfile name="ephemeral.ts" path="/Users/kelly_zhu/Documents/GitHub/app/kotoba_expo/agent-server/src/ephemeral.ts"></mcfile> 中）
  - 整体桥接与端口、状态接口在 <mcfile name="index.ts" path="/Users/kelly_zhu/Documents/GitHub/app/kotoba_expo/agent-server/src/index.ts"></mcfile>，默认端口 8788
- 前端（App）
  - 在 <mcfile name="useRealtime.ts" path="/Users/kelly_zhu/Documents/GitHub/app/kotoba_expo/hooks/useRealtime.ts"></mcfile> 中增强了错误提示与权限引导；在后台/来电/打断时自动断开连接，避免“黑洞”状态
  - 在 <mcfile name="index.tsx" path="/Users/kelly_zhu/Documents/GitHub/app/kotoba_expo/app/(tabs)/index.tsx"></mcfile> 中把文本片段合并延迟从 600ms 提升到 1000ms，让显示更自然
  - iOS 配置在 <mcfile name="app.json" path="/Users/kelly_zhu/Documents/GitHub/app/kotoba_expo/app.json"></mcfile> 增加了后台音频与麦克风权限文案
- 版本与交付：已 Git 提交并推送到 GitHub；Web 端预览用于校验提示与 UI 状态；iOS 预览采用 Dev Client 方案

七、如何一步步跑起来（小白友好版）
1) 准备环境（一次性）
- 安装 Xcode（含 iOS 模拟器）
- 安装 CocoaPods（终端执行：sudo gem install cocoapods）
- 准备 OpenAI Key（后端需要）
2) 启动后端（本地代理）
- 进入 agent-server 目录，准备环境变量（创建 .env，写入 OPENAI_API_KEY=你的密钥）
- 启动开发模式：
  - npm i（第一次需要）
  - npm run dev（默认端口 8788）
3) 安装 iOS Dev Client（第一次）
- 在项目根目录 app/kotoba_expo 下：
  - 已安装 expo-dev-client（如未安装可执行：npx expo install expo-dev-client）
  - 构建并安装到模拟器：npx expo run:ios（首次较慢，耐心等待）
4) 启动开发服务器并连接
- 在 app/kotoba_expo 下执行：npx expo start
- 选择 i 或在 Expo Dev Tools 中选择“Open in iOS”
- App 打开后，会自动连接后端，授予麦克风权限即可开始体验
- 注意：真机调试时，请确保后端地址是电脑的局域网 IP；模拟器可用 localhost
5) 验证关键体验
- 翻译只翻译、不闲聊：输入语音后看输出是否满足规则
- 后台/来电：切到后台或模拟打断，是否自动断开且有清晰提示
- 权限拒绝：拒后是否提示引导去系统设置
- 文本合并：字幕是否更顺滑（1 秒内合并）

八、遇到问题怎么自查（速查表）
- iOS 报“未安装 Dev Client” → 执行 npx expo run:ios（首次构建）
- 构建卡在 Pods 编译 → 正常现象，首次慢；失败则到 ios 目录 pod install 再来
- App 没声音/没内容 → 检查系统权限、后端是否在跑、网络是否通
- 真机连不上后端 → 用电脑局域网 IP；或用 Expo Tunnel
- 文本显示跳跃 → 已调 1000ms 合并延迟；仍不满意可后续做成可配置项
- 后端无法启动 → 检查 OPENAI_API_KEY 是否设置；端口是否被占用（8788）

九、iOS 预览方式说明（Dev Client）
- 我们采用的是 Dev Client 方案（而非经典 Expo Go）
  - 这样可以使用原生模块（例如音频/编解码等），更贴近真实 App 行为，避免受限
- 使用方式
  - 首次：npx expo run:ios（安装 Dev Client）
  - 日常：npx expo start，然后用 Dev Client 打开（i 或者 Dev Tools 上点 iOS）
  - 真机：先用 Xcode 或 run:ios 装到真机，再通过 Expo 开发服务器连接

## 修复记录与验证（最近一次）
- 后端修复：将 OpenAI Realtime 的 voice 参数从 'Alloy' 改为小写 'alloy'，修复接口报错导致颁发临时会话失败的问题。相关代码：<mcfile name="ephemeral.ts" path="/Users/kelly_zhu/Documents/GitHub/app/kotoba_expo/agent-server/src/ephemeral.ts"></mcfile>
- 前端环境变量：将 <mcfile name=".env" path="/Users/kelly_zhu/Documents/GitHub/app/kotoba_expo/.env"></mcfile> 中的 EXPO_PUBLIC_AGENT_SERVER_URL 更新为“电脑的局域网 IP”，格式示例：http://192.168.1.48:8788。前端会用它请求 <mcfile name="useRealtime.ts" path="/Users/kelly_zhu/Documents/GitHub/app/kotoba_expo/hooks/useRealtime.ts"></mcfile> 里构造的 /api/ephemeral 接口。
- 重启与验证：
  1) 确保后端已在运行（在 <mcfile name="index.ts" path="/Users/kelly_zhu/Documents/GitHub/app/kotoba_expo/agent-server/src/index.ts"></mcfile> 定义的端口默认为 8788）；
  2) 用手机浏览器（同一 Wi‑Fi）访问 http://<你的电脑IP>:8788/health，应返回 { "status": "ok" }；
  3) 访问 http://<你的电脑IP>:8788/api/realtime/status，可看到 voice: "alloy" 等状态；
  4) 完全重启前端：npx expo start -c（清缓存），再用 Dev Client 打开 App 测试连接。
- 温馨提示：电脑 IP 会变化（换网/重连 Wi‑Fi 时）。若 App 连接超时，先确认 IP 是否更新到了 .env 并重启了 Expo。

## 信息（当前本机快照，随网络变动）
- 电脑局域网 IP：192.168.1.48
- .env 中：EXPO_PUBLIC_AGENT_SERVER_URL=http://192.168.1.48:8788
- 如果你的实际 IP 不是上面的数值，请以“系统设置-网络”或在终端执行 ipconfig getifaddr en0（或 en1）查询为准，然后更新 .env 并执行 npx expo start -c 让前端读取新配置。
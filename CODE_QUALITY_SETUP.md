# Code Quality Tools Setup Guide

This document outlines the integration of ESLint, Prettier, and Jest into the project to improve code quality, consistency, and reliability.

## Summary of Changes

- **ESLint**: Integrated for static code analysis to find and fix problems in JavaScript/TypeScript code.
- **Prettier**: Integrated for automated code formatting to ensure a consistent code style.
- **Jest**: Integrated as a testing framework for writing and running unit and component tests.

---

## Major Refactoring Summary (Post-Setup)

Following the setup of these tools, a major refactoring effort was undertaken to address all reported linting issues.

### Final Results: Mission Accomplished

- **Initial State**: 142 problems (92 errors, 50 warnings)
- **Final State**: **0 problems**

All 142 issues have been successfully resolved. The codebase is now fully compliant with the established ESLint rules, achieving a high standard of quality and type safety.

### Key Achievements

- **Enhanced Type Safety**: Systematically eliminated `any` types from all files by introducing specific TypeScript interfaces.
- **Corrected Hook Dependencies**: Fixed all `exhaustive-deps` warnings for `useEffect` and `useCallback`.
- **Refactored Components & Styles**: Replaced all `react-native/no-inline-styles` with NativeWind `className` props and fixed `react/no-unstable-nested-components`.
- **Full Backend & Frontend Refactoring**: All files across the project, including the `agent-server` and all React components/hooks, have been refactored and cleaned.

---

## Recent UI/UX Improvements (Latest Updates)

### Language Display Optimization

**Issue**: The language content display was not working correctly, showing unwanted "（听）" text in toast messages.

**Solution Implemented**:
1. **Removed "（听）" from Toast Messages**: Updated `app/(tabs)/index.tsx` to remove the "（听）" identifier from language switching toast messages.
2. **Enhanced Language Selector UI**: Removed "listen" and "speak" text labels from the LanguageSelector component for cleaner UI.
3. **Introduced Language Bubbles**: Created a new `LanguageBubble` component to provide better visual feedback for language states.

**Files Modified**:
- `app/(tabs)/index.tsx`: Fixed toast message display
- `components/LanguageSelector.tsx`: Integrated language bubble functionality
- `components/LanguageBubble.tsx`: New component for enhanced language state visualization

**Features Added**:
- Animated language bubbles that appear when voice connection is active
- Clean visual indicators showing "正在监听" (listening) and "翻译目标" (translation target)
- Improved user experience with contextual language state feedback

**Result**: 
- Voice calling functionality works normally
- Language content display is now clean and intuitive
- Enhanced UI provides better user feedback without cluttering the interface

---

## How to Use

- **`npm run format`**: Automatically formats all code.
- **`npm run lint`**: Analyzes code for potential errors and style issues. Should now report **0 problems**.
- **`npm run test`**: Executes all tests.

---

## Next Steps

With a clean and stable codebase, the recommended next steps are:

1.  **Write More Tests**: Now is the perfect time to add unit and component tests to lock in the application's behavior and prevent future regressions.
2.  **CI/CD Integration**: Automate `lint` and `test` checks in a CI pipeline to maintain code quality automatically.
3.  **Fix `Reanimated` Warning**: Address the final remaining warning from the build tool by updating the Babel plugin as suggested in the logs.

---

## 变更执行记录（2025-09-05 续）

### 情况复盘：Web 端访问 http://localhost:8082/ 仍出现“5 条日志”
- 用户在完成我们提供的修复后，使用统一指令启动并打开 http://localhost:8082/，终端侧仍显示“5 条日志”（为 Reanimated 插件迁移相关提示的重复计数），该问题尚未完全消除。
- 辅助信息：用户曾提供一张 8081 端口页面的截图显示“服务不可用”。我们统一运行口径为 8082 端口，8081 可能是历史进程或浏览器缓存的旧实例页面，请以 8082 为准。

### 本次我们已执行的排障动作
1) 停止可能残留的 Expo Web 进程，以释放端口与缓存占用。
2) 全量清缓存与依赖（不删除源码）：
   - 删除依赖与 Expo 缓存目录：
     - rm -rf node_modules package-lock.json .expo
   - 清理 Metro/haste 缓存：
     - rm -rf $TMPDIR/metro-* ；rm -rf $TMPDIR/haste-map-*（若不存在会提示，无妨）
     - 未安装 watchman，故略过 watchman watch-del-all
3) 解决 npm 依赖冲突并重装：
   - 冲突现象：react 19.0.0 与 react-test-renderer 解析到 19.1.1 的 peer 版本不一致导致 ERESOLVE。
   - 处理：在 <mcfile name="package.json" path="/Users/kelly_zhu/Documents/GitHub/app/kotoTHAI/kotoba_trae/package.json"></mcfile> 中将 devDependencies 的 react-test-renderer 固定为 19.0.0。
   - 之后执行 npm install 安装成功（0 vulnerabilities）。
4) 再次核对关键配置：
   - Babel：<mcfile name="babel.config.js" path="/Users/kelly_zhu/Documents/GitHub/app/kotoTHAI/kotoba_trae/babel.config.js"></mcfile>
     - 使用 'babel-preset-expo'，并显式 { reanimated: false }，禁止旧的 'react-native-reanimated/plugin' 自动注入。
     - 仅启用 'react-native-worklets/plugin'（置于 plugins 数组最后）。
   - 入口与布局：<mcfile name="app/_layout.tsx" path="/Users/kelly_zhu/Documents/GitHub/app/kotoTHAI/kotoba_trae/app/_layout.tsx"></mcfile>
     - 已在入口顶部添加副作用导入：import 'react-native-reanimated';
     - Web 根容器补齐 style={{ flex: 1 }}，避免首页空白。
5) 提供统一启动指令并引导：
   - 启动（唯一指令）：npx expo start --web --port 8082 -c
   - 浏览器侧：仅访问 http://localhost:8082/，强制刷新（Cmd+Shift+R），必要时在 Application → Clear Storage 清站点数据后再试。

### 当前结果
- 据用户反馈：即便按统一指令在 8082 启动并打开页面，终端仍会出现“5 条日志”的 Reanimated 插件迁移类提示，尚未完全消除。
- 浏览器端未见红色致命错误，功能不受阻或受影响待进一步确认。

### 初步判断
- 根因多与“旧插件残留注入/缓存未被完全采纳”相关：
  - 'babel-preset-expo' 的旧插件自动注入已显式关闭（reanimated: false）。
  - 生态中部分工具（如 react-native-css-interop 的旧版本）内部仍引用过时的 'react-native-reanimated/plugin'。虽本项目未显式启用其 Babel 预设，但如被其他链路拉起仍可能触发迁移提示。需要进一步确认实际注入来源。

### 下一步建议（按优先级）
1) 再次以唯一指令启动并核验，确保只连到 8082：
   - npx expo start --web --port 8082 -c
   - 浏览器仅访问 http://localhost:8082/；DevTools 打开后勾选 Network → Disable cache，强制刷新。
2) 采集诊断信息（用于进一步定位注入来源）：
   - 终端启动日志“自第一行起的前 120 行”完整粘贴。
   - 浏览器 Console 中任何与 Reanimated/Babel 相关的黄色或红色日志截图。
3) 若日志仍提示旧插件：
   - 升级依赖链中可能引用旧插件的包（例如 react-native-css-interop / nativewind），或在 Babel 中显式排除其旧插件注入（需依据实际注入位置评估）。
   - 确保 'react-native-worklets/plugin' 仅出现一次且在 plugins 末尾，避免重复注入或顺序不当。
4) 若需要，我方可代为执行“全量清缓存 + 启动 + 现场核验”，并记录终端与浏览器日志，进一步定位。

### 结论
- 截止本记录：Web 端“5 条日志”（Reanimated 插件迁移提示）仍能复现，属于持续跟进问题；关键修复（Babel 插件迁移、根容器布局修复、依赖对齐与完整清缓存重装）均已落实。等待下一轮日志采集以做更精确的根因归位与修复。

---

## 浏览器 Console 问题修复记录（2025-09-05 新增）

本节针对浏览器控制台中两类高频问题给出根因与修复：

### 1) Realtime 连接报错：InvalidStateError: Failed to execute 'addTrack' on 'RTCPeerConnection': signalingState is 'closed'.

- 现象：在快速开关“实时模式”或语言切换触发重连时，偶发/频发上述错误，控制台连续出现 “Realtime connection failed … addTrack … signalingState is 'closed'”。
- 根因：旧的连接流程尚未完全清理完毕或仍在 await 网络/设备调用（getUserMedia、SDP 交换）中，新的连接已开始，导致对已关闭/无效的 RTCPeerConnection 调用 addTrack。
- 修复策略（已实施）：
  - 在 <mcfile name="hooks/useRealtime.ts" path="/Users/kelly_zhu/Documents/GitHub/app/kotoTHAI/kotoba_trae/hooks/useRealtime.ts"></mcfile> 中引入“连接序列令牌”与状态守卫：
    - 新增 connectSeqRef 作为连接代次计数器；cleanup() 会递增该计数，使所有进行中的 connect() 立即失效。
    - connect() 在关键 await 前后与 addTrack 前进行序列一致性与 signalingState 检查；任一不满足即提前安全退出并跳过 addTrack。
  - 额外处理：在获取到麦克风但连接已被取消时，主动停止已获取的轨道，避免资源泄露。
- 预期效果：
  - 快速切换或重连时不再出现 addTrack on closed 的异常。
  - DataChannel 日志仍会提示 open/close 的状态切换，但不会导致 Realtime 失败。
- 验收步骤：
  1. 启动：npx expo start --web --port 8082 -c。
  2. 打开 http://localhost:8082/，Console 设置为 Verbose、保留日志，过滤关键词 addTrack|signalingState|Realtime。
  3. 快速反复点击“开启/关闭实时模式”，并进行语言交换后触发 reconnect()。
  4. 观察：不应再出现 InvalidStateError(addTrack)；若出现偶发警告，应为被取消的连接提前返回的提示，不影响后续稳定连接。

### 2) 自定义元素重复定义（'mce-autosize-textarea' is already defined）

- 现象：Console 黄色警告显示某自定义元素重复注册。
- 可能来源：来自第三方 Web 组件库或编辑器包的副作用式 defineCustomElement 调用在 HMR/刷新时多次执行。
- 处理建议：
  - 在任何调用 customElements.define(name, ctor) 之前增加守卫：if (!customElements.get(name)) customElements.define(name, ctor)。
  - 如来源于第三方包且无法改动源码，可在应用入口对该包的注册进行一次性防抖包装（需定位具体来源后实施）。
  - 当前项目代码搜索未发现本仓库手动注册该元素；若后续定位到具体文件，再补充修复记录。

---

## 新增：前端“首条事件抑制 / 会话启动静默”策略（2025-09-05 新增）

- 背景与目标：
  - 之前在会话建立后，模型可能会主动发送寒暄或早于用户说话/输入就输出译文，干扰真实对话流程与 UI 节奏。
  - 目标是在“检测到用户的首个事件（音频或文本）”之前，前端不展示任何模型译文或消息，实现会话启动静默，避免无关寒暄。

- 实施改动（前端）：
  - 变更位置：<mcfile name="index.tsx" path="/Users/kelly_zhu/Documents/GitHub/app/kotoTHAI/kotoba_trae/app/(tabs)/index.tsx"></mcfile>
  - 核心逻辑（非技术表述）：
    - 引入一个“是否已看到用户输入”的内存标记（例如 userInputSeenRef）。
    - 当检测到用户第一条音频/文本输入时，将该标记设为“已看到”。
    - 只有在该标记变为“已看到”之后，才允许处理并展示模型输出；在此之前接收到的模型消息会被忽略或延迟处理。
    - 在连接关闭、切换语言或组件卸载等场景，重置该标记为“未看到”，以确保下一次会话同样从静默开始。
  - 影响范围：
    - 首次进入实时对话或重连后，UI 会保持安静直到用户说话或输入文字；随后译文/消息才会按常规展示。
    - 不影响后端业务逻辑与接口协议，属于前端展示行为的防抖与守卫。

- 当前验证状态：
  - 本轮改动尚未收到用户侧的实测反馈（用户未进行本轮测试）。因此，稳定性与体验需在下一轮回归中确认。

- 建议的回归步骤：
  1) 启动后端（见下节）并确保前端正确指向后端；
  2) 启动前端 Web，进入首页并开启“实时模式”；
  3) 在你“未说话/未输入”时，确认界面不出现模型文本；
  4) 说一句话或输入文本，确认随后才开始出现译文/消息；
  5) 快速切换语言或关闭/重开“实时模式”，确认每次会话启动仍遵循静默与“首条事件抑制”。

---

## 新增：后端 Agent Server 启停与端口冲突处置（2025-09-05 新增）

- 启动命令与环境：
  - 工作目录：/agent-server
  - 包管理器：pnpm（版本查询显示为 10.11.0）。
  - 开发启动命令：在 <mcfile name="package.json" path="/Users/kelly_zhu/Documents/GitHub/app/kotoTHAI/kotoba_trae/agent-server/package.json"></mcfile> 的 scripts 中，`dev` 使用 `tsx src/index.ts`。

- 操作与现象：
  - 首次启动失败：端口 8788 被占用（EADDRINUSE）。
  - 处置动作：查询占用并结束该进程（示例：lsof -i4TCP:8788 → kill 对应 PID）。
  - 复启后状态：
    - 服务器成功启动，监听 8788；
    - 日志提示 Node.js 版本不匹配为“警告级别”，不阻断运行；
    - 路由包含 /api/ephemeral 等（见 <mcfile name="index.ts" path="/Users/kelly_zhu/Documents/GitHub/app/kotoTHAI/kotoba_trae/agent-server/src/index.ts"></mcfile>）。

- 当前验证状态：
  - 后端可正常监听 8788 并对外提供服务；
  - 尚未有用户侧针对本轮功能的端到端验证反馈（待下一步联调）。

---

## 新增：前端 Web 启动记录与端口占用（2025-09-05 新增）

- 操作与现象：
  - 尝试通过命令启动前端开发服务（含隧道模式），默认占用 8081；
  - 初次启动时 8081 被其他进程占用（例如 PID 59674 的 node 进程），已释放后重启；
  - 开发服务日志显示 Metro/打包器已启动，但曾出现一次浏览器预览链接访问失败（连接被拒绝）。

- 当前建议：
  - 为避免端口冲突与历史状态干扰，统一使用：`npx expo start --web --port 8082 -c`；
  - 浏览器仅访问 http://localhost:8082/，打开 DevTools 后禁用缓存并强制刷新；
  - 如仍遇到访问失败，请采集终端前 120 行日志与浏览器 Console 报错用于定位。

- 用户侧测试状态：
  - 本轮改动用户尚未进行新一轮 Web 端实测，因此无可复述的用户体验结论。

---

## 配置核对与环境变量（2025-09-05 新增）

- 前端如何知道后端地址：
  - 使用环境变量 EXPO_PUBLIC_AGENT_SERVER_URL（见 <mcfile name=".env" path="/Users/kelly_zhu/Documents/GitHub/app/kotoTHAI/kotoba_trae/.env"></mcfile>）。
  - 读取位置示例：
    - <mcfile name="api.ts" path="/Users/kelly_zhu/Documents/GitHub/app/kotoTHAI/kotoba_trae/utils/api.ts"></mcfile>
    - <mcfile name="useRealtime.ts" path="/Users/kelly_zhu/Documents/GitHub/app/kotoTHAI/kotoba_trae/hooks/useRealtime.ts"></mcfile>
  - 建议值（本地联调）：指向后端开发服务，例如 `http://localhost:8788`。

- 验证要点：
  - 修改 .env 后需重启前端服务；
  - 在浏览器 Network 面板中确认 /api/ephemeral 等请求确实发往 8788 端口。

---

## 用户测试结果与当前结论（2025-09-05 新增）

- 用户测试现状：
  - 截止本节撰写时，用户未针对“首条事件抑制/会话启动静默”新策略与本轮启停/端口处置进行实测；因此暂无用户侧体验与稳定性结论可记录。

- 我方当前结论（客观状态）：
  - 代码层面：前端已加入“首条事件抑制”守卫（仅在看到用户首个输入后才展示模型输出），后端已恢复监听 8788；
  - 环境层面：端口占用问题已通过结束占用进程方式处理；前端建议统一使用 8082 以降低冲突概率；
  - 下一步需要用户或我们代测以确认端到端体验符合预期。

- 建议的最小化验证清单：
  1) 后端：在 /agent-server 执行 `pnpm dev`，观察监听 8788 成功；
  2) 前端：在项目根目录执行 `npx expo start --web --port 8082 -c` 并打开 http://localhost:8082/；
  3) 确认 .env 中 EXPO_PUBLIC_AGENT_SERVER_URL 指向 http://localhost:8788；
  4) 未说话时 UI 不显示模型消息；首条语音/文本输入后开始显示译文；
  5) 快速切换语言和开/关实时模式，观察连接稳定且无“addTrack on closed”错误；
  6) 若出现异常，采集：终端前 120 行日志 + 浏览器 Console 截图（含关键字 reanimated|babel|addTrack）。

---

## 可选后续项（建议）

- “显示模式”偏好（设置项）：
  - 方案 A：默认使用 translation_only，进一步减少噪声气泡；
  - 方案 B：在设置页增加“显示模式”切换（full / translation_only / voice_only），与全局上下文联动并持久化；
  - 说明：当前根据既往修复，默认模式已从 voice_only 调整为 full（见前文记录），如需变更请在验证后选择其一方案。

---

## 语音识别与文字输出问题复盘与落地（2025-09-06 新增）

本节面向“非代码背景”的项目使用者，按“问题 → 根因 → 解决方案 → 如何复测”的结构给出可操作说明。

### 一、问题描述（用户可感知）
- 语音识别（你说）偶发丢字/延迟，或断句不稳定。
- 文字输出（AI 说）在浏览器端出现卡顿、拼接错乱，或者早于用户说话就出现无关文本。
- 首页字幕有“等待输入… / 等待翻译…”占位，造成误导与多余 UI。

### 二、根因分析（非技术表述）
- 实时会话未强制启用稳定的“语音转写”模型，导致不同环境下质量不一致。
- 前端对“部分增量文本（流式输出）”的处理不够严谨，容易出现粘贴/丢失。
- 会话刚建立时，模型可能会自行“寒暄输出”，在用户未说话时就显示文本，影响体验。
- 占位字幕固定显示，造成界面噪声。

### 三、解决方案（已实施的改动）
1) 语音识别稳定化
   - 统一将实时会话的语音转写模型设为 whisper-1（并保留环境变量覆盖能力）。
   - 变更位置举例：
     - <mcfile name="useRealtime.ts" path="/Users/kelly_zhu/Documents/GitHub/app/kotoTHAI/kotoba_trae/hooks/useRealtime.ts"></mcfile>
     - <mcfile name="ephemeral.ts" path="/Users/kelly_zhu/Documents/GitHub/app/kotoTHAI/kotoba_trae/agent-server/src/ephemeral.ts"></mcfile>
     - <mcfile name="api.ts" path="/Users/kelly_zhu/Documents/GitHub/app/kotoTHAI/kotoba_trae/utils/api.ts"></mcfile>
   - 回退机制：若实时通道异常，自动回退到 HTTP Whisper 转写。

2) 文字输出聚合与对齐
   - 订阅并聚合 response.output_text.delta / .done 等事件，将增量文本安全拼接为完整句。
   - 同时订阅 conversation.item.audio_transcription.completed 事件，用于“你说”的完整文本缓冲。
   - 变更位置：<mcfile name="index.tsx" path="/Users/kelly_zhu/Documents/GitHub/app/kotoTHAI/kotoba_trae/app/(tabs)/index.tsx"></mcfile>

3) 首条事件抑制（会话启动静默）
   - 在检测到“用户第一条输入（音频或文字）”前，不展示任何模型输出，避免无关寒暄。
   - 切换语言、断开/重连时重置该标记，保证一致体验。

4) UI 精简：移除“等待输入/等待翻译”占位
   - 删除固定占位的字幕 UI，仅在确有内容时渲染；无内容时整个字幕区域隐藏。
   - 修改位置：<mcfile name="index.tsx" path="/Users/kelly_zhu/Documents/GitHub/app/kotoTHAI/kotoba_trae/app/(tabs)/index.tsx"></mcfile>

### 四、如何复测（一步步）
1) 启动后端：在 /agent-server 执行 `pnpm dev`，确认监听 8788。
2) 配置前端 .env：EXPO_PUBLIC_AGENT_SERVER_URL=http://localhost:8788，并重启前端。
3) 启动前端：项目根目录执行 `npx expo start --web --port 8082 -c`，打开 http://localhost:8082/。
4) 验证语音识别：开“语音翻译”，正常说话，观察“你说”文本连续、断句合理。
5) 验证文字输出：观察“AI 说”文本从流式增量到完整句，拼接正确、不卡顿。
6) 验证静默：在未说话前，界面不应出现模型文本。
7) 验证 UI：页面不再出现“等待输入… / 等待翻译…”占位；无内容时字幕区域不显示。

### 五、可回滚/兜底
- 若新逻辑引发异常：
  - 临时关闭“首条事件抑制”与增量聚合（在 <mcfile name="index.tsx" path="/Users/kelly_zhu/Documents/GitHub/app/kotoTHAI/kotoba_trae/app/(tabs)/index.tsx"></mcfile> 中注释相应分支）。
  - 将转写模型通过环境变量恢复为原值（EXPO_PUBLIC_WHISPER_MODEL）。
- 问题定位所需材料：前端启动日志前 120 行、浏览器 Console 截图（过滤关键词：addTrack|transcription|output_text）。
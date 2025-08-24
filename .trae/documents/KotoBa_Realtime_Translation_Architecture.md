# KotoBa 实时翻译架构与关键文件说明

面向非技术同学的可读版本，帮助你快速理解：App 的语音同传是如何工作的、哪些文件会影响翻译效果、出现问题如何排查，以及要改哪里。

## 一、整体架构（两条路径）

KotoBa 支持两种实时语音通路：

- 路径 A：前端直连 OpenAI Realtime（当前 iOS App 默认方案，延迟更低）
  1) App 先向我们的 Agent Server 请求一次性“临时密钥”（ephemeral key）
  2) App 用临时密钥，直接通过 WebRTC 与 OpenAI Realtime 建立媒体会话
  3) 翻译规则（提示词）来自服务端的 /api/ephemeral 里面的 buildInstructions

- 路径 B：服务端桥接（备用/增强方案）
  1) App 先与 Agent Server 建立 WebRTC 或 WebSocket
  2) Agent Server 再代表 App 连接 OpenAI Realtime
  3) 翻译规则（提示词）来自 AgentBridge（仅在桥接模式生效）

配套架构图见同目录 SVG：KotoBa_Realtime_Architecture.svg

## 二、真正影响“翻译行为/功能”的关键文件

按“前端/后端”分组罗列，标注它们对翻译的影响点。

### 后端（agent-server）

- agent-server/src/ephemeral.ts
  - 作用：颁发 OpenAI Realtime 会话的临时密钥（/api/ephemeral）
  - 关键点：
    - buildInstructions(source, target)：构建“翻译提示词”，严格控制“只翻译、不闲聊、双向同传、输出格式、静音处理”等
    - sessions.create(...) 设置了使用的 Realtime 模型与语音音色（voice）
  - 结论：在“前端直连”模式下，这个文件对翻译行为的影响最大

- agent-server/src/realtime/agentBridge.ts（仅桥接模式生效）
  - 作用：当 App 走“服务端桥接”时，由它与 OpenAI Realtime 建立会话
  - 关键点：
    - 内部的提示词表与语言路由（当前默认已清空日语固定项，避免强制注入）
    - 也会调用 sessions.create(...) 决定模型、语音与规则

- agent-server/src/realtime/webrtc.ts（桥接相关）
  - 作用：服务器端的 WebRTC 管理，转发 Offer/Answer/ICE，维持对 App 的实时媒体通道

- agent-server/src/realtime/audio.ts（桥接相关）
  - 作用：音频处理（如封装/解封装、转发），保证桥接时的音频链路正常

- agent-server/src/tool-executor.ts（文本翻译工具链，非 Realtime 主路径）
  - 作用：为“文字翻译/转写”提供工具执行规则，与实时同传不同但会影响“非实时”翻译体验

- agent-server/src/index.ts（基础设施）
  - 作用：挂载路由与服务；不会直接改变翻译策略，但影响可达性（例如监听 0.0.0.0 便于局域网访问）

### 前端（React Native App）

- hooks/useRealtime.ts
  - 作用：
    - 从后端 /api/ephemeral 获取临时密钥
    - 创建 RTCPeerConnection，与 OpenAI Realtime（直连）或与 Agent Server（桥接）建立媒体会话
    - 传入 sourceLangCode / targetLangCode 给后端，影响 buildInstructions 的语言路由
  - 影响点：若这里发给后端的语言代码变化了，后端提示词也会随之变化

- context/AppContext.tsx
  - 作用：存储并提供 sourceLanguage / targetLanguage 给全局
  - 影响点：用户在 UI 中切换语言后，这里的值会改变 → useRealtime.ts 会把语言代码传给后端 → 影响提示词

- app/(tabs)/index.tsx
  - 作用：主页面业务编排，调用 useRealtime、语音录制/转写/显示等
  - 影响点：把当前选择的语言注入实时会话；控制“是否启用实时模式”等

- components/LanguageSelector.tsx、constants/languages.ts
  - 作用：语言选择组件与语言枚举表
  - 影响点：决定用户可选语言以及传递到后端的语言代码

- hooks/useTranslation.ts 与 utils/api.ts（文本翻译相关）
  - 作用：非实时的“文本翻译/转写”调用
  - 影响点：不影响 Realtime 会话，但影响纯文本翻译体验

## 三、数据流（直连模式，当前默认）

1) App 读取用户语言偏好（AppContext）
2) App 调用 /api/ephemeral，携带 sourceLanguage/targetLanguage
3) 服务器在 ephemeral.ts 中调用 buildInstructions 生成提示词，并创建 Realtime 会话，返回临时密钥
4) App 持临时密钥，通过 WebRTC 直接与 OpenAI Realtime 建立媒体会话（麦克风上行、TTS 下行）
5) Realtime 根据提示词进行“只翻译、不闲聊、双向同传”，把结果回传给 App 展示/播报

## 四、数据流（服务端桥接模式）

1) App 与 Agent Server 建立 WebRTC 或 WebSocket
2) Agent Server 由 agentBridge.ts 与 OpenAI Realtime 建立会话
3) 桥接层可注入/覆盖提示词与流控策略，并在必要时处理音频/工具调用
4) 服务器把翻译结果/音频返回给 App

## 五、如何调整翻译行为（改哪里）

- 直连模式（当前生效）：
  - 修改 agent-server/src/ephemeral.ts 中的 buildInstructions
  - 如需换模型/音色，调整 sessions.create(...) 的 model 与 voice
  - 修改后重启 agent-server 生效

- 桥接模式：
  - 修改 agent-server/src/realtime/agentBridge.ts 中的提示词与会话创建参数
  - 仅在 App 切换为“服务端桥接”时生效

- 前端语言选择：
  - 语言来自 AppContext / LanguageSelector，最终通过 useRealtime.ts 传给后端
  - 保证语言代码与后端 buildInstructions 的路由逻辑一致（如 zh/ja/en 等）

## 六、常见问题排查

- 连接失败（超时/ICE 失败）
  - iPhone 与服务器需在同一网络；服务器需监听 0.0.0.0，端口防火墙放行
  - 原生端需正确集成 react-native-webrtc（iOS 需通过 Dev Client 或独立打包）

- 有文字无声音/无文字有声音
  - 检查是否启用 TTS 输出；确认模型支持语音下行；确认麦克风权限

- 输出语言不对/出现闲聊
  - 检查前端传入的 source/target；检查 buildInstructions 是否被覆盖；确认当前是否桥接模式

## 七、变更范围与风险

- 改动 buildInstructions 会立刻影响翻译风格与行为（当前直连模式下）
- 切换模型可能影响延迟与稳定性
- 桥接模式可提供更强的控制力，但链路更长、需要额外维护

——
以上即可作为日常开发/运营调整的参考：改后端 buildInstructions（直连），或改 agentBridge（桥接）；前端只需正确选择语言并把代码传给后端即可。
# kotoTHAI 项目阶段盘点（截至当前）

本文档面向不写代码也能理解项目状态的读者，概述当前仓库的逻辑结构、已经完成的事项、待推进工作与潜在风险，并给出非编码的下一步建议。

—

一、项目逻辑全貌（建立心智模型）
- 整体由“本地后端 + 前端（Expo/React Native）”组成：
  - 后端 Agent Server（本地运行）
    - 作用：与 OpenAI Realtime 服务交互；向前端签发“临时会话密钥”。
    - 关键位置：
      - agent-server/src/index.ts（后端启动入口）
      - agent-server/src/ephemeral.ts（签发临时会话密钥的接口）
      - agent-server/src/realtime/*（Realtime 桥接、信令与音频处理）
      - agent-server/.env（环境变量，含 OPENAI_API_KEY；已在 .gitignore 忽略）
  - 前端（Expo/React Native）
    - 作用：向后端请求临时密钥，再直连 OpenAI Realtime 完成语音/文本会话。
    - 关键位置：
      - hooks/useRealtime.ts（拿临时密钥并发起实时连接）
      - app/(tabs)/index.tsx、app/(tabs)/settings.tsx（主要页面）
      - context/AppContext.tsx（全局状态与会话信息）
      - constants/purchases.ts（内购商品常量，待与实际 productId 对齐）
- 规划中的“内购（IAP）”闭环：
  前端发起购买 → iOS 完成交易 → 前端把交易凭据发给后端 → 后端向 Apple 校验并“发放分钟数”（入库/幂等）→ 前端在收到后端确认后再 finishTransaction。

—

二、目前进度与已解决问题
- OpenAI API Key 已写入 agent-server/.env，并通过重启后端验证可被正确加载。
- 端口冲突（EADDRINUSE）已处理：先停止旧进程，再启动新实例，验证 Agent Server 可在 8788 端口正常运行（日志显示信令与 Realtime 桥接就绪）。
- .env 已在 .gitignore 中忽略，降低密钥泄露风险。
- 前端已具备与后端交互的逻辑骨架：useRealtime 会请求 /api/ephemeral 获取临时密钥并建立连接。

—

三、亟待解决（短期需要推进）
1) 真机联通验证（无须写代码）
- 在前端设置 EXPO_PUBLIC_AGENT_SERVER_URL 为你电脑的局域网 IP:8788（而非 localhost）。
- 使用 EAS Development Build 在 iPhone 上运行；确保手机与电脑同一 Wi‑Fi，macOS 防火墙允许 8788 访问。

2) IAP 接入（第一阶段最小可用）
- 前端：接入购买流程（获取商品 → 发起购买 → 将交易凭据发给后端 → 后端确认成功后再 finish）。
- 后端：新增最小存储（用户、交易、授予分钟表），校验 Apple 返回的 JWS/收据；按 transactionId/JWS 做幂等，决定分钟数并落库。
- Settings 页把测试逻辑替换为真实内购流程，并与分钟配额展示打通。

3) App Store Connect 准备
- 补齐“协议、税务与银行”以使内购物品能“可销售”。
- 在 App 下创建 3 个“可消耗型”商品（建议 10/30/120 分钟），记录 productId。
- 创建沙箱测试员账号，并在 iPhone 上登录用于内购测试。

4) 基础可观测性
- 明确健康检查与速测方法（/api/status、/api/ephemeral），形成排障清单（网络、端口、防火墙、环境变量）。

—

四、中期规划（下一阶段）
- 升级到 App Store Server API 做交易拉取与验证，提升对账与反作弊能力。
- 接入 App Store Server Notifications V2，订阅退款、撤销等异步事件。
- 实现“Send Consumption Information”消费回传，降低恶意退款风险。

—

五、潜在风险与影响
- 安全与费用
  - 若 /ephemeral 无鉴权/限流，可能被批量滥用而消耗 OpenAI 额度。
  - 建议：增加最小鉴权（内部 token/CORS 白名单）、请求频控、审计日志。
- 审核与合规
  - 未完成“协议、税务与银行”将导致内购物品不可销售，影响审核与交付。
  - 麦克风/录音/第三方处理（OpenAI）需与隐私声明、权限描述一致，否则有被拒风险。
- 体验与稳定性
  - Realtime 依赖网络质量，需考虑断线重连、超时与重试策略。
- 数据一致性与风控
  - 若缺少幂等与“后端确认后再 finish”的约束，可能重复发放分钟数或被绕过。
- 真机联通易错点
  - 局域网 IP 配置错误、防火墙阻断、不同网段等，都会导致手机连不上本地后端。

—

六、建议推进顺序（行动清单）
A. 真机连通验证：配置 EXPO_PUBLIC_AGENT_SERVER_URL → 重启前端 → iPhone 上尝试连接。
B. App Store 准备：协议/税务/银行 → 创建 3 个消耗型商品 → 沙箱账号就绪。
C. IAP 第一阶段：前端接入购买流程；后端完成校验、发放与幂等；Settings 页对接。
D. 安全与可观测性：接口鉴权/限流、基础日志与排障清单。
E. 中期升级：App Store Server API + Server Notifications V2 + 消费信息回传。

—

七、关键文件速览（便于快速定位）
- 后端
  - agent-server/src/index.ts：后端启动入口
  - agent-server/src/ephemeral.ts：签发临时会话密钥接口
  - agent-server/src/realtime/：Realtime 信令与音频处理
  - agent-server/.env：环境变量（含 OPENAI_API_KEY，已忽略提交）
- 前端
  - hooks/useRealtime.ts：获取临时密钥并连接 Realtime
  - app/(tabs)/index.tsx、app/(tabs)/settings.tsx：主要页面
  - context/AppContext.tsx：应用全局状态与会话信息
  - constants/purchases.ts：内购商品常量（待与实际 productId 对齐）

—

八、下一步你可以做什么（零代码）
- 在浏览器访问 http://localhost:8788/api/status 做健康自检；
- 按需设置 EXPO_PUBLIC_AGENT_SERVER_URL（指向你的电脑局域网 IP:8788），重启前端；
- 在 App Store Connect 创建 3 个可消耗型商品并记录 productId；创建/登录沙箱测试员账号。
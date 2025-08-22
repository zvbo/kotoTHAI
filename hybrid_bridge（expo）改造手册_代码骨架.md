# kotoba（Expo/React Native）→ Hybrid‑Bridge 改造手册

> 目标：保留 Expo/React Native UI，用 **WebRTC 直连 OpenAI Realtime** 获得低时延语音；**工具/Guardrails/Handoffs** 放到 **Node + **`` 后端执行。下面给出分支计划、依赖、配置项与最小可跑代码骨架（前端 + 后端）。

---

## 0. 分支与目录规划

- 新建分支：`feat/realtime-hybrid-bridge`
- 新增目录：

```
/agent-server         # Node/TS 后端（openai-agents-js + Realtime 会话配置）
/app                  # 你的 Expo 应用（保持不变，新增 Realtime 模块）
  └─ src/
      ├─ realtime/
      │   ├─ webrtc.ts           # 与 OpenAI Realtime 的 WebRTC 握手/媒体流
      │   ├─ agentBridge.ts      # DataChannel 工具调用转发到后端
      │   └─ audio.ts            # 扬声器路由/打断/音频状态
      └─ screens/CallScreen.tsx  # 演示页（按下说话/可打断/回退链路）
```

---

## 1. 依赖安装（Expo 侧）

> **必须使用 Dev Client（EAS 或 **``** 生成），不能仅用 Expo Go**。

```bash
# Expo 侧（请在 /app 目录）
npx expo install react-native-webrtc @config-plugins/react-native-webrtc expo-av @react-native-community/netinfo
npm i react-native-incall-manager zod
# 如使用 TypeScript：建议安装 @types 相关包
```

- 在 `app.json` 或 `app.config.js` 中添加：

```js
// app.config.js
export default {
  expo: {
    name: "kotoba",
    slug: "kotoba",
    plugins: [
      ["@config-plugins/react-native-webrtc", { ios: { cameraPermission: false } }]
    ],
    ios: {
      infoPlist: {
        NSMicrophoneUsageDescription: "用于实时语音对话",
        UIBackgroundModes: ["audio"],
      }
    }
  }
}
```

> **版本对齐**：`expo` / `react-native-webrtc` / `@config-plugins/react-native-webrtc` 三者需按官方映射表对齐（见依赖对照表）。

- 生成原生工程并运行 Dev Client：

```bash
npx expo prebuild
npx expo run:ios # 或 EAS Build Dev Client
```

---

## 2. 依赖安装（后端 agent-server）

```bash
# 在仓库根目录
mkdir agent-server && cd agent-server
npm init -y
npm i express cors zod dotenv
npm i @openai/agents @openai/agents-realtime
npm i -D typescript ts-node @types/node @types/express
npx tsc --init
```

**目录结构**

```
/agent-server
  ├─ src
  │   ├─ index.ts           # 启动&路由注册
  │   ├─ ephemeral.ts       # 颁发临时 Realtime Key
  │   ├─ agent.ts           # 定义 openai-agents-js 代理与工具
  │   └─ tool-executor.ts   # 工具执行 HTTP 端点
  └─ .env                   # OPENAI_API_KEY=...
```

``（示例工具 + 代理）

```ts
import { z } from "zod";
import { tool, Agent } from "@openai/agents";

export const getWeather = tool({
  name: "get_weather",
  description: "Get weather by city",
  parameters: z.object({ city: z.string() }),
  async execute({ city }) {
    // TODO: 调用真实天气 API
    return `Weather in ${city}: sunny 30℃`;
  },
});

export const voiceAgent = new Agent({
  name: "KotoBa",
  instructions: "你是礼貌、简洁的中⇄日口译助手，仅按目标语输出。",
  tools: [getWeather],
});
```

``（颁发临时密钥）

```ts
import { Router } from "express";

export const ephemeralApp = Router();

ephemeralApp.post("/realtime/ephemeral", async (_req, res) => {
  const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-realtime-preview",
      voice: "verse",
      // 可在此注入 instructions / tools schema / 通用参数
    }),
  });
  const data = await r.json();
  return res.json({ apiKey: data.client_secret?.value, session: data });
});
```

``（转发工具调用）

```ts
import { Router } from "express";
import { voiceAgent } from "./agent";

export const toolApp = Router();

toolApp.post("/tool-call", async (req, res) => {
  const { name, args } = req.body;
  if (name === "get_weather") {
    const out = await voiceAgent.tools![0].execute(args);
    return res.json({ ok: true, result: out });
  }
  return res.status(404).json({ ok: false, error: "Unknown tool" });
});
```

``（汇总启动）

```ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import { ephemeralApp } from "./ephemeral";
import { toolApp } from "./tool-executor";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/api", ephemeralApp);
app.use("/api", toolApp);

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`agent backend on :${PORT}`));
```

---

## 3. 前端代码骨架（Expo）

``（与 OpenAI Realtime 建立 WebRTC）

```ts
import { mediaDevices, RTCPeerConnection } from "react-native-webrtc";

export type RealtimeConn = {
  pc: RTCPeerConnection;
  data?: RTCDataChannel;
  stop: () => void;
};

export async function connectRealtime(ephemeralKey: string): Promise<RealtimeConn> {
  const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

  // 播放远端音频
  pc.ontrack = (e) => {
    // react-native-webrtc 会自动把远端音轨输出到系统音频
    // 如需强制扬声器，可配合 InCallManager.setForceSpeakerphoneOn(true)
  };

  // 工具/事件的数据通道
  const data = pc.createDataChannel("oai-events");

  const stream = await mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((t: any) => pc.addTrack(t, stream));

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const baseUrl = "https://api.openai.com/v1/realtime");
  const model = "gpt-4o-realtime-preview";

  // 与 OpenAI Realtime 交换 SDP（WebRTC 握手）
  const sdpResp = await fetch(`${baseUrl}?model=${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ephemeralKey}`,
      "Content-Type": "application/sdp",
    },
    body: offer.sdp as any,
  });
  const answer = { type: "answer", sdp: await sdpResp.text() } as any;
  await pc.setRemoteDescription(answer);

  return {
    pc,
    data,
    stop: () => {
      pc.close();
      stream.getTracks().forEach((t: any) => t.stop());
    },
  };
}
```

``（工具调用转发）

```ts
export function attachToolBridge(data: RTCDataChannel, baseUrl: string) {
  data.onmessage = async (msg) => {
    const event = JSON.parse(msg.data);
    if (event.type === "tool_call") {
      const { name, arguments: args, id } = event;
      const r = await fetch(`${baseUrl}/api/tool-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, args }),
      });
      const { result } = await r.json();
      const payload = { type: "tool_result", id, output: result };
      data.send(JSON.stringify(payload));
    }
  };
}
```

``（打断/音频路由）

```ts
import InCallManager from "react-native-incall-manager";

export function startCallAudio() {
  InCallManager.start({ media: "audio" });
  InCallManager.setForceSpeakerphoneOn(true);
}

export function stopCallAudio() {
  InCallManager.stop();
}
```

``（演示 UI）

```tsx
import React, { useRef, useState } from "react";
import { View, Button, Text } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { connectRealtime } from "../src/realtime/webrtc";
import { attachToolBridge } from "../src/realtime/agentBridge";
import { startCallAudio, stopCallAudio } from "../src/realtime/audio";

export default function CallScreen() {
  const conn = useRef<any>(null);
  const [status, setStatus] = useState("idle");

  async function start() {
    setStatus("connecting");
    const ep = await fetch("https://YOUR_SERVER/api/realtime/ephemeral", { method: "POST"}).then(r => r.json());
    const { apiKey } = ep;

    startCallAudio();
    conn.current = await connectRealtime(apiKey);
    attachToolBridge(conn.current.data!, "https://YOUR_SERVER");
    setStatus("connected");
  }

  function stop() {
    conn.current?.stop?.();
    stopCallAudio();
    setStatus("stopped");
  }

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Status: {status}</Text>
      <Button title="Start" onPress={start} />
      <Button title="Stop" onPress={stop} />
    </View>
  );
}
```

---

## 4. 打包/运行

```bash
# 后端
cd agent-server && npx ts-node src/index.ts
# iOS Dev Client（一次）
cd ../app && npx expo prebuild && npx expo run:ios
# 开发调试
npx expo start --dev-client
```

---

## 5. 验收清单

- 能启动会话、说一句话→即刻听到模型播报（<\~1s 首音，网络良好时）。
- DataChannel 收到 `tool_call`，后端返回 `tool_result` 并继续说话。
- 打断：用户开口→播报立停→模型转向处理新输入。
- 若 WebRTC 失败，回退到 WS 录段上传（此骨架未示例，可按 PRD 附录 A 的回退策略实现）。

---

## 6. 接下来可增强

- 术语表与提示词热更新（在 `/realtime/sessions` 里下发 `instructions` 与 `tools` schema）。
- Guardrails（输出风格/敏感词）与 Handoffs（导航到“问路/餐馆/医院”子代理）。
- 计费/额度守护与埋点（首音、打断恢复、弱网切换率）。


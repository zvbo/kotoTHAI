import express from 'express';

// 简化版的 IAP 校验路由（Sandbox/占位实现）
// 注意：正式环境需对接 Apple verifyReceipt 接口并做好幂等（根据 transactionId 仅发放一次）

export const iapApp = express.Router();

// 选项与发放秒数映射（与前端常量保持一致）
const SECONDS_BY_OPTION: Record<'10m' | '30m' | '2h', number> = {
  '10m': 10 * 60,
  '30m': 30 * 60,
  '2h': 120 * 60,
};

// 反向：根据产品ID推断选项
const OPTION_BY_IAP_PRODUCT_ID: Record<string, '10m' | '30m' | '2h'> = {
  'kotothai.minutes.10': '10m',
  'kotothai.minutes.30': '30m',
  'kotothai.minutes.120': '2h',
};

// ===== 幂等处理：内存级已处理交易表（重启进程会丢失，生产应使用数据库）=====
const processedTransactions = new Set<string>();

// ===== Apple verifyReceipt 帮助函数 =====
const APPLE_VERIFY_URL_PROD = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_VERIFY_URL_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt';

type AppleInApp = {
  product_id: string;
  transaction_id: string;
  original_transaction_id?: string;
  purchase_date_ms?: string;
};

type AppleVerifyResponse = {
  status: number;
  receipt?: {
    bundle_id?: string;
    in_app?: AppleInApp[];
  };
  latest_receipt_info?: AppleInApp[]; // 订阅场景更常见，这里兜底遍历
  is_retryable?: boolean;
};

async function callAppleVerify(url: string, receipt: string) {
  const body: any = {
    'receipt-data': receipt,
    'exclude-old-transactions': true,
  };
  // 对于订阅需要 password，这里做可选注入；消耗型商品不需要
  const sharedSecret = process.env.APPLE_IAP_SHARED_SECRET;
  if (sharedSecret) body.password = sharedSecret;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await resp.json()) as AppleVerifyResponse;
  return data;
}

async function verifyAppleReceipt(productId: string, clientTxId: string | undefined, receipt: string) {
  // 先打到生产端点，若返回 21007 再回退沙箱
  let data = await callAppleVerify(APPLE_VERIFY_URL_PROD, receipt);
  if (data.status === 21007) {
    data = await callAppleVerify(APPLE_VERIFY_URL_SANDBOX, receipt);
  }

  if (data.status !== 0) {
    const msg = `apple verify failed: status=${data.status}`;
    return { ok: false, message: msg } as const;
  }

  // 优先 latest_receipt_info，其次 receipt.in_app
  const candidates: AppleInApp[] = [
    ...(data.latest_receipt_info || []),
    ...((data.receipt?.in_app || []) as AppleInApp[]),
  ];

  // 过滤同一商品
  const sameProduct = candidates.filter((i) => i.product_id === productId);
  if (sameProduct.length === 0) {
    return { ok: false as const, message: 'productId not found in receipt' };
  }

  // 若客户端提供 transactionId，则以其为准；否则选最新一条（按 purchase_date_ms 降序）
  let target: AppleInApp | undefined;
  if (clientTxId) {
    target = sameProduct.find((i) => i.transaction_id === clientTxId);
  }
  if (!target) {
    target = sameProduct
      .slice()
      .sort((a, b) => (Number(b.purchase_date_ms || '0') - Number(a.purchase_date_ms || '0')))[0];
  }
  if (!target) {
    return { ok: false as const, message: 'no valid transaction found' };
  }

  return { ok: true as const, transactionId: target.transaction_id };
}

/**
 * 校验收据并返回应发放的秒数
 * 输入：{ platform: 'ios' | 'android', productId: string, transactionId?: string, receipt?: string }
 * 输出：{ ok: boolean, grantSeconds?: number, message?: string }
 */
iapApp.post('/verify', async (req, res) => {
  try {
    const { platform, productId, transactionId, receipt } = (req.body || {}) as {
      platform?: 'ios' | 'android';
      productId?: string;
      transactionId?: string;
      receipt?: string;
    };

    if (!platform || !productId) {
      return res.status(400).json({ ok: false, message: 'missing platform or productId' });
    }

    const option = OPTION_BY_IAP_PRODUCT_ID[productId];
    if (!option) {
      return res.status(400).json({ ok: false, message: 'unknown productId' });
    }

    if (!receipt) {
      return res.status(400).json({ ok: false, message: 'missing receipt' });
    }

    if (platform === 'android') {
      // TODO: 接入 Google Play Developer API 校验
      return res.status(501).json({ ok: false, message: 'android not implemented yet' });
    }

    // iOS: 调用 Apple verifyReceipt
    const result = await verifyAppleReceipt(productId, transactionId, receipt);
    if (!result.ok) {
      return res.status(400).json({ ok: false, message: result.message || 'verify failed' });
    }

    const finalTxId = result.transactionId || transactionId;
    if (!finalTxId) {
      return res.status(400).json({ ok: false, message: 'missing transactionId after verification' });
    }

    // 幂等：若已处理则不重复发放
    if (processedTransactions.has(finalTxId)) {
      return res.json({ ok: true, grantSeconds: 0, option, transactionId: finalTxId, message: 'already processed' });
    }

    const grantSeconds = SECONDS_BY_OPTION[option];

    // 标记幂等与日志
    processedTransactions.add(finalTxId);
    console.log('[IAP] grant', { productId, option, grantSeconds, transactionId: finalTxId, at: new Date().toISOString() });

    // 在正式实现中：
    // 1) 使用数据库记录交易与授予日志
    // 2) 以 transactionId 做唯一约束，确保幂等

    return res.json({ ok: true, grantSeconds, option, transactionId: finalTxId });
  } catch (err: any) {
    console.error('[IAP.verify] error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});
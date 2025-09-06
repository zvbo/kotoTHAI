import { Router, Request, Response } from 'express';

// --- Type Definitions ---

interface IAPRequestBody {
  platform?: 'ios' | 'android';
  productId?: string;
  transactionId?: string;
  receipt?: string;
}

interface AppleVerifyRequestBody {
  'receipt-data': string;
  'exclude-old-transactions': boolean;
  password?: string;
}

interface AppleInApp {
  product_id: string;
  transaction_id: string;
  original_transaction_id?: string;
  purchase_date_ms?: string;
}

interface AppleVerifyResponse {
  status: number;
  receipt?: {
    bundle_id?: string;
    in_app?: AppleInApp[];
  };
  latest_receipt_info?: AppleInApp[];
  is_retryable?: boolean;
}

// Simplified IAP validation route (Sandbox/Placeholder)
// NOTE: Production environment requires connecting to Apple's verifyReceipt endpoint and ensuring idempotency.

export const iapApp = Router();

const SECONDS_BY_OPTION: Record<'10m' | '30m' | '2h', number> = {
  '10m': 10 * 60,
  '30m': 30 * 60,
  '2h': 120 * 60,
};

const OPTION_BY_IAP_PRODUCT_ID: Record<string, '10m' | '30m' | '2h'> = {
  'kotothai.minutes.10': '10m',
  'kotothai.minutes.30': '30m',
  'kotothai.minutes.120': '2h',
};

const processedTransactions = new Set<string>();

const APPLE_VERIFY_URL_PROD = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_VERIFY_URL_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt';

async function callAppleVerify(url: string, receipt: string): Promise<AppleVerifyResponse> {
  const body: AppleVerifyRequestBody = {
    'receipt-data': receipt,
    'exclude-old-transactions': true,
  };
  const sharedSecret = process.env.APPLE_IAP_SHARED_SECRET;
  if (sharedSecret) {
    body.password = sharedSecret;
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await resp.json()) as AppleVerifyResponse;
}

async function verifyAppleReceipt(productId: string, clientTxId: string | undefined, receipt: string) {
  let data = await callAppleVerify(APPLE_VERIFY_URL_PROD, receipt);
  if (data.status === 21007) {
    data = await callAppleVerify(APPLE_VERIFY_URL_SANDBOX, receipt);
  }

  if (data.status !== 0) {
    return { ok: false, message: `apple verify failed: status=${data.status}` } as const;
  }

  const candidates: AppleInApp[] = [
    ...(data.latest_receipt_info || []),
    ...(data.receipt?.in_app || []),
  ];

  const sameProduct = candidates.filter((i) => i.product_id === productId);
  if (sameProduct.length === 0) {
    return { ok: false, message: 'productId not found in receipt' } as const;
  }

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
    return { ok: false, message: 'no valid transaction found' } as const;
  }

  return { ok: true, transactionId: target.transaction_id } as const;
}

iapApp.post('/verify', async (req: Request, res: Response) => {
  try {
    console.log('=== /iap/verify Request Details ===');
    console.log('req.body content:', JSON.stringify(req.body, null, 2));
    console.log('===============================');

    const { platform, productId, transactionId, receipt } = req.body as IAPRequestBody;

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
      return res.status(501).json({ ok: false, message: 'android not implemented yet' });
    }

    const result = await verifyAppleReceipt(productId, transactionId, receipt);
    if (!result.ok) {
      return res.status(400).json({ ok: false, message: result.message || 'verify failed' });
    }

    const finalTxId = result.transactionId || transactionId;
    if (!finalTxId) {
      return res.status(400).json({ ok: false, message: 'missing transactionId after verification' });
    }

    if (processedTransactions.has(finalTxId)) {
      return res.json({ ok: true, grantSeconds: 0, option, transactionId: finalTxId, message: 'already processed' });
    }

    const grantSeconds = SECONDS_BY_OPTION[option];
    processedTransactions.add(finalTxId);
    console.log('[IAP] grant', { productId, option, grantSeconds, transactionId: finalTxId, at: new Date().toISOString() });

    return res.json({ ok: true, grantSeconds, option, transactionId: finalTxId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'internal error';
    console.error('[IAP.verify] error:', err);
    return res.status(500).json({ ok: false, message });
  }
});

export type PurchaseOptionItem = {
  id: '10m' | '30m' | '2h';
  title: string; // 展示在卡片上的主标题
  priceDisplay: string; // 用于 UI 展示，例如 "$1.99"
  featured?: boolean; // 是否高亮推荐
};

export const PURCHASE_OPTIONS: PurchaseOptionItem[] = [
  { id: '10m', title: '10 分钟', priceDisplay: '$1.99' },
  { id: '30m', title: '30 分钟', priceDisplay: '$3.99', featured: true },
  { id: '2h', title: '2 小时', priceDisplay: '$12.99' },
];

// IAP 产品ID映射（与 App Store Connect 一致）
// 注意：若后续产品ID调整，请同时更新后端校验逻辑
export const IAP_PRODUCT_ID_BY_OPTION: Record<PurchaseOptionItem['id'], string> = {
  '10m': 'kotothai.minutes.10',
  '30m': 'kotothai.minutes.30',
  '2h': 'kotothai.minutes.120',
};

// 反向映射：根据产品ID找到业务选项ID
export const OPTION_BY_IAP_PRODUCT_ID: Record<string, PurchaseOptionItem['id']> = Object.fromEntries(
  Object.entries(IAP_PRODUCT_ID_BY_OPTION).map(([k, v]) => [v, k as PurchaseOptionItem['id']])
) as Record<string, PurchaseOptionItem['id']>;

// 选项对应发放的秒数
export const SECONDS_BY_OPTION: Record<PurchaseOptionItem['id'], number> = {
  '10m': 10 * 60,
  '30m': 30 * 60,
  '2h': 120 * 60,
};

// 需要传给 react-native-iap 的产品ID数组
export const IAP_PRODUCT_IDS: string[] = Object.values(IAP_PRODUCT_ID_BY_OPTION);
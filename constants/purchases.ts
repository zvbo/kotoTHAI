export type PurchaseOptionItem = {
  id: '10m' | '30m' | '2h';
  title: string; // 展示在卡片上的主标题
  durationLabel: string; // 辅助标注（与 title 一致，便于 onPress 中提示）
  priceDisplay: string; // 用于 UI 展示，例如 "¥20"
  featured?: boolean; // 是否高亮推荐
};

export const PURCHASE_OPTIONS: PurchaseOptionItem[] = [
  { id: '10m', title: '10 分钟', durationLabel: '10 分钟', priceDisplay: '¥20' },
  { id: '30m', title: '30 分钟', durationLabel: '30 分钟', priceDisplay: '¥40', featured: true },
  { id: '2h', title: '2 小时', durationLabel: '2 小时', priceDisplay: '¥120' },
];
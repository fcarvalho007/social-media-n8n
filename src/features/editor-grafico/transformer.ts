export function medidasTransformer(toque: boolean) {
  return toque
    ? { anchorSize: 28, anchorCornerRadius: 14, borderStrokeWidth: 2 }
    : { anchorSize: 12, anchorCornerRadius: 2, borderStrokeWidth: 2 };
}
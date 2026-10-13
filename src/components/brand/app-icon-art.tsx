/**
 * App icon drawn with plain shapes (no fonts needed) for `next/og` ImageResponse:
 * two overlapping discs, ink blue for Russian and terracotta for Italian, on paper.
 * Full-bleed square: iOS and Android apply their own corner mask.
 */
export function AppIconArt({ size }: { size: number }) {
  const disc = size * 0.42;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f1e8",
      }}
    >
      <div style={{ display: "flex", position: "relative", width: disc * 1.6, height: disc }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            width: disc,
            height: disc,
            borderRadius: "50%",
            background: "#33478c",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 0,
            width: disc,
            height: disc,
            borderRadius: "50%",
            background: "#b0502b",
            opacity: 0.92,
          }}
        />
      </div>
    </div>
  );
}

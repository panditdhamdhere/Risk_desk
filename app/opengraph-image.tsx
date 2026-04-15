import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 56,
          backgroundColor: "#000000",
          color: "#ffffff",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div
          style={{
            fontSize: 22,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "#a3a3a3",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          }}
        >
          Pacifica Risk Desk
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              width: 120,
              height: 4,
              backgroundColor: "#ffffff",
            }}
          />
          <div style={{ fontSize: 72, fontWeight: 600, lineHeight: 1.02, maxWidth: 980, letterSpacing: "-0.03em" }}>
            Institutional-grade analytics for Pacifica traders
          </div>
          <div style={{ fontSize: 26, color: "#a3a3a3", maxWidth: 900, lineHeight: 1.45 }}>
            Funding radar, execution analytics, and portfolio risk monitoring.
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {["Funding", "Execution", "Risk", "Testnet/Mainnet"].map((x) => (
            <div
              key={x}
              style={{
                border: "2px solid #ffffff",
                borderRadius: 0,
                padding: "10px 18px",
                fontSize: 18,
                color: "#ffffff",
                backgroundColor: "transparent",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              }}
            >
              {x}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}

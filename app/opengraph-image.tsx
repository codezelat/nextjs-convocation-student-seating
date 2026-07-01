import { ImageResponse } from "next/og";

export const alt = "SITC Convocation 2026 Seating Platform";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#ffffff",
          backgroundImage:
            "linear-gradient(to right, rgba(115,115,115,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(115,115,115,0.18) 1px, transparent 1px)",
          backgroundSize: "76px 76px",
          color: "#171717",
          padding: "64px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              border: "1px solid #e5e5e5",
              borderRadius: "24px",
              background: "#ffffff",
              padding: "18px 28px",
              boxShadow: "0 18px 45px rgba(23, 23, 23, 0.08)",
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            SITC Campus
          </div>
          <div
            style={{
              border: "1px solid #e5e5e5",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.82)",
              padding: "14px 24px",
              fontSize: 24,
              fontWeight: 600,
              color: "#525252",
            }}
          >
            Seating Platform
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              maxWidth: 920,
              fontSize: 86,
              lineHeight: 0.98,
              fontWeight: 800,
              letterSpacing: "-1px",
            }}
          >
            SITC Convocation 2026
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: 830,
              fontSize: 34,
              lineHeight: 1.35,
              color: "#525252",
            }}
          >
            Find your graduate and visitor seat numbers quickly and securely.
          </div>
        </div>
      </div>
    ),
    size
  );
}

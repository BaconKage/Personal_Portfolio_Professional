import { ImageResponse } from "next/og";
export const alt = "Shubhang Srinivas Varda — Full-Stack & AI Engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#f2f1ed",
        color: "#101114",
        padding: "60px 70px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 20,
        }}
      >
        <span>SHUBHANG SRINIVAS VARDA</span>
        <span>BENGALURU, INDIA</span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 105,
          letterSpacing: -7,
          lineHeight: 1.08,
          marginTop: 80,
        }}
      >
        <span>Software with</span>
        <span style={{ color: "#244cff" }}>an AI core.</span>
      </div>
      <div
        style={{
          display: "flex",
          marginTop: "auto",
          borderTop: "1px solid #ccc",
          paddingTop: 22,
          fontSize: 22,
        }}
      >
        Full-Stack & AI Engineer · Selected work
      </div>
    </div>,
    size,
  );
}

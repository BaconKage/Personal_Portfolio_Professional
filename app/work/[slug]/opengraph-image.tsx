import { ImageResponse } from "next/og";
import { getProject } from "@/data/projects";
export const alt = "Selected engineering work by Shubhang Srinivas Varda";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = getProject(slug);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#121b2c",
        color: "#e8edf6",
        padding: "60px 70px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 20,
          color: "#a8bce3",
        }}
      >
        <span>
          {p?.number} / {p?.category}
        </span>
        <span>CASE STUDY</span>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 100,
          letterSpacing: -6,
          marginTop: 110,
        }}
      >
        {p?.title || "Selected work"}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 29,
          color: "#a8bce3",
          marginTop: 15,
        }}
      >
        {p?.descriptor}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: "auto",
          borderTop: "1px solid #405477",
          paddingTop: 22,
          fontSize: 22,
        }}
      >
        SHUBHANG SRINIVAS VARDA ↗
      </div>
    </div>,
    size,
  );
}

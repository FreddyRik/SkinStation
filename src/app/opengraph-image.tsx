import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME} — CS2 inventory tracker and trade-up calculator`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background:
            "linear-gradient(145deg, #12151c 0%, #0b0d12 45%, #090b10 100%)",
          color: "#eef1f5",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background:
              "radial-gradient(ellipse 70% 55% at 50% 35%, rgba(255, 107, 53, 0.22), transparent 58%)",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <p
            style={{
              margin: 0,
              fontSize: 28,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "#ff6b35",
            }}
          >
            Counter-Strike 2
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: 88,
              lineHeight: 1,
              fontWeight: 600,
            }}
          >
            {SITE_NAME}
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: 900,
              fontSize: 34,
              lineHeight: 1.35,
              color: "#8b93a3",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {SITE_DESCRIPTION}
          </p>
        </div>
      </div>
    ),
    { ...size },
  );
}

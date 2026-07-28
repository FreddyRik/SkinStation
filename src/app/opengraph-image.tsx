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
            "linear-gradient(145deg, #0e1613 0%, #0c1210 45%, #0a0f0d 100%)",
          color: "#e8f0eb",
          fontFamily: "Georgia, serif",
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
              "radial-gradient(ellipse 70% 50% at 10% 0%, rgba(94, 234, 212, 0.18), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 10%, rgba(255, 107, 53, 0.12), transparent 50%)",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <p
            style={{
              margin: 0,
              fontSize: 28,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "#2dd4bf",
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
              color: "#8fa399",
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

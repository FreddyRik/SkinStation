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
            "linear-gradient(145deg, #0d1424 0%, #0a0f1d 45%, #080c18 100%)",
          color: "#ffffff",
          fontFamily: "Inter, system-ui, sans-serif",
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
              "radial-gradient(ellipse 70% 50% at 10% 0%, rgba(200, 121, 65, 0.22), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 10%, rgba(74, 98, 168, 0.16), transparent 50%)",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <p
            style={{
              margin: 0,
              fontSize: 28,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "#c87941",
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
              color: "#8b95a5",
              fontFamily: "Inter, system-ui, sans-serif",
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

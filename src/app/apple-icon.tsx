import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #0e1613, #0c1210)",
          borderRadius: 36,
          color: "#5eead4",
          fontSize: 96,
          fontWeight: 700,
          fontFamily: "Georgia, serif",
        }}
      >
        S
      </div>
    ),
    { ...size },
  );
}

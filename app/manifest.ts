import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "우리 동네 시니어 케어",
    short_name: "시니어케어",
    description: "방문요양 일정·건강기록 관리",
    start_url: "/dashboard", // proxy.ts가 role 쿠키 보고 /caregiver 등으로 보내줌
    display: "standalone",
    background_color: "#eeeeee", // body bg-[#eee]와 맞춤 (스플래시 깜빡임 방지)
    theme_color: "#2563eb", // 브랜드 색 (blue-600, 아이콘 배경과 동일)
    lang: "ko",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

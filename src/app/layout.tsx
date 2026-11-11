import type { Metadata } from "next";
import { Gowun_Batang, Nanum_Myeongjo } from "next/font/google";
import Header from "@/components/Header";
import "./globals.css";

// 본문: 고운바탕 / 제목: 나눔명조 — 옛 책 느낌의 명조 계열
const bodyFont = Gowun_Batang({
  variable: "--font-gowun",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const titleFont = Nanum_Myeongjo({
  variable: "--font-nanum",
  weight: ["400", "700", "800"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "고구마마켓",
  description: "우리 동네 중고거래, 고구마마켓",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${bodyFont.variable} ${titleFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-10">
          {children}
        </main>
        <footer className="text-center text-sm text-ink-soft py-8 font-title">
          <div className="ornament max-w-xs mx-auto mb-2">❦</div>
          고구마마켓 · 제 一 권 · 장터편 <span className="seal text-xs ml-1">薯市</span>
          <p className="text-[10px] mt-2 tracking-wider">
            그림: 김홍도 「단원풍속도첩」(18세기, 퍼블릭 도메인)
          </p>
        </footer>
      </body>
    </html>
  );
}

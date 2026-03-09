import type { Metadata } from "next";
import "./globals.css";
import NavigationProgress from "@/components/ui/NavigationProgress";

export const metadata: Metadata = {
  title: "Carbey - 在庫管理・販売最適化システム",
  description: "中古車在庫管理と販売最適化のための統合システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="font-sans antialiased">
        <NavigationProgress />
        {children}
      </body>
    </html>
  );
}

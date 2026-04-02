import type { Metadata } from "next";
import "./globals.css";
import { ChatbotWidget } from "../components/chatbot/ChatbotWidget";

export const metadata: Metadata = {
  title: "ShopSmart",
  description: "AI-powered e-commerce platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        {children}
        <ChatbotWidget />
      </body>
    </html>
  );
}


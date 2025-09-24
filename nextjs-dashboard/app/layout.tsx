import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Work Invigilator - Executive Dashboard",
  description: "Professional work monitoring and employee management dashboard with Executive Slate design system",
  icons: {
    icon: '/target.png',
    shortcut: '/target.png',
    apple: '/target.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* UI font */}
        <link href="https://fonts.googleapis.com/css2?family=Public+Sans:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet" />
        {/* Numeric/mono */}
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300..800&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} font-ui antialiased`}>
        {children}
      </body>
    </html>
  );
}

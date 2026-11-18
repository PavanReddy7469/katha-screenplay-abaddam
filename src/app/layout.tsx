import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Katha, Screenplay, Abaddam: Meere! | CBFC Telugu Cinema Interrogation",
  description:
    "A chaotic reverse-interrogation Telugu movie guessing game set inside an official Indian Censor Board screening room. Spot the lies, slam OBJECTION!, and crack the Tollywood classic in 8 reels.",
  openGraph: {
    title: "Katha, Screenplay, Abaddam: Meere!",
    description:
      "Interrogate Relangi Mavayya, Gajala, or Kill Bill Pandey in 8 Yes/No questions to guess the secret Telugu movie!",
    url: "https://katha-screenplay-abaddam.vercel.app",
    siteName: "Katha, Screenplay, Abaddam: Meere!",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@500;700;800&family=Playfair+Display:wght@600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Special+Elite&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans min-h-screen overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}

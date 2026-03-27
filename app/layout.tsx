import type { Metadata, Viewport } from "next";
import "@fontsource/outfit/300.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "@fontsource/outfit/800.css";
import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/700.css";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Toaster } from "react-hot-toast";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "HostelHub — Student Accommodation Nigeria",
    template: "%s | HostelHub",
  },
  description:
    "Find and book verified student hostels across Nigeria. Simple bank transfer payments, no hidden fees.",
  keywords: ["hostel", "student accommodation", "Nigeria", "booking", "university"],
  authors: [{ name: "HostelHub" }],
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <AuthProvider>
          <QueryProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "#1e293b",
                  color: "#f1f5f9",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontFamily: "'Outfit', system-ui, sans-serif",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
                },
                success: {
                  iconTheme: { primary: "#10b981", secondary: "#f1f5f9" },
                },
                error: {
                  iconTheme: { primary: "#ef4444", secondary: "#f1f5f9" },
                },
              }}
            />
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

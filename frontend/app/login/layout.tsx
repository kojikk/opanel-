import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OPanel"
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center max-lg:hidden"
        style={{ backgroundImage: `url(/assets/login-banner)` }}>
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      </div>
      <div className="relative z-10 h-full flex justify-center items-center">
        {children}
      </div>
    </div>
  );
}

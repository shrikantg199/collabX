import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your CollabX workspace and start collaborating in real-time.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

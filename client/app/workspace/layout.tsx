import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workspace",
  description: "Collaborate in real-time with your team in the CollabX workspace.",
};

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

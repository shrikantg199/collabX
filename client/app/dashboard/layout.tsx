import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your workspaces and team collaborations on CollabX.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

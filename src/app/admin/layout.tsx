import AdminLayout from "@/components/AdminLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard | Smart Attendance PRO",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}

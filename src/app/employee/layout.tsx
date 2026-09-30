import EmployeeLayout from "@/components/EmployeeLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scanner | Smart Attendance PRO",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <EmployeeLayout>{children}</EmployeeLayout>;
}

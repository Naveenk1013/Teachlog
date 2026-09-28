import { ReactNode } from "react";
import { getCurrentTeacherUser } from "@/lib/data/teacher";
import { TeacherNavbar } from "@/components/navigation/teacher-navbar";

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const teacher = await getCurrentTeacherUser();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TeacherNavbar teacher={teacher} />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}

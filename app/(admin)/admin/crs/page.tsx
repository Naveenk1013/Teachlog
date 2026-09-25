import { redirect } from "next/navigation";
import { getCurrentTeacherUser } from "@/lib/data/teacher";
import {
  getCRAuthorisationRegister,
  getAvailableStudentsAndBatches,
} from "@/lib/data/admin";
import { CRRegisterClient } from "@/components/admin/cr-register-client";

export default async function AdminCRsPage() {
  const user = await getCurrentTeacherUser();
  if (!user || user.role !== "admin") {
    redirect("/dashboard");
  }

  const [authorisations, { students, batches }] = await Promise.all([
    getCRAuthorisationRegister(),
    getAvailableStudentsAndBatches(),
  ]);

  return (
    <div className="space-y-6">
      <CRRegisterClient
        authorisations={authorisations}
        availableStudents={students}
        availableBatches={batches}
      />
    </div>
  );
}

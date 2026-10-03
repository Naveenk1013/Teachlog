import { ReactNode } from "react";
import { getCurrentCRUser, getCRBatchAndAssignments } from "@/lib/data/cr";
import { CRNavbar } from "@/components/navigation/cr-navbar";

export default async function CRLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentCRUser();
  let batchName = "Authorized Batch";

  if (user) {
    const { batch } = await getCRBatchAndAssignments(user.id);
    if (batch) {
      batchName = batch.name;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <CRNavbar user={user} batchName={batchName} />
      <main className="flex-1 p-4 max-w-5xl mx-auto w-full pb-16">{children}</main>
    </div>
  );
}

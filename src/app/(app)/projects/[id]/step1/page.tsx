import { prisma } from "@/lib/prisma";
import StepFooter from "@/components/StepFooter";

export default async function Step1({ params }: { params: { id: string } }) {
  const docs = await prisma.requiredDocument.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: "asc" },
  });
  return (
    <div>
      <div className="card mb-4">
        <h2 className="text-lg font-bold">Step1 必要書類案内</h2>
        <p className="mt-1 text-sm text-slate-600">
          本案件で必要となる書類の一覧です。Step7で各書類をアップロードします。条件に応じて必要／任意が切り替わります。
        </p>
      </div>
      <div className="card">
        <h3 className="mb-3 font-semibold">書類一覧</h3>
        <table className="min-w-full divide-y text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="py-2 text-left">書類名</th>
              <th className="py-2 text-left">要否</th>
              <th className="py-2 text-left">状態</th>
              <th className="py-2 text-left">備考</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {docs.map((d) => (
              <tr key={d.id}>
                <td className="py-2 font-medium">{d.documentName}</td>
                <td className="py-2">
                  {d.isRequired ? (
                    <span className="pill-red">必須</span>
                  ) : (
                    <span className="pill-gray">任意</span>
                  )}
                </td>
                <td className="py-2">
                  <span className="pill-gray">{d.status}</span>
                </td>
                <td className="py-2 text-slate-500">{d.conditionNote ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <StepFooter projectId={params.id} stepCode="STEP_1_DOCUMENT_GUIDE" />
    </div>
  );
}

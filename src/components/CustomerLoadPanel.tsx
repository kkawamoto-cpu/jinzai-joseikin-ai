"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Company = any;

/**
 * 顧客管理に登録された企業から1社を選択するパネル。
 *
 * - projectId が指定された場合: その案件のリンク先企業を切り替える（推奨）
 * - onLoad のみ指定: フォームに値を反映するだけ（旧動作）
 */
export default function CustomerLoadPanel({
  onLoad,
  projectId,
}: {
  onLoad: (data: Company) => void;
  projectId?: string;
}) {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open && companies.length === 0) {
      setLoading(true);
      fetch("/api/companies")
        .then((r) => r.json())
        .then((j) => setCompanies(j.companies || []))
        .finally(() => setLoading(false));
    }
  }, [open, companies.length]);

  const filtered = companies.filter(
    (c) =>
      !query ||
      (c.companyName ?? "").toLowerCase().includes(query.toLowerCase()) ||
      (c.representativeName ?? "").includes(query) ||
      (c.headOfficeAddress ?? "").includes(query)
  );

  const apply = async (c: Company) => {
    // projectId が指定されていれば、案件の対象企業を切り替える（より安全）
    if (projectId) {
      const ok = confirm(
        `この案件の対象企業を「${c.companyName}」に切り替えますか？\n\n（既存の企業情報を上書きせず、案件のリンク先を変更します）`
      );
      if (!ok) return;
      const res = await fetch(`/api/projects/${projectId}/link-company`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: c.id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setMsg(`⚠ 切替失敗: ${j.error || "不明なエラー"}`);
        return;
      }
      setMsg(`✓ 「${c.companyName}」に案件を紐づけました`);
      setOpen(false);
      router.refresh();
      return;
    }
    // フォームに値を反映するだけ（旧動作）
    onLoad({
      companyName: c.companyName ?? "",
      representativeName: c.representativeName ?? "",
      representativeTitle: c.representativeTitle ?? "",
      headOfficeAddress: c.headOfficeAddress ?? "",
      headOfficePhone: c.headOfficePhone ?? "",
      capitalAmount: c.capitalAmount?.toString() ?? "",
      corporateNumber: c.corporateNumber ?? "",
      employeeCount: c.employeeCount ?? "",
      employmentInsuranceOfficeNumber: c.employmentInsuranceOfficeNumber ?? "",
      industryCode: c.industryCode ?? "",
      branchCount: c.branchCount ?? "",
      laborRepresentativeName: c.laborRepresentativeName ?? "",
      trainingPromotionDepartment: c.trainingPromotionDepartment ?? "",
      trainingPromotionTitle: c.trainingPromotionTitle ?? "",
      trainingPromotionName: c.trainingPromotionName ?? "",
    });
    setMsg(`✓ 「${c.companyName}」の情報を反映しました`);
    setTimeout(() => setMsg(null), 3000);
    setOpen(false);
  };

  return (
    <div className="mb-4 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-lg text-white shadow-md">
            👥
          </div>
          <div>
            <div className="font-semibold text-slate-800">顧客管理から読み込み</div>
            <div className="text-xs text-slate-600">
              {projectId
                ? "既に登録済みの企業を選ぶと、この案件の対象企業を切り替えます（既存データは保持）"
                : "登録済みの企業を選んで全項目を反映できます"}
            </div>
          </div>
        </div>
        <button
          className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-1.5 text-sm font-semibold text-white shadow hover:opacity-95"
          onClick={() => setOpen(true)}
        >
          📋 顧客から選ぶ
        </button>
      </div>
      {msg && (
        <p className="mt-2 text-sm text-emerald-700">{msg}</p>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="card max-h-[80vh] w-full max-w-2xl overflow-hidden p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold">顧客管理から選択</h3>
                <button
                  className="text-slate-400 hover:text-slate-700"
                  onClick={() => setOpen(false)}
                >
                  ✕
                </button>
              </div>
              <input
                className="input"
                placeholder="🔍 企業名・代表者・住所で検索"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {loading ? (
                <div className="py-12 text-center text-sm text-slate-500">読み込み中...</div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  {companies.length === 0
                    ? "顧客企業がまだ登録されていません。顧客管理から追加してください。"
                    : "該当する企業が見つかりません"}
                </div>
              ) : (
                <ul className="space-y-1">
                  {filtered.map((c) => (
                    <li key={c.id}>
                      <button
                        className="group flex w-full items-start gap-3 rounded-lg border border-transparent p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50"
                        onClick={() => apply(c)}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 text-sm font-bold text-indigo-700">
                          {(c.companyName ?? "?").charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-900 group-hover:text-emerald-700">
                            {c.companyName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {c.representativeName ?? "—"} ・ {c.headOfficeAddress ?? "—"}
                          </div>
                          <div className="mt-0.5 text-[10px] text-slate-400">
                            {c.corporateNumber && <>法人番号: {c.corporateNumber} ・ </>}
                            {c.employeeCount != null && <>従業員 {c.employeeCount}名</>}
                          </div>
                        </div>
                        <div className="text-emerald-600 opacity-0 transition group-hover:opacity-100">
                          ← 反映
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

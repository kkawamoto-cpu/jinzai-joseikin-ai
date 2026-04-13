"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Company = any;

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export default function CompanyEditor({ initial }: { initial: Company }) {
  const router = useRouter();
  const [form, setForm] = useState<Company>({
    companyName: initial.companyName ?? "",
    representativeName: initial.representativeName ?? "",
    representativeTitle: initial.representativeTitle ?? "",
    headOfficeAddress: initial.headOfficeAddress ?? "",
    headOfficePhone: initial.headOfficePhone ?? "",
    capitalAmount: initial.capitalAmount?.toString() ?? "",
    corporateNumber: initial.corporateNumber ?? "",
    employeeCount: initial.employeeCount ?? "",
    employmentInsuranceOfficeNumber: initial.employmentInsuranceOfficeNumber ?? "",
    industryCode: initial.industryCode ?? "",
    branchCount: initial.branchCount ?? "",
    laborRepresentativeName: initial.laborRepresentativeName ?? "",
    trainingPromotionDepartment: initial.trainingPromotionDepartment ?? "",
    trainingPromotionTitle: initial.trainingPromotionTitle ?? "",
    trainingPromotionName: initial.trainingPromotionName ?? "",
  });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const initialMountRef = useRef(true);

  const save = async (data: Company) => {
    setSaveState("saving");
    setErrorMsg(null);
    const res = await fetch(`/api/companies/${initial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setSaveState("error");
      setErrorMsg(j.error || "保存に失敗しました");
      return;
    }
    setSaveState("saved");
    router.refresh();
    setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 2000);
  };

  // 自動保存（入力停止後800ms）
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(form), 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const setF = (k: keyof Company) => (v: string) => setForm((f: Company) => ({ ...f, [k]: v }));

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">🏢 所属企業（自社）情報</h3>
          <p className="text-xs text-slate-500">入力すると自動で保存されます</p>
        </div>
        <SaveBadge state={saveState} />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="企業名" value={form.companyName} onChange={setF("companyName")} />
        <Field
          label="代表者氏名"
          value={form.representativeName}
          onChange={setF("representativeName")}
          placeholder="山田 太郎"
        />
        <Field
          label="代表者役職"
          value={form.representativeTitle}
          onChange={setF("representativeTitle")}
          placeholder="代表取締役"
        />
        <Field
          label="本社電話番号"
          value={form.headOfficePhone}
          onChange={setF("headOfficePhone")}
          placeholder="03-xxxx-xxxx"
        />
        <div className="md:col-span-2">
          <Field
            label="本社所在地"
            value={form.headOfficeAddress}
            onChange={setF("headOfficeAddress")}
          />
        </div>
        <Field
          label="資本金(円)"
          value={form.capitalAmount}
          onChange={setF("capitalAmount")}
          placeholder="50000000"
        />
        <Field
          label="法人番号(13桁)"
          value={form.corporateNumber}
          onChange={setF("corporateNumber")}
        />
        <Field
          label="従業員数"
          value={form.employeeCount}
          onChange={setF("employeeCount")}
          type="number"
        />
        <Field
          label="雇用保険適用事業所番号(11桁)"
          value={form.employmentInsuranceOfficeNumber}
          onChange={setF("employmentInsuranceOfficeNumber")}
        />
        <Field
          label="産業分類"
          value={form.industryCode}
          onChange={setF("industryCode")}
        />
        <Field
          label="本社以外の事業所数"
          value={form.branchCount}
          onChange={setF("branchCount")}
          type="number"
        />
        <Field
          label="労働者代表氏名"
          value={form.laborRepresentativeName}
          onChange={setF("laborRepresentativeName")}
        />
        <Field
          label="職業能力開発推進者 部署"
          value={form.trainingPromotionDepartment}
          onChange={setF("trainingPromotionDepartment")}
        />
        <Field
          label="職業能力開発推進者 役職"
          value={form.trainingPromotionTitle}
          onChange={setF("trainingPromotionTitle")}
        />
        <Field
          label="職業能力開発推進者 氏名"
          value={form.trainingPromotionName}
          onChange={setF("trainingPromotionName")}
        />
      </div>
      {errorMsg && <p className="mt-3 text-sm text-rose-600">{errorMsg}</p>}
      <div className="mt-4 flex justify-end">
        <button className="btn-gradient" onClick={() => save(form)} disabled={saveState === "saving"}>
          {saveState === "saving" ? "保存中..." : "今すぐ保存"}
        </button>
      </div>
    </div>
  );
}

function SaveBadge({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "saving")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-slate-500" />
        保存中
      </span>
    );
  if (state === "saved")
    return (
      <span className="pill-green">
        <span className="mr-1">✓</span>保存済み
      </span>
    );
  if (state === "error") return <span className="pill-red">⚠ 保存失敗</span>;
  return <span className="pill-gray">自動保存対応</span>;
}

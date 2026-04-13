"use client";
import { useState } from "react";
import StepFooter from "@/components/StepFooter";
import StepAIAssist from "@/components/StepAIAssist";
import MemoryPanel from "@/components/MemoryPanel";

// ※ この Field はコンポーネント外に定義することで、親の再レンダー時に
// 新しい関数参照として再生成されず、input のフォーカスが保持される。
function Field({
  label,
  value,
  onChange,
  help,
  required,
  placeholder,
  colSpan,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  help?: string;
  required?: boolean;
  placeholder?: string;
  colSpan?: boolean;
}) {
  return (
    <div className={colSpan ? "md:col-span-2" : ""}>
      <label className="label">
        {label}
        {required && <span className="ml-1 text-rose-600">*</span>}
      </label>
      <input
        className="input"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {help && <p className="help">{help}</p>}
    </div>
  );
}

export default function Step2Form({
  projectId,
  initial,
}: {
  projectId: string;
  initial: any;
}) {
  const [form, setForm] = useState({
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
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const setField = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setMsg(null);
    const payload: any = { ...form };
    payload.capitalAmount = form.capitalAmount ? Number(form.capitalAmount) : undefined;
    payload.employeeCount = form.employeeCount !== "" ? Number(form.employeeCount) : undefined;
    payload.branchCount = form.branchCount !== "" ? Number(form.branchCount) : undefined;
    const res = await fetch(`/api/projects/${projectId}/company`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg({ type: "err", text: j.error || "保存に失敗しました" });
      return;
    }
    setMsg({ type: "ok", text: "保存しました" });
  };

  return (
    <div>
      <StepAIAssist
        projectId={projectId}
        stepCode="STEP_2_COMPANY_INFO"
        label="企業基本情報をAIに任せる"
        description="会社名等からAIがWebを検索し、法人番号・本社住所・資本金など全項目を自動入力します"
      />
      <MemoryPanel
        scope="company"
        currentData={form}
        onLoad={(data) => setForm({ ...form, ...data })}
        title="🧠 企業情報メモリ（過去の入力を再利用）"
      />
      <div className="card mb-4">
        <h2 className="text-lg font-bold">Step2 企業基本情報</h2>
        <p className="mt-1 text-sm text-slate-600">
          助成金申請に必要な企業の基本情報を入力してください。法人番号は13桁、雇用保険適用事業所番号は11桁です。
        </p>
      </div>

      <div className="card space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="企業名" value={form.companyName} onChange={setField("companyName")} required />
          <Field label="代表者職氏名" value={form.representativeName} onChange={setField("representativeName")} placeholder="山田 太郎" />
          <Field label="代表者役職" value={form.representativeTitle} onChange={setField("representativeTitle")} placeholder="代表取締役" />
          <Field label="本社電話番号" value={form.headOfficePhone} onChange={setField("headOfficePhone")} placeholder="03-1234-5678" />
          <Field label="本社所在地" value={form.headOfficeAddress} onChange={setField("headOfficeAddress")} colSpan />
          <Field
            label="資本金額(円)"
            value={form.capitalAmount}
            onChange={setField("capitalAmount")}
            help="中小企業該当性の一次判定に使用します"
          />
          <Field label="法人番号(13桁)" value={form.corporateNumber} onChange={setField("corporateNumber")} />
          <Field label="常時雇用する労働者数" value={form.employeeCount} onChange={setField("employeeCount")} />
          <Field label="雇用保険適用事業所番号(11桁)" value={form.employmentInsuranceOfficeNumber} onChange={setField("employmentInsuranceOfficeNumber")} />
          <Field label="産業分類" value={form.industryCode} onChange={setField("industryCode")} />
          <Field label="本社以外の事業所数" value={form.branchCount} onChange={setField("branchCount")} />
          <Field label="労働者代表氏名" value={form.laborRepresentativeName} onChange={setField("laborRepresentativeName")} />
          <Field label="職業能力開発推進者 部署" value={form.trainingPromotionDepartment} onChange={setField("trainingPromotionDepartment")} />
          <Field label="職業能力開発推進者 役職" value={form.trainingPromotionTitle} onChange={setField("trainingPromotionTitle")} />
          <Field label="職業能力開発推進者 氏名" value={form.trainingPromotionName} onChange={setField("trainingPromotionName")} />
        </div>
        {msg && (
          <p className={msg.type === "ok" ? "text-sm text-emerald-600" : "text-sm text-rose-600"}>
            {msg.text}
          </p>
        )}
      </div>

      <StepFooter
        projectId={projectId}
        stepCode="STEP_2_COMPANY_INFO"
        onSaveDraft={save}
        onComplete={save}
        nextDisabled={!form.companyName}
      />
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import StepFooter from "@/components/StepFooter";
import StepAIAssist from "@/components/StepAIAssist";
import MemoryPanel from "@/components/MemoryPanel";
import CustomerLoadPanel from "@/components/CustomerLoadPanel";

function SaveBadge({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "saving")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-slate-500" />
        保存中
      </span>
    );
  if (state === "saved")
    return <span className="pill-green">✓ 保存済み</span>;
  if (state === "error") return <span className="pill-red">⚠ 保存失敗</span>;
  return <span className="pill-gray">自動保存対応</span>;
}

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
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const initialMountRef = useRef(true);

  const setField = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaveState("saving");
    setErrorMsg(null);
    // 数値類だけ事前変換、それ以外はそのままサーバの緩い処理に委ねる
    const payload: any = { ...form };
    if (form.capitalAmount !== "" && form.capitalAmount != null) {
      const n = Number(String(form.capitalAmount).replace(/[^\d.-]/g, ""));
      payload.capitalAmount = Number.isFinite(n) ? n : null;
    } else {
      payload.capitalAmount = null;
    }
    if (form.employeeCount !== "" && form.employeeCount != null) {
      const n = Number(form.employeeCount);
      payload.employeeCount = Number.isFinite(n) ? n : null;
    } else {
      payload.employeeCount = null;
    }
    if (form.branchCount !== "" && form.branchCount != null) {
      const n = Number(form.branchCount);
      payload.branchCount = Number.isFinite(n) ? n : null;
    } else {
      payload.branchCount = null;
    }
    try {
      const res = await fetch(`/api/projects/${projectId}/company`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setSaveState("error");
        setErrorMsg(j.error || `保存失敗 (HTTP ${res.status})`);
        return;
      }
      setSaveState("saved");
      setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch (e: any) {
      setSaveState("error");
      setErrorMsg(e?.message || "通信エラー");
    }
  };

  // 自動保存（800ms debounce）
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(), 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  return (
    <div>
      <StepAIAssist
        projectId={projectId}
        stepCode="STEP_2_COMPANY_INFO"
        label="企業基本情報をAIに任せる"
        description="会社名等からAIがWebを検索し、法人番号・本社住所・資本金など全項目を自動入力します"
      />
      <CustomerLoadPanel
        projectId={projectId}
        onLoad={(data) => setForm((f) => ({ ...f, ...data }))}
      />
      <MemoryPanel
        scope="company"
        currentData={form}
        onLoad={(data) => setForm({ ...form, ...data })}
        title="🧠 企業情報メモリ（過去の入力を再利用）"
      />
      <div className="card mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Step2 企業基本情報</h2>
          <p className="mt-1 text-sm text-slate-600">
            助成金申請に必要な企業の基本情報を入力してください。法人番号は13桁、雇用保険適用事業所番号は11桁です。
            <span className="ml-2 inline-block">入力すると自動保存されます。</span>
          </p>
        </div>
        <SaveBadge state={saveState} />
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
        {errorMsg && <p className="text-sm text-rose-600">{errorMsg}</p>}
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

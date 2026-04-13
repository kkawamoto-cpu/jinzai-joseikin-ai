import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import DesignWorkspace from "./DesignWorkspace";

export default async function TrainingDesignDetail({
  params,
}: {
  params: { id: string };
}) {
  const design = await prisma.trainingDesign.findUnique({
    where: { id: params.id },
    include: { company: true },
  });
  if (!design) return notFound();
  // BigInt(資本金等)をシリアライズ可能に変換
  const safe = JSON.parse(
    JSON.stringify(design, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
  return <DesignWorkspace initial={safe} />;
}

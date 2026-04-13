import { prisma } from "@/lib/prisma";
import Step7Uploads from "./Step7Uploads";

export default async function Step7({ params }: { params: { id: string } }) {
  const [documents, files] = await Promise.all([
    prisma.requiredDocument.findMany({
      where: { projectId: params.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.uploadedFile.findMany({
      where: { projectId: params.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return <Step7Uploads projectId={params.id} documents={documents} files={files} />;
}

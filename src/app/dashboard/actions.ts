"use server";
import { getUserId } from "@/lib/auth";
import { getAnalysisView } from "@/lib/data";

// API의 서버 생성 uploadId를 본인의 실패 파일명으로만 해석한다.
export async function getFailedUploadFilename(analysisId: string, uploadId: string): Promise<string | null> {
  try {
    if (typeof analysisId !== "string" || typeof uploadId !== "string") return null;
    const userId = await getUserId();
    if (!userId) return null;
    const view = await getAnalysisView(userId, analysisId);
    return view?.status === "failed" && view.failedUpload?.id === uploadId ? view.failedUpload.filename : null;
  } catch {
    return null;
  }
}

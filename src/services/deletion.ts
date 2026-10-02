import "server-only";
import { deleteAnalysisRecord, getAnalysisStatus, recoverStaleAnalyses } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { StorageDeleteError } from "@/types/errors";

const STORAGE_PAGE_SIZE = 100;

export async function deleteAnalysis(userId: string, analysisId: string): Promise<"deleted" | "not_found" | "in_progress"> {
  if (await getAnalysisStatus(userId, analysisId) === null) return "not_found";
  await recoverStaleAnalyses(userId);
  const status = await getAnalysisStatus(userId, analysisId);
  if (status === null) return "not_found";
  if (status === "processing") return "in_progress";

  try {
    const bucket = createAdminClient().storage.from("csv-uploads");
    async function filesUnder(prefix: string): Promise<string[]> {
      const files: string[] = [];
      for (let offset = 0; ; offset += STORAGE_PAGE_SIZE) {
        const { data, error } = await bucket.list(prefix, {
          limit: STORAGE_PAGE_SIZE, offset, sortBy: { column: "name", order: "asc" },
        });
        if (error || !data) throw new StorageDeleteError();
        for (const object of data) {
          const path = `${prefix}/${object.name}`;
          if (object.id === null) files.push(...await filesUnder(path));
          else files.push(path);
        }
        if (data.length < STORAGE_PAGE_SIZE) return files;
      }
    }
    const prefix = `${userId}/${analysisId}`;
    // 삭제로 list의 offset이 밀리지 않도록 전체 페이지를 먼저 수집한다.
    const paths = await filesUnder(prefix);
    for (let start = 0; start < paths.length; start += STORAGE_PAGE_SIZE) {
      const { error } = await bucket.remove(paths.slice(start, start + STORAGE_PAGE_SIZE));
      if (error) throw new StorageDeleteError();
    }
    if ((await filesUnder(prefix)).length > 0) throw new StorageDeleteError();
  } catch {
    throw new StorageDeleteError();
  }
  return await deleteAnalysisRecord(userId, analysisId) ? "deleted" : "not_found";
}

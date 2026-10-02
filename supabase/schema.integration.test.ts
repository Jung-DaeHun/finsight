import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, options);
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, options);
const users: { id: string; client: SupabaseClient; analysisId: string }[] = [];
const tables = ["subscriptions", "analyses", "uploads", "transactions", "analysis_usage"] as const;
const transaction = {
  occurred_on: "2026-09-30", amount: 12000, direction: "debit", merchant: "테스트 상점",
  description: "통합 테스트", category: "food", is_recurring: false, anomaly_type: null,
};
const summary = {
  totalSpend: 12000, byCategory: { food: 12000 }, topMerchants: [],
  period: { from: "2026-09-30", to: "2026-09-30" }, transactionCount: 1, skippedRows: 0,
};
const detections = { recurringCount: 0, anomalyCount: 0 };

async function start(userId: string, createdAt?: string) {
  const { data, error } = await admin.from("analyses").insert({
    user_id: userId, status: "processing", ...(createdAt ? { created_at: createdAt } : {}),
  }).select("id").single();
  expect(error).toBeNull();
  return data!.id as string;
}
function complete(userId: string, analysisId: string, txs = [transaction], client = admin) {
  return client.rpc("complete_analysis", {
    p_user_id: userId, p_analysis_id: analysisId, p_transactions: txs,
    p_summary: summary, p_detections: detections,
  });
}
async function state(userId: string, analysisId: string) {
  const [analysis, transactions, usage] = await Promise.all([
    admin.from("analyses").select("status,summary,detections,completed_at").eq("user_id", userId).eq("id", analysisId).single(),
    admin.from("transactions").select("*").eq("user_id", userId).eq("analysis_id", analysisId),
    admin.from("analysis_usage").select("*").eq("user_id", userId).eq("analysis_id", analysisId),
  ]);
  for (const result of [analysis, transactions, usage]) expect(result.error).toBeNull();
  return { analysis: analysis.data!, transactions: transactions.data!, usage: usage.data! };
}

beforeAll(async () => {
  for (let i = 0; i < 2; i++) {
    const email = `finsight-test-${randomUUID()}@example.com`;
    const password = `${randomUUID()}Aa1!`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(created.error).toBeNull();
    const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, options);
    // 로그인 실패 시에도 afterAll에서 삭제할 수 있도록 즉시 기록한다.
    users.push({ id: created.data.user!.id, client, analysisId: "" });
    expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull();
  }
});
afterAll(async () => {
  const cleanup = await Promise.all(users.map((user) => admin.auth.admin.deleteUser(user.id)));
  for (const result of cleanup) expect(result.error).toBeNull();
  for (const user of users) {
    for (const table of tables) {
      const result = await admin.from(table).select("user_id", { count: "exact", head: true }).eq("user_id", user.id);
      expect(result.error).toBeNull();
      expect(result.count).toBe(0);
    }
  }
});

describe("R1/R4: anon·Free·Pro의 테이블 및 RPC 권한 차단", () => {
  beforeAll(async () => {
    for (const [i, user] of users.entries()) {
      user.analysisId = await start(user.id);
      expect((await complete(user.id, user.analysisId)).error).toBeNull();
      expect((await admin.from("uploads").insert({
        analysis_id: user.analysisId, user_id: user.id, original_filename: "test.csv",
        storage_path: `${user.id}/${user.analysisId}/${randomUUID()}`, file_hash: randomUUID(),
      })).error).toBeNull();
      expect((await admin.from("subscriptions").insert({
        user_id: user.id, polar_subscription_id: randomUUID(), polar_customer_id: randomUUID(),
        status: i === 0 ? "revoked" : "active",
      })).error).toBeNull();
    }
  });
  for (const role of ["anon", "free", "pro"] as const) {
    it.each(tables)(`${role}: %s SELECT/INSERT/UPDATE/DELETE를 모두 거부한다`, async (table) => {
      const user = users[role === "pro" ? 1 : 0];
      const client = role === "anon" ? anon : user.client;
      const fixtures: Record<typeof tables[number], Record<string, unknown>> = {
        subscriptions: { user_id: user.id, polar_subscription_id: randomUUID(), polar_customer_id: randomUUID(), status: "active" },
        analyses: { user_id: user.id, status: "processing" },
        uploads: { user_id: user.id, analysis_id: user.analysisId, original_filename: "test.csv", storage_path: randomUUID(), file_hash: randomUUID() },
        transactions: { ...transaction, user_id: user.id, analysis_id: user.analysisId },
        analysis_usage: { user_id: user.id, analysis_id: randomUUID(), usage_month: "2026-09-01" },
      };
      const results = await Promise.all([
        client.from(table).select("*").eq("user_id", user.id),
        client.from(table).insert(fixtures[table]),
        client.from(table).update({ user_id: user.id }).eq("user_id", user.id),
        client.from(table).delete().eq("user_id", user.id),
      ]);
      for (const result of results) {
        expect(result.error?.code).toBe("42501");
        expect(result.data).toBeNull();
      }
    });
    it(`${role}: complete_analysis 실행을 거부한다`, async () => {
      const user = users[role === "pro" ? 1 : 0];
      const result = await complete(user.id, user.analysisId, [transaction], role === "anon" ? anon : user.client);
      expect(result.error?.code).toBe("42501");
    });
  }
});

describe("R2/R5: 완료 RPC의 원자성·소유권·사용량", () => {
  it("성공 시 거래·완료·원장을 함께 저장하고 시작 시각의 UTC 월에 귀속한다", async () => {
    const userId = users[0].id;
    const id = await start(userId, "2026-10-01T00:30:00+09:00");
    const result = await complete(userId, id);
    expect(result.error).toBeNull();
    expect(result.data).toBe(true);
    const saved = await state(userId, id);
    expect(saved.analysis).toMatchObject({ status: "completed", summary, detections });
    expect(saved.analysis.completed_at).not.toBeNull();
    expect(saved.transactions).toHaveLength(1);
    expect(saved.transactions[0]).toMatchObject({ ...transaction, user_id: userId, analysis_id: id });
    expect(saved.usage).toHaveLength(1);
    expect(saved.usage[0].usage_month).toBe("2026-09-01");
    expect((await complete(userId, id)).data).toBe(false);
    expect(await state(userId, id)).toEqual(saved);
    expect((await admin.from("analyses").delete().eq("id", id).eq("user_id", userId)).error).toBeNull();
    const usage = await admin.from("analysis_usage").select("analysis_id").eq("analysis_id", id).eq("user_id", userId);
    expect(usage.error).toBeNull();
    expect(usage.data).toHaveLength(1);
    const txs = await admin.from("transactions").select("id").eq("analysis_id", id).eq("user_id", userId);
    expect(txs.error).toBeNull();
    expect(txs.data).toHaveLength(0);
  });
  it("timeout 이후 늦은 완료와 타인·없는 ID는 false이며 아무것도 쓰지 않는다", async () => {
    const userId = users[0].id;
    const id = await start(userId);
    const foreign = await complete(users[1].id, id);
    expect(foreign.error).toBeNull();
    expect(foreign.data).toBe(false);
    expect((await state(userId, id)).analysis.status).toBe("processing");
    expect((await admin.from("analyses").update({ status: "failed", error_code: "timeout" }).eq("id", id).eq("user_id", userId)).error).toBeNull();
    const before = await state(userId, id);
    const late = await complete(userId, id);
    expect(late.error).toBeNull();
    expect(late.data).toBe(false);
    expect(await state(userId, id)).toEqual(before);
    expect(before.transactions).toHaveLength(0);
    expect(before.usage).toHaveLength(0);
    const missing = await complete(userId, randomUUID());
    expect(missing.error).toBeNull();
    expect(missing.data).toBe(false);
  });
  it("두 번째 거래가 check 위반이면 상태·앞 거래·원장까지 전체 rollback한다", async () => {
    const userId = users[0].id;
    const id = await start(userId);
    const result = await complete(userId, id, [transaction, { ...transaction, amount: 0 }]);
    expect(result.error?.code).toBe("23514");
    const saved = await state(userId, id);
    expect(saved.analysis).toEqual({ status: "processing", summary: null, detections: null, completed_at: null });
    expect(saved.transactions).toHaveLength(0);
    expect(saved.usage).toHaveLength(0);
    expect((await complete(userId, id)).data).toBe(true);
  });
  it("같은 사용자의 두 번째 processing만 unique 위반으로 막는다", async () => {
    const first = await start(users[0].id);
    const result = await admin.from("analyses").insert({ user_id: users[0].id, status: "processing" });
    expect(result.error?.code).toBe("23505");
    const other = await start(users[1].id);
    expect((await complete(users[0].id, first)).data).toBe(true);
    expect((await complete(users[1].id, other)).data).toBe(true);
  });
});

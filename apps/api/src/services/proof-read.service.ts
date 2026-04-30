import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { proofReceipts } from "../db/schema";

export class ProofReadService {
  async getById(receiptId: string) {
    return db.query.proofReceipts.findFirst({ where: eq(proofReceipts.id, receiptId) });
  }
}

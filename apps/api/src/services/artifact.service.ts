import { v4 as uuidv4 } from "uuid";
import type { ArtifactManifestEntry } from "@factuam/shared-types";
import { db } from "../db/client";
import { artifacts } from "../db/schema";

export class ArtifactService {
  async record(experimentId: string, entries: ArtifactManifestEntry[]) {
    if (!entries.length) return;

    await db.insert(artifacts).values(
      entries.map((entry) => ({
        id: uuidv4(),
        experimentId,
        artifactType: entry.artifactType,
        name: entry.name,
        localPath: entry.localPath,
        contentHash: entry.contentHash,
        ogStorageUri: entry.uri
      }))
    );
  }
}

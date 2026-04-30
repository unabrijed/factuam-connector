import { Card, SectionTitle } from "./ui";

export function ArtifactList({ artifacts }: { artifacts: Array<{ artifactType?: string; name?: string; ogStorageUri?: string; uri?: string }> }) {
  return (
    <Card>
      <SectionTitle title="Artifacts" />
      <div className="space-y-2 text-sm text-[var(--text-soft)]">
        {artifacts.length ? (
          artifacts.map((artifact, index) => (
            <div key={`${artifact.name ?? artifact.artifactType ?? 'artifact'}-${index}`} className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <div className="font-medium text-[var(--text)]">{artifact.name ?? artifact.artifactType}</div>
              <div className="text-[var(--muted)]">{artifact.artifactType}</div>
              {artifact.ogStorageUri || artifact.uri ? <a href={artifact.ogStorageUri || artifact.uri}>{artifact.ogStorageUri || artifact.uri}</a> : null}
            </div>
          ))
        ) : (
          <p className="text-[var(--muted)]">None.</p>
        )}
      </div>
    </Card>
  );
}

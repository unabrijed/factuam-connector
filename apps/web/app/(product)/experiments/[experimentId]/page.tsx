import { redirect } from "next/navigation";

export default async function ExperimentPage({ params }: { params: Promise<{ experimentId: string }> }) {
  const { experimentId } = await params;
  redirect(`/app?experiment=${encodeURIComponent(experimentId)}`);
}

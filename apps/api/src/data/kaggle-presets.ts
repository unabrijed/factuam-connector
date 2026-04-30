export type KagglePreset = {
  id: string;
  label: string;
  description: string;
  dataset: string;
  file?: string;
  query: string;
  expectedColumns?: string[];
};

export const kagglePresets: KagglePreset[] = [
  {
    id: "wine-value-analysis",
    label: "Wine value analysis",
    description: "Fixed Kaggle demo using wine reviews. Good for a stable one-click import + run flow.",
    dataset: "zynicide/wine-reviews",
    file: "winemag-data-130k-v2.csv",
    query:
      "Using price, country, province, and variety, predict wine review points and identify which country-variety segments appear to offer the strongest value for money.",
    expectedColumns: ["country", "variety", "price", "points", "province"]
  }
];

export function getKagglePresetById(id: string) {
  return kagglePresets.find((preset) => preset.id === id);
}

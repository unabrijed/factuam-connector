import workflowPresetsJson from "../data/workflow-presets.json";

export type WorkflowPreset = {
  id: string;
  label: string;
  query: string;
  note?: string;
};

export type WorkflowPresetsConfig = {
  version: number;
  sampleDataset: {
    publicPath: string;
    uploadName: string;
    description: string;
  };
  presets: WorkflowPreset[];
};

export const workflowPresetsConfig = workflowPresetsJson as WorkflowPresetsConfig;

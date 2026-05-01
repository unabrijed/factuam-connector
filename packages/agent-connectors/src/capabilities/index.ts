import { datasetDiscoveryTools } from "./dataset-discovery";
import { datasetSourceTools } from "./dataset-source";
import { mlComputeTools } from "./ml-compute";
import { verificationTools } from "./verification";

export { datasetDiscoveryTools, datasetSourceTools, mlComputeTools, verificationTools };

export const allCapabilityTools = [
  ...datasetSourceTools,
  ...mlComputeTools,
  ...verificationTools,
  ...datasetDiscoveryTools
];

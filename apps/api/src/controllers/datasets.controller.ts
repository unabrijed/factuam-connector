import { DatasetService } from "../services/dataset.service";

const datasetService = new DatasetService();

export async function uploadDatasetController(file: File, name: string) {
  return datasetService.uploadDataset({ file, name });
}

import type { ConnectorRequest } from "@factum/shared-types";

export function getDatasetNameFromConnectorRequest(request: ConnectorRequest) {
  switch (request.provider) {
    case "kaggle":
      return request.params.dataset;
    case "url_csv":
      return request.params.fileName ?? new URL(request.params.url).pathname.split("/").filter(Boolean).pop() ?? "remote-csv";
    default:
      return "connector-dataset";
  }
}

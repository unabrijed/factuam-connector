import type { DataQualityReport, DatasetDiagnosis, ExperimentPlan } from "@factum/shared-types";

export class DiagnosisService {
  diagnose(input: { plan: ExperimentPlan; validation: DataQualityReport }): DatasetDiagnosis {
    const { plan, validation } = input;
    const inferred = validation.inferredSchema;
    const target = inferred.find((column) => column.name === plan.targetColumn);
    const rowCount = validation.rowCount;
    const highMissingColumns = Object.entries(validation.missingValues)
      .filter(([, count]) => rowCount > 0 && count / rowCount >= 0.25)
      .map(([name]) => name);
    const highCardinalityColumns = inferred
      .filter((column) => column.kind === "categorical" && (column.uniqueValues ?? 0) > Math.max(50, rowCount * 0.2))
      .map((column) => column.name);
    const textColumns = inferred.filter((column) => column.kind === "text").map((column) => column.name);
    const datetimeColumns = inferred.filter((column) => column.kind === "datetime").map((column) => column.name);
    const identifierLikeColumns = inferred
      .filter((column) => ["id", "uuid", "name", "title", "winery", "designation"].some((token) => column.name.toLowerCase().includes(token)))
      .map((column) => column.name);
    const leakageRisks = validation.warnings
      .filter((warning) => warning.toLowerCase().includes("matches the target") || warning.toLowerCase().includes("leak"))
      .slice(0, 10);
    const splitRisks = [
      ...(datetimeColumns.length && plan.backtestMethod === "random_split" ? ["Datetime-like columns exist; consider a time-aware split if the task is temporal."] : []),
      ...(rowCount < Math.max(50, plan.successCriteria.minimumRows / 5) ? ["Very small dataset may cause unstable train/test estimates."] : [])
    ];
    const likelyUsefulColumns = [...new Set([...plan.requiredColumns, ...plan.optionalColumns])];
    const likelyHarmfulColumns = [...new Set([...highMissingColumns, ...highCardinalityColumns, ...identifierLikeColumns.filter((column) => !plan.requiredColumns.includes(column))])];
    const targetQualityNotes = [
      ...(validation.missingValues[plan.targetColumn] ? [`Target column is missing ${validation.missingValues[plan.targetColumn]} value(s).`] : []),
      ...(target?.kind === "unknown" ? ["Target type could not be inferred confidently."] : [])
    ];
    const targetQuality: DatasetDiagnosis["targetQuality"] =
      !target ? "invalid" :
      (validation.missingValues[plan.targetColumn] ?? 0) / Math.max(rowCount, 1) > 0.25 ? "sparse" :
      target.kind === "unknown" ? "ambiguous" :
      "clean";
    const taskTypeFit: DatasetDiagnosis["taskTypeFit"] =
      (plan.taskType === "regression" && target?.kind === "numeric") ||
      (plan.taskType === "classification" && target?.kind === "categorical")
        ? "strong"
        : target?.kind === "unknown"
          ? "weak"
          : "moderate";
    const textStrategy: DatasetDiagnosis["textStrategy"] =
      textColumns.length === 0 ? "exclude" :
      textColumns.some((column) => plan.optionalColumns.includes(column) || plan.requiredColumns.includes(column)) ? "featureize" :
      identifierLikeColumns.length >= textColumns.length ? "meta_only" :
      "review";

    const recommendedActions: string[] = [];
    if (highMissingColumns.length) recommendedActions.push("Review missing-value handling for sparse columns before retraining.");
    if (highCardinalityColumns.length) recommendedActions.push("Compress or selectively encode high-cardinality categorical columns.");
    if (textColumns.length) recommendedActions.push(textStrategy === "featureize" ? "Preserve relevant text columns and consider featureization rather than dropping them." : "Review text columns and decide whether to keep meta-features or exclude them.");
    if (leakageRisks.length) recommendedActions.push("Investigate possible leakage before trusting strong results.");
    if (splitRisks.length) recommendedActions.push(...splitRisks);
    if (!recommendedActions.length) recommendedActions.push("Proceed with planned structured modeling and monitor metric lift.");

    return {
      summary: `Dataset has ${rowCount} rows across ${validation.columnCount} columns; target ${plan.targetColumn} appears ${target?.kind ?? "unknown"}.`,
      targetColumn: plan.targetColumn,
      targetKind: target?.kind ?? "unknown",
      targetQuality,
      taskTypeFit,
      rowCount: validation.rowCount,
      columnCount: validation.columnCount,
      highMissingColumns,
      highCardinalityColumns,
      textColumns,
      datetimeColumns,
      leakageRisks,
      splitRisks,
      identifierLikeColumns,
      likelyUsefulColumns,
      likelyHarmfulColumns,
      textStrategy,
      targetQualityNotes,
      recommendedActions
    };
  }
}

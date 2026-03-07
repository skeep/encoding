import outputOne from "../../../../sample/output.json";
import outputTwo from "../../../../sample/output-2.json";
import outputThree from "../../../../sample/output-3.json";
import outputFour from "../../../../sample/output-4.json";
import outputFive from "../../../../sample/output-5.json";

export type FieldScoringMeta = {
  field_id: string;
  raw_value: string;
  normalized_value: string | number | null;
  field_score: number;
  status: "passed" | "failed";
  component_scores: {
    ocr: number;
    field_context: number;
    cross_field_consistency: number;
    statistical_plausibility: number;
    composite: number;
  };
  details: string[];
  explainability: {
    summary: string;
    weighted_formula: string;
    component_narratives: Array<{
      component: "ocr" | "field_context" | "cross_field_consistency" | "statistical_plausibility";
      score: number;
      narrative: string;
      evidence?: string;
    }>;
    final_narrative: string;
  };
  rule_outputs: Array<{
    rule_name: string;
    score: number;
    passed: boolean;
    details: string;
    applicable: boolean;
  }>;
};

type ConfidenceMetaSample = {
  ocr?: { confidence?: number };
  field_context?: {
    confidence?: number;
    reason?: string;
    correction?: {
      was_corrected?: boolean;
      action?: string | null;
      corrected_value?: string | number | null;
      correction_confidence?: number | null;
      source?: string | null;
      original_value?: string | null;
    };
  };
  statistical_plausibility?: {
    confidence?: number;
    reason?: string;
    is_dummy?: boolean;
  };
  cross_field_consistency?: {
    confidence?: number;
    reason?: string;
    is_dummy?: boolean;
  };
  composite?: {
    confidence?: number;
    method?: string;
    weights?: Record<string, number>;
  };
};

type OutputFieldEntry = {
  field_id?: string;
  contact_type?: string;
  confidence_meta?: ConfidenceMetaSample;
};

type OutputDocument = {
  fields?: OutputFieldEntry[];
  customer_fields?: Array<{
    fields?: OutputFieldEntry[];
    contact_fields?: OutputFieldEntry[];
  }>;
};

const outputSources = [outputOne, outputTwo, outputThree, outputFour, outputFive] as unknown as OutputDocument[][];

function normalizeKey(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

const fieldAliasMap: Record<string, string> = {
  surname: "last_name",
  civil_status: "marital_status",
  number_of_dependents: "no_of_dependent",
  ages_of_dependents: "no_of_dependent",
  no_of_years: "years_at_address",
  yrs_stayed: "years_at_address",
  position_title: "job_title",
  length_of_stay: "length_of_service",
  dealer: "external_referral",
  marketing_prof: "referring_agent",
  variant: "model",
  term_months: "applied_term",
  amount_financed: "amount_applied",
  downpayment_pct: "down_payment",
  app_no: "application_number",
  home_ownership: "residential_status",
  complete_home_address: "address",
  cellphone_no: "mobile",
  email_address: "email",
  app: "applicant",
  yrs_in_employment: "length_of_service",
  applicant_monthly_take_home_pay: "claimed_income",
  spouse_monthly_take_home_pay: "claimed_income",
  total_monthly_income: "claimed_income",
  business_address: "employer_address",
  employer_name: "employer_name",
  first_name: "first_name",
  middle_name: "middle_name",
  date_of_birth: "date_of_birth",
  citizenship: "citizenship",
  make: "make",
  year: "manufactured_year",
  price: "cash_price"
};

function keyFromPath(path: string): string {
  const leaf = normalizeKey(path.split(".").pop() ?? path);
  return fieldAliasMap[leaf] ?? leaf;
}

function flattenSampleEntries(doc: OutputDocument): Array<{ key: string; meta: ConfidenceMetaSample }> {
  const entries: Array<{ key: string; meta: ConfidenceMetaSample }> = [];

  const pushEntry = (item: OutputFieldEntry): void => {
    if (!item.confidence_meta) {
      return;
    }
    const sourceKey = item.field_id ?? item.contact_type;
    if (!sourceKey) {
      return;
    }
    entries.push({
      key: normalizeKey(sourceKey),
      meta: item.confidence_meta
    });
  };

  doc.fields?.forEach(pushEntry);
  doc.customer_fields?.forEach((group) => {
    group.fields?.forEach(pushEntry);
    group.contact_fields?.forEach(pushEntry);
  });

  return entries;
}

const sampleEntries = outputSources.flatMap((payload) => payload.flatMap(flattenSampleEntries));

const samplesByKey = sampleEntries.reduce<Record<string, ConfidenceMetaSample[]>>((acc, item) => {
  if (!acc[item.key]) {
    acc[item.key] = [];
  }
  acc[item.key].push(item.meta);
  return acc;
}, {});

const allConfidenceSamples = sampleEntries.map((entry) => entry.meta);

function stableIndex(seed: string, size: number): number {
  if (size <= 0) {
    return 0;
  }
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % size;
}

function pickSample(path: string, value: string, applicationId?: string): ConfidenceMetaSample {
  const key = keyFromPath(path);
  const scopedSeed = `${applicationId ?? "unknown"}::${path}::${value}`;
  const preferred = samplesByKey[key];
  if (preferred && preferred.length > 0) {
    return preferred[stableIndex(scopedSeed, preferred.length)];
  }
  return allConfidenceSamples[stableIndex(scopedSeed, allConfidenceSamples.length)] ?? {};
}

function normalizeValue(value: string): string | number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const numeric = Number(trimmed.replace(/,/g, ""));
  if (!Number.isNaN(numeric) && trimmed !== "true" && trimmed !== "false") {
    return numeric;
  }
  return trimmed;
}

export function buildScoringMeta(path: string, value: string, applicationId?: string): FieldScoringMeta {
  const normalized = normalizeValue(value);
  const sampledMeta = pickSample(path, value, applicationId);
  const ocrScore = sampledMeta.ocr?.confidence ?? 0.9;
  const fieldContextScore = sampledMeta.field_context?.confidence ?? 0.9;
  const crossFieldScore = sampledMeta.cross_field_consistency?.confidence ?? 0.78;
  const statisticalScore = sampledMeta.statistical_plausibility?.confidence ?? 0.8;
  const compositeScore =
    sampledMeta.composite?.confidence ??
    Number(
      (0.3 * ocrScore + 0.3 * fieldContextScore + 0.2 * crossFieldScore + 0.2 * statisticalScore).toFixed(6)
    );
  const correction = sampledMeta.field_context?.correction;
  const wasCorrected = correction?.was_corrected ?? false;
  const weightedFormula = `0.30 x OCR(${ocrScore.toFixed(3)}) + 0.30 x FieldContext(${fieldContextScore.toFixed(
    3
  )}) + 0.20 x CrossField(${crossFieldScore.toFixed(3)}) + 0.20 x Statistical(${statisticalScore.toFixed(3)})`;
  const fieldContextNarrative = wasCorrected
    ? `Field context model corrected the extracted value using ${correction?.action ?? "replace"} action.`
    : "Field context model accepted the extracted value without correction.";
  const fieldContextEvidence = wasCorrected
    ? `Changed from "${correction?.original_value ?? "<unknown>"}" to "${String(correction?.corrected_value ?? "")}" (correction confidence ${(
        correction?.correction_confidence ?? fieldContextScore
      ).toFixed(3)}).`
    : sampledMeta.field_context?.reason ?? "No correction evidence required.";

  return {
    field_id: path,
    raw_value: value,
    normalized_value: normalized,
    field_score: compositeScore,
    status: compositeScore >= 0.6 ? "passed" : "failed",
    component_scores: {
      ocr: ocrScore,
      field_context: fieldContextScore,
      cross_field_consistency: crossFieldScore,
      statistical_plausibility: statisticalScore,
      composite: compositeScore
    },
    details: [
      sampledMeta.field_context?.reason ?? "Context confidence sampled from output fixtures.",
      sampledMeta.cross_field_consistency?.reason ??
        "Cross-field consistency score available as sample placeholder.",
      sampledMeta.statistical_plausibility?.reason ??
        "Statistical plausibility score available as sample placeholder."
    ],
    explainability: {
      summary:
        normalized === null
          ? "This field is currently empty, so confidence relies mostly on context and fallback model signals."
          : "The displayed value was scored using OCR signal, context validation, cross-field checks, and statistical plausibility.",
      weighted_formula: weightedFormula,
      component_narratives: [
        {
          component: "ocr",
          score: ocrScore,
          narrative: "OCR confidence reflects extraction quality from the source document.",
          evidence: `OCR signal for this value is ${ocrScore.toFixed(3)}.`
        },
        {
          component: "field_context",
          score: fieldContextScore,
          narrative: fieldContextNarrative,
          evidence: fieldContextEvidence
        },
        {
          component: "cross_field_consistency",
          score: crossFieldScore,
          narrative:
            sampledMeta.cross_field_consistency?.reason ??
            "Cross-field consistency checks compare this value against related fields (example: DOB -> age).",
          evidence: sampledMeta.cross_field_consistency?.is_dummy
            ? "Current sample uses placeholder cross-field confidence."
            : undefined
        },
        {
          component: "statistical_plausibility",
          score: statisticalScore,
          narrative:
            sampledMeta.statistical_plausibility?.reason ??
            "Statistical plausibility checks compare the value to learned distributions.",
          evidence: sampledMeta.statistical_plausibility?.is_dummy
            ? "Current sample uses placeholder statistical confidence."
            : undefined
        }
      ],
      final_narrative: `Composite confidence is ${compositeScore.toFixed(
        4
      )} from a weighted average of all four components.`
    },
    rule_outputs: [
      {
        rule_name: "value_present",
        score: normalized === null ? 0 : 1,
        passed: normalized !== null,
        details: `${path} has non-empty extracted value`,
        applicable: true
      },
      {
        rule_name: "field_context_correction",
        score: wasCorrected ? correction?.correction_confidence ?? fieldContextScore : fieldContextScore,
        passed: true,
        details: wasCorrected
          ? `Auto-corrected (${correction?.action ?? "replace"}) from "${correction?.original_value ?? ""}" to "${String(correction?.corrected_value ?? "")}".`
          : "No correction required by context model.",
        applicable: true
      },
      {
        rule_name: "cross_field_consistency",
        score: crossFieldScore,
        passed: crossFieldScore >= 0.6,
        details: sampledMeta.cross_field_consistency?.reason ?? "Cross-field checks sampled from fixture metadata.",
        applicable: true
      }
    ]
  };
}

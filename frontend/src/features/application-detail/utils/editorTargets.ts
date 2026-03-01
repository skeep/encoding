export type ScalarValue = string | number | boolean | null;

export type EditableField = {
  path: string;
  label: string;
  value: ScalarValue;
};

export type EditorTarget = {
  id: string;
  sectionKey: string;
  sectionLabel: string;
  itemLabel: string;
  isRepeatable: boolean;
  instanceId?: string;
  fields: EditableField[];
};

function flattenObjectFields(input: unknown, prefix = ""): EditableField[] {
  if (Array.isArray(input)) {
    return [];
  }
  if (input === null || typeof input !== "object") {
    return [];
  }
  const result: EditableField[] = [];
  Object.entries(input as Record<string, unknown>).forEach(([key, value]) => {
    const nextPath = prefix ? `${prefix}.${key}` : key;
    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      result.push({ path: nextPath, label: nextPath, value });
      return;
    }
    if (Array.isArray(value)) {
      return;
    }
    result.push(...flattenObjectFields(value, nextPath));
  });
  return result;
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function startsWithSectionLabel(itemLabel: string, sectionLabel: string): boolean {
  return itemLabel.toLowerCase().startsWith(sectionLabel.toLowerCase());
}

export function buildEditorTargets(input: unknown): EditorTarget[] {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return [];
  }

  const targets: EditorTarget[] = [];
  Object.entries(input as Record<string, unknown>).forEach(([sectionKey, sectionValue]) => {
    const sectionLabel = humanizeKey(sectionKey);
    if (Array.isArray(sectionValue)) {
      if (sectionValue.length === 0) {
        targets.push({
          id: `${sectionKey}::empty`,
          sectionKey,
          sectionLabel,
          itemLabel: `${sectionLabel} (0)`,
          isRepeatable: true,
          fields: []
        });
        return;
      }
      sectionValue.forEach((entry, index) => {
        const basePath = `${sectionKey}[${index}]`;
        let fields: EditableField[] = [];
        if (entry && typeof entry === "object" && !Array.isArray(entry)) {
          fields = flattenObjectFields(entry, "").map((field) => ({
            ...field,
            path: `${basePath}.${field.path}`,
            label: field.label
          }));
        } else {
          fields = [{ path: basePath, label: "value", value: entry as ScalarValue }];
        }
        targets.push({
          id: `${sectionKey}::${index}`,
          sectionKey,
          sectionLabel,
          itemLabel: `#${index + 1}`,
          isRepeatable: true,
          instanceId: `${sectionKey}_${index + 1}`,
          fields
        });
      });
      return;
    }

    if (sectionValue && typeof sectionValue === "object") {
      const fields = flattenObjectFields(sectionValue, "").map((field) => ({
        ...field,
        path: `${sectionKey}.${field.path}`,
        label: field.label
      }));
      targets.push({
        id: `${sectionKey}::single`,
        sectionKey,
        sectionLabel,
        itemLabel: sectionLabel,
        isRepeatable: false,
        fields
      });
      return;
    }

    targets.push({
      id: `${sectionKey}::single`,
      sectionKey,
      sectionLabel,
      itemLabel: sectionLabel,
      isRepeatable: false,
      fields: [{ path: sectionKey, label: sectionKey, value: sectionValue as ScalarValue }]
    });
  });

  return targets;
}

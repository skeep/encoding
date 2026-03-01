import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { ChangedRow } from "../types";
import type { EditorTarget } from "../utils/editorTargets";

export function useEncodingEditorState(
  selectedAppId: string | null,
  activeStatus: string,
  editorTargets: EditorTarget[]
): {
  editableValues: Record<string, string>;
  setEditableValues: Dispatch<SetStateAction<Record<string, string>>>;
  saveMessage: string;
  setSaveMessage: Dispatch<SetStateAction<string>>;
  selectedTargetId: string;
  setSelectedTargetId: Dispatch<SetStateAction<string>>;
  openMetaFieldPath: string | null;
  setOpenMetaFieldPath: Dispatch<SetStateAction<string | null>>;
  editorTab: "fields" | "changes";
  setEditorTab: Dispatch<SetStateAction<"fields" | "changes">>;
  baselineValues: Record<string, string>;
  changedRows: ChangedRow[];
  changedCount: number;
} {
  const [editableValues, setEditableValues] = useState<Record<string, string>>({});
  const [saveMessage, setSaveMessage] = useState<string>("");
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [openMetaFieldPath, setOpenMetaFieldPath] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState<"fields" | "changes">("fields");

  useEffect(() => {
    const initialValues: Record<string, string> = {};
    editorTargets.forEach((target) => {
      target.fields.forEach((field) => {
        initialValues[field.path] = field.value === null ? "" : String(field.value);
      });
    });
    setEditableValues(initialValues);
    setSaveMessage("");
    setOpenMetaFieldPath(null);
    setSelectedTargetId(editorTargets[0]?.id ?? "");
    setEditorTab("fields");
  }, [selectedAppId, activeStatus, editorTargets]);

  const baselineValues = useMemo(() => {
    return editorTargets.reduce<Record<string, string>>((acc, target) => {
      target.fields.forEach((field) => {
        acc[field.path] = field.value === null ? "" : String(field.value);
      });
      return acc;
    }, {});
  }, [editorTargets]);

  const changedFields = useMemo(() => {
    return Object.keys(editableValues).filter((path) => editableValues[path] !== baselineValues[path]);
  }, [editableValues, baselineValues]);

  const fieldLabelByPath = useMemo(() => {
    return editorTargets.reduce<Record<string, string>>((acc, target) => {
      target.fields.forEach((field) => {
        acc[field.path] = field.label;
      });
      return acc;
    }, {});
  }, [editorTargets]);

  const changedRows = useMemo<ChangedRow[]>(() => {
    return changedFields.map((path) => ({
      fieldPath: path,
      fieldLabel: fieldLabelByPath[path] ?? path,
      oldValue: baselineValues[path],
      newValue: editableValues[path]
    }));
  }, [changedFields, fieldLabelByPath, baselineValues, editableValues]);

  return {
    editableValues,
    setEditableValues,
    saveMessage,
    setSaveMessage,
    selectedTargetId,
    setSelectedTargetId,
    openMetaFieldPath,
    setOpenMetaFieldPath,
    editorTab,
    setEditorTab,
    baselineValues,
    changedRows,
    changedCount: changedRows.length
  };
}

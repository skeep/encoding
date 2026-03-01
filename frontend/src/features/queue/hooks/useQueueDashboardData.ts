import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { applicationApi } from "../../../api/applicationApi";
import { decisionApi } from "../../../api/decisionApi";
import { encodingApi } from "../../../api/encodingApi";
import type { PaginatedApplications, QueueStatus, QueueSummary } from "../../../api/types";
import { queueApi } from "../../../api/queueApi";
import type { DetailPanelState } from "../../application-detail/types";

const defaultPageSize = 10;

type QueueDashboardDataOptions = {
  pageSize?: number;
  pageSizeByStatus?: Partial<Record<QueueStatus, number>>;
};

export function useQueueDashboardData(
  activeStatus: QueueStatus,
  search: string,
  options?: QueueDashboardDataOptions
): {
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  selectedAppId: string | null;
  setSelectedAppId: Dispatch<SetStateAction<string | null>>;
  lastRefreshedAt: string;
  summary: QueueSummary[];
  applications: PaginatedApplications;
  tableLoading: boolean;
  tableError?: string;
  detailState: DetailPanelState;
  refreshSummary: () => Promise<void>;
  refreshApplications: () => Promise<void>;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  pageSize: number;
} {
  const effectivePageSize = useMemo(
    () => options?.pageSizeByStatus?.[activeStatus] ?? options?.pageSize ?? defaultPageSize,
    [activeStatus, options?.pageSize, options?.pageSizeByStatus]
  );
  const [page, setPage] = useState(1);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(new Date().toISOString());

  const [summary, setSummary] = useState<QueueSummary[]>([]);
  const [applications, setApplications] = useState<PaginatedApplications>({
    items: [],
    page: 1,
    size: effectivePageSize,
    total: 0
  });
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState<string | undefined>();
  const [detailState, setDetailState] = useState<DetailPanelState>({
    loading: false
  });

  useEffect(() => {
    void refreshSummary();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeStatus, search, effectivePageSize]);

  useEffect(() => {
    void refreshApplications();
  }, [activeStatus, search, page, effectivePageSize]);

  useEffect(() => {
    if (!selectedAppId) {
      setDetailState({ loading: false });
      return;
    }
    void fetchDetail(selectedAppId, activeStatus);
  }, [selectedAppId, activeStatus]);

  async function refreshSummary(): Promise<void> {
    const next = await queueApi.getQueueSummary();
    setSummary(next);
    setLastRefreshedAt(new Date().toISOString());
  }

  async function refreshApplications(): Promise<void> {
    setTableLoading(true);
    setTableError(undefined);
    try {
      const response = await queueApi.getApplications({
        status: activeStatus,
        q: search,
        page,
        size: effectivePageSize
      });
      setApplications(response);
      if (response.items.length === 0) {
        setSelectedAppId(null);
        return;
      }
      if (!selectedAppId || !response.items.some((item) => item.applicationId === selectedAppId)) {
        setSelectedAppId(response.items[0].applicationId);
      }
    } catch (error) {
      setTableError(error instanceof Error ? error.message : "Unable to load queue data");
    } finally {
      setTableLoading(false);
    }
  }

  async function fetchDetail(applicationId: string, status: QueueStatus): Promise<void> {
    setDetailState({ loading: true });
    try {
      const detail = await applicationApi.getApplicationById(applicationId);
      if (status === "ENCODING_COMPLETED") {
        const encoding = await encodingApi.getEncodingView(applicationId);
        setDetailState({ detail, encoding, loading: false });
        return;
      }
      if (status === "DECISION_COMPLETED") {
        const decision = await decisionApi.getDecisionView(applicationId);
        setDetailState({ detail, decision, loading: false });
        return;
      }
      setDetailState({ detail, loading: false });
    } catch (error) {
      setDetailState({
        loading: false,
        error: error instanceof Error ? error.message : "Unable to load application details"
      });
    }
  }

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(applications.total / effectivePageSize)),
    [applications.total, effectivePageSize]
  );
  const pageStart = useMemo(
    () => (applications.total === 0 ? 0 : (page - 1) * effectivePageSize + 1),
    [applications.total, effectivePageSize, page]
  );
  const pageEnd = useMemo(
    () => Math.min(page * effectivePageSize, applications.total),
    [applications.total, effectivePageSize, page]
  );

  return {
    page,
    setPage,
    selectedAppId,
    setSelectedAppId,
    lastRefreshedAt,
    summary,
    applications,
    tableLoading,
    tableError,
    detailState,
    refreshSummary,
    refreshApplications,
    totalPages,
    pageStart,
    pageEnd,
    pageSize: effectivePageSize
  };
}

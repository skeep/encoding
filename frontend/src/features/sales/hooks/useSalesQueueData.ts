import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { applicationApi } from "../../../api/applicationApi";
import type { PaginatedSalesApplications, SalesDashboardSnapshot } from "../../../api/types";
import { salesApi } from "../../../api/salesApi";
import type { SalesDetailPanelState } from "../types";

const defaultPageSize = 10;

export function useSalesQueueData(
  search: string,
  dateFrom: string | null,
  dateTo: string | null,
  pageSizeOverride?: number
): {
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  selectedAppId: string | null;
  setSelectedAppId: Dispatch<SetStateAction<string | null>>;
  dashboardSnapshot: SalesDashboardSnapshot | null;
  snapshotLoading: boolean;
  snapshotError?: string;
  applications: PaginatedSalesApplications;
  tableLoading: boolean;
  tableError?: string;
  detailState: SalesDetailPanelState;
  refreshDashboard: () => Promise<void>;
  refreshApplications: () => Promise<void>;
  refreshDetail: () => Promise<void>;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  pageSize: number;
} {
  const effectivePageSize = pageSizeOverride ?? defaultPageSize;
  const [page, setPage] = useState(1);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const [dashboardSnapshot, setDashboardSnapshot] = useState<SalesDashboardSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | undefined>();

  const [applications, setApplications] = useState<PaginatedSalesApplications>({
    items: [],
    page: 1,
    size: effectivePageSize,
    total: 0
  });
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState<string | undefined>();

  const [detailState, setDetailState] = useState<SalesDetailPanelState>({
    loading: false
  });

  const refreshDashboard = useCallback(async (): Promise<void> => {
    setSnapshotLoading(true);
    setSnapshotError(undefined);
    try {
      const next = await salesApi.getSalesDashboard({
        q: search,
        dateFrom,
        dateTo
      });
      setDashboardSnapshot(next);
    } catch (error) {
      setSnapshotError(error instanceof Error ? error.message : "Unable to load dashboard metrics");
    } finally {
      setSnapshotLoading(false);
    }
  }, [search, dateFrom, dateTo]);

  const refreshApplications = useCallback(async (): Promise<void> => {
    setTableLoading(true);
    setTableError(undefined);
    try {
      const response = await salesApi.getSalesApplications({
        q: search,
        page,
        size: effectivePageSize,
        dateFrom,
        dateTo
      });
      setApplications(response);
      if (response.items.length === 0) {
        setSelectedAppId(null);
        return;
      }
      setSelectedAppId((prev) => {
        if (!prev || !response.items.some((item) => item.applicationId === prev)) {
          return response.items[0].applicationId;
        }
        return prev;
      });
    } catch (error) {
      setTableError(error instanceof Error ? error.message : "Unable to load sales queue");
    } finally {
      setTableLoading(false);
    }
  }, [search, page, effectivePageSize, dateFrom, dateTo]);

  const fetchDetail = useCallback(async (applicationId: string): Promise<void> => {
    setDetailState({ loading: true });
    try {
      const [detail, tasks] = await Promise.all([
        applicationApi.getApplicationById(applicationId),
        salesApi.getSalesTasks(applicationId)
      ]);
      setDetailState({ detail, tasks, loading: false });
    } catch (error) {
      setDetailState({
        loading: false,
        error: error instanceof Error ? error.message : "Unable to load application details"
      });
    }
  }, []);

  const refreshDetail = useCallback(async (): Promise<void> => {
    if (!selectedAppId) {
      setDetailState({ loading: false });
      return;
    }
    await fetchDetail(selectedAppId);
  }, [fetchDetail, selectedAppId]);

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, effectivePageSize]);

  useEffect(() => {
    void refreshApplications();
  }, [refreshApplications]);

  useEffect(() => {
    if (!selectedAppId) {
      setDetailState({ loading: false });
      return;
    }
    void fetchDetail(selectedAppId);
  }, [selectedAppId, fetchDetail]);

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
    dashboardSnapshot,
    snapshotLoading,
    snapshotError,
    applications,
    tableLoading,
    tableError,
    detailState,
    refreshDashboard,
    refreshApplications,
    refreshDetail,
    totalPages,
    pageStart,
    pageEnd,
    pageSize: effectivePageSize
  };
}

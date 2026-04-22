import type {
  ApplicationDetail,
  ApplicationStatus,
  ApplicationSummary,
  DecisionView,
  EncodingView,
  PaginatedApplications,
  PaginatedSalesApplications,
  QueueStatus,
  QueueSummary,
  SalesDashboardSnapshot,
  SalesPendingTask,
  SalesQueueRow,
  SalesSupplementPayload,
  TimelineEvent
} from "../api/types";
import applicationsFixture from "./fixtures/applications.json";
import applicationDetailsFixture from "./fixtures/applicationDetails.json";
import decisionViewsFixture from "./fixtures/decisionViews.json";
import encodingViewsFixture from "./fixtures/encodingViews.json";
import queueSummaryFixture from "./fixtures/queueSummary.json";
import salesTasksFixture from "./fixtures/salesTasks.json";
import timelineFixture from "./fixtures/timeline.json";

const applications = applicationsFixture as unknown as ApplicationSummary[];
const queueSummary = queueSummaryFixture as unknown as QueueSummary[];
const applicationDetails = applicationDetailsFixture as unknown as ApplicationDetail[];
const encodingViews = encodingViewsFixture as unknown as EncodingView[];
const decisionViews = decisionViewsFixture as unknown as DecisionView[];
const timelineEvents = timelineFixture as unknown as TimelineEvent[];

type SalesTaskMap = Record<string, SalesPendingTask[]>;

function cloneSalesTasks(): SalesTaskMap {
  return JSON.parse(JSON.stringify(salesTasksFixture)) as SalesTaskMap;
}

let salesTasksRuntime: SalesTaskMap = cloneSalesTasks();

const supplementFieldsByApp = new Map<string, Record<string, string>>();

/** Restores mutable sales-task state (used by tests). */
export function resetSalesFixturesForTests(): void {
  salesTasksRuntime = cloneSalesTasks();
  supplementFieldsByApp.clear();
}

function mergeSalesIntoDetail(detail: ApplicationDetail, applicationId: string): ApplicationDetail {
  const supplement = supplementFieldsByApp.get(applicationId);
  if (!supplement || Object.keys(supplement).length === 0) {
    return detail;
  }
  const metadata = { ...detail.metadata };
  for (const [key, value] of Object.entries(supplement)) {
    metadata[`sales.${key}`] = value;
  }
  return { ...detail, metadata };
}

function isOpenForSales(item: ApplicationSummary): boolean {
  return item.status !== "LOAN_DISBURSED";
}

function withinDateRange(
  isoReceived: string,
  dateFrom: string | null | undefined,
  dateTo: string | null | undefined
): boolean {
  const t = new Date(isoReceived).getTime();
  if (dateFrom) {
    const start = new Date(`${dateFrom}T00:00:00.000Z`).getTime();
    if (t < start) {
      return false;
    }
  }
  if (dateTo) {
    const end = new Date(`${dateTo}T23:59:59.999Z`).getTime();
    if (t > end) {
      return false;
    }
  }
  return true;
}

function matchesSearch(item: ApplicationSummary, term: string): boolean {
  if (!term) {
    return true;
  }
  return (
    item.applicationId.toLowerCase().includes(term) ||
    item.applicantName.toLowerCase().includes(term) ||
    item.product.toLowerCase().includes(term) ||
    item.dealerEmailFrom.toLowerCase().includes(term) ||
    item.loanType.toLowerCase().includes(term)
  );
}

function filterSalesSource(params: {
  q?: string;
  dateFrom?: string | null;
  dateTo?: string | null;
}): ApplicationSummary[] {
  const term = (params.q ?? "").toLowerCase();
  return applications.filter((item) => {
    if (!isOpenForSales(item)) {
      return false;
    }
    if (!withinDateRange(item.receivedAt, params.dateFrom ?? null, params.dateTo ?? null)) {
      return false;
    }
    return matchesSearch(item, term);
  });
}

function getPendingTaskCount(applicationId: string): number {
  return salesTasksRuntime[applicationId]?.length ?? 0;
}

function sortSalesRows(rows: SalesQueueRow[]): SalesQueueRow[] {
  return [...rows].sort((left, right) => {
    const lp = left.pendingTaskCount > 0 ? 1 : 0;
    const rp = right.pendingTaskCount > 0 ? 1 : 0;
    if (lp !== rp) {
      return rp - lp;
    }
    if (right.slaAgeMinutes !== left.slaAgeMinutes) {
      return right.slaAgeMinutes - left.slaAgeMinutes;
    }
    return left.applicationId.localeCompare(right.applicationId);
  });
}

function buildSalesDashboardSnapshot(
  filtered: ApplicationSummary[],
  dateFrom: string | null,
  dateTo: string | null
): SalesDashboardSnapshot {
  const byStatusMap = new Map<ApplicationStatus, number>();
  const byDealerMap = new Map<string, { count: number; byStatus: Partial<Record<ApplicationStatus, number>> }>();

  for (const item of filtered) {
    byStatusMap.set(item.status, (byStatusMap.get(item.status) ?? 0) + 1);
    const dealer = item.dealerEmailFrom;
    const row = byDealerMap.get(dealer) ?? { count: 0, byStatus: {} };
    row.count += 1;
    row.byStatus[item.status] = (row.byStatus[item.status] ?? 0) + 1;
    byDealerMap.set(dealer, row);
  }

  const byStatus = Array.from(byStatusMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((left, right) => left.status.localeCompare(right.status));

  const byDealer = Array.from(byDealerMap.entries())
    .map(([dealerEmail, data]) => ({
      dealerEmail,
      count: data.count,
      byStatus: data.byStatus
    }))
    .sort((left, right) => right.count - left.count);

  return {
    dateFrom,
    dateTo,
    distinctDealerCount: byDealerMap.size,
    totalOpenApplications: filtered.length,
    byStatus,
    byDealer
  };
}

function paginate<T>(items: T[], page: number, size: number): { items: T[]; total: number } {
  const safePage = Math.max(page, 1);
  const safeSize = Math.max(size, 1);
  const start = (safePage - 1) * safeSize;
  return {
    items: items.slice(start, start + safeSize),
    total: items.length
  };
}

export const mockHandlers = {
  getQueueSummary(): QueueSummary[] {
    return queueSummary;
  },
  getApplications(params: {
    status: QueueStatus;
    q?: string;
    page?: number;
    size?: number;
  }): PaginatedApplications {
    const { status, q, page = 1, size = 10 } = params;
    const term = (q ?? "").toLowerCase();
    const filtered = applications.filter((item) => {
      if (status === "INTAKE_IN_PROGRESS") {
        if (
          item.status !== "EMAIL_RECEIVED" &&
          item.status !== "ENCODING_IN_PROGRESS" &&
          item.status !== "DOCUMENT_REQUESTED"
        ) {
          return false;
        }
      } else if (item.status !== status) {
        return false;
      }
      if (!term) {
        return true;
      }
      return (
        item.applicationId.toLowerCase().includes(term) ||
        item.applicantName.toLowerCase().includes(term) ||
        item.product.toLowerCase().includes(term) ||
        item.dealerEmailFrom.toLowerCase().includes(term) ||
        item.loanType.toLowerCase().includes(term)
      );
    });
    const pageResult = paginate(filtered, page, size);
    return {
      items: pageResult.items,
      page,
      size,
      total: pageResult.total
    };
  },
  getSalesApplications(params: {
    q?: string;
    page?: number;
    size?: number;
    dateFrom?: string | null;
    dateTo?: string | null;
  }): PaginatedSalesApplications {
    const { q, page = 1, size = 10, dateFrom, dateTo } = params;
    const filtered = filterSalesSource({ q, dateFrom, dateTo });
    const rows: SalesQueueRow[] = sortSalesRows(
      filtered.map((item) => ({
        ...item,
        pendingTaskCount: getPendingTaskCount(item.applicationId)
      }))
    );
    const pageResult = paginate(rows, page, size);
    return {
      items: pageResult.items,
      page,
      size,
      total: pageResult.total
    };
  },
  getSalesDashboard(params: {
    q?: string;
    dateFrom?: string | null;
    dateTo?: string | null;
  }): SalesDashboardSnapshot {
    const filtered = filterSalesSource(params);
    return buildSalesDashboardSnapshot(filtered, params.dateFrom ?? null, params.dateTo ?? null);
  },
  getSalesTasks(applicationId: string): SalesPendingTask[] {
    return [...(salesTasksRuntime[applicationId] ?? [])];
  },
  submitSalesSupplement(applicationId: string, params: { taskId: string; payload: SalesSupplementPayload }): void {
    const list = salesTasksRuntime[applicationId];
    if (!list || list.length === 0) {
      throw new Error("No pending sales tasks for application");
    }
    const idx = list.findIndex((task) => task.id === params.taskId);
    if (idx === -1) {
      throw new Error("Sales task not found");
    }
    list.splice(idx, 1);
    if (list.length === 0) {
      delete salesTasksRuntime[applicationId];
    }
    const prev = supplementFieldsByApp.get(applicationId) ?? {};
    supplementFieldsByApp.set(applicationId, { ...prev, ...params.payload });
  },
  getApplicationById(applicationId: string): ApplicationDetail {
    const detail = applicationDetails.find((item) => item.applicationId === applicationId);
    if (detail) {
      return mergeSalesIntoDetail(detail, applicationId);
    }
    const summary = applications.find((item) => item.applicationId === applicationId);
    if (!summary) {
      throw new Error("Application detail not found");
    }
    const fallbackTypes = [
      { ext: "pdf", mimeType: "application/pdf" },
      { ext: "jpg", mimeType: "image/jpeg" },
      {
        ext: "docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      },
      {
        ext: "xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }
    ];
    const built: ApplicationDetail = {
      applicationId: summary.applicationId,
      status: summary.status,
      applicantName: summary.applicantName,
      receivedAt: summary.receivedAt,
      updatedAt: summary.lastUpdatedAt,
      emailSubject: `${summary.product} application package`,
      emailFrom: summary.dealerEmailFrom,
      attachments: Array.from({ length: summary.documentCount }, (_, index) => {
        const fileType = fallbackTypes[index % fallbackTypes.length];
        return {
          name: `attachment_${index + 1}.${fileType.ext}`,
          mimeType: fileType.mimeType,
          sizeKb: 420 + index * 35
        };
      }),
      metadata: {
        channel: "EMAIL",
        branchCode: "PH-00",
        assignedQueue: summary.status
      }
    };
    return mergeSalesIntoDetail(built, applicationId);
  },
  getEncodingView(applicationId: string): EncodingView {
    const detail = encodingViews.find((item) => item.applicationId === applicationId);
    if (!detail) {
      throw new Error("Encoding view not found");
    }
    return detail;
  },
  getDecisionView(applicationId: string): DecisionView {
    const detail = decisionViews.find((item) => item.applicationId === applicationId);
    if (!detail) {
      throw new Error("Decision view not found");
    }
    return detail;
  },
  getTimeline(_applicationId: string): TimelineEvent[] {
    return timelineEvents;
  }
};

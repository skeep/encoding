import type {
  ApplicationDetail,
  ApplicationSummary,
  DecisionView,
  EncodingView,
  PaginatedApplications,
  QueueStatus,
  QueueSummary,
  TimelineEvent
} from "../api/types";
import applicationsFixture from "./fixtures/applications.json";
import applicationDetailsFixture from "./fixtures/applicationDetails.json";
import decisionViewsFixture from "./fixtures/decisionViews.json";
import encodingViewsFixture from "./fixtures/encodingViews.json";
import queueSummaryFixture from "./fixtures/queueSummary.json";
import timelineFixture from "./fixtures/timeline.json";

const applications = applicationsFixture as unknown as ApplicationSummary[];
const queueSummary = queueSummaryFixture as unknown as QueueSummary[];
const applicationDetails = applicationDetailsFixture as unknown as ApplicationDetail[];
const encodingViews = encodingViewsFixture as unknown as EncodingView[];
const decisionViews = decisionViewsFixture as unknown as DecisionView[];
const timelineEvents = timelineFixture as unknown as TimelineEvent[];

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
        if (item.status !== "EMAIL_RECEIVED" && item.status !== "ENCODING_IN_PROGRESS") {
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
        item.dealerEmailFrom.toLowerCase().includes(term)
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
  getApplicationById(applicationId: string): ApplicationDetail {
    const detail = applicationDetails.find((item) => item.applicationId === applicationId);
    if (detail) {
      return detail;
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
    return {
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

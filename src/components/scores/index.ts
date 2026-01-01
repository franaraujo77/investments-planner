/**
 * Scores Components Barrel Export
 *
 * Story 4.6: Historical Surplus Scoring
 *
 * Components for displaying score-related information:
 * - SurplusScoreDetail: Detailed surplus scoring breakdown
 * - IncompleteDataNotice: Warning for missing dividend data
 */

export {
  SurplusScoreDetail,
  getSurplusStatus,
  type SurplusScoreDetailProps,
  type SurplusDisplayMode,
  type SurplusStatus,
} from "./surplus-score-detail";
export {
  IncompleteDataNotice,
  shouldShowIncompleteDataNotice,
  type IncompleteDataNoticeProps,
  type IncompleteDataDisplayMode,
} from "./incomplete-data-notice";

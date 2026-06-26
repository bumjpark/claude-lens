// MongoDB interaction_log 컬렉션 스키마 정의
// 실제 MongoDB는 스키마 없이 저장되지만 구조 문서화용

/**
 * interaction_logs collection
 * {
 *   _id: ObjectId,
 *   project_id: UUID,
 *   task_id: UUID (nullable),
 *   prompt_text: String,
 *   response_text: String,
 *   request_count: Number,
 *   is_retry: Boolean,
 *   is_code_request: Boolean,
 *   is_error_request: Boolean,
 *   is_review_request: Boolean,
 *   is_design_request: Boolean,
 *   response_time_ms: Number,
 *   requested_at: Date
 * }
 */

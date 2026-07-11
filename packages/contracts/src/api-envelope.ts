/**
 * Every MixoraOne API endpoint responds with this envelope so clients can
 * handle success and failure uniformly and correlate responses via requestId.
 */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiSuccessResponse<TData> {
  success: true;
  data: TData;
  requestId: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
  requestId: string;
}

export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse;

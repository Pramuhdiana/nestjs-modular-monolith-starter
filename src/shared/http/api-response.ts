export type ApiMeta = {
  at: string;
  requestId: string | null;
};

export type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
  meta: ApiMeta;
};

export type ApiFailure = {
  success: false;
  message: string;
  data: null;
  error: {
    statusCode: number;
    code?: string;
    details?: unknown;
  };
  meta: ApiMeta;
};

export function successResponse<T>(params: {
  data: T;
  requestId: string | null;
  message?: string;
}): ApiSuccess<T> {
  return {
    success: true,
    message: params.message ?? 'Request berhasil diproses.',
    data: params.data,
    meta: {
      at: new Date().toISOString(),
      requestId: params.requestId,
    },
  };
}

export function errorResponse(params: {
  statusCode: number;
  requestId: string | null;
  message: string;
  code?: string;
  details?: unknown;
}): ApiFailure {
  return {
    success: false,
    message: params.message,
    data: null,
    error: {
      statusCode: params.statusCode,
      code: params.code,
      details: params.details,
    },
    meta: {
      at: new Date().toISOString(),
      requestId: params.requestId,
    },
  };
}

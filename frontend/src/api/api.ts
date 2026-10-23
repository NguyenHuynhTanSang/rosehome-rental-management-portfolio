import {
  clearAuth,
  getAccessToken,
} from "../auth";


export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim()
  || "http://127.0.0.1:8000";


function buildHeaders(
  includeJson = false
): HeadersInit {

  const headers:
    Record<string, string> = {};


  if (includeJson) {
    headers["Content-Type"] =
      "application/json";
  }


  const token =
    getAccessToken();


  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }


  return headers;
}


// ==============================
// XỬ LÝ 401
// ==============================

function handleUnauthorized(
  path: string,
  response: Response
) {

  if (
    response.status === 401
    &&
    path !== "/auth/login"
  ) {

    clearAuth();


    if (
      window.location.pathname
      !== "/login"
    ) {

      window.location.replace(
        "/login"
      );

    }

  }

}


// ==============================
// ERROR MESSAGE
// ==============================

async function getErrorMessage(
  response: Response
) {

  let message =
    `API request failed: ${response.status}`;


  try {

    const errorData =
      await response.json();


    if (errorData.detail) {

      message =
        typeof errorData.detail
        === "string"
          ? errorData.detail
          : JSON.stringify(
              errorData.detail
            );

    }

  } catch {
    // Không có JSON
  }


  return message;
}


// ==============================
// GET
// ==============================

export async function apiGet<T>(
  path: string
): Promise<T> {

  const response =
    await fetch(
      `${API_BASE_URL}${path}`,
      {
        headers:
          buildHeaders(),
      }
    );


  handleUnauthorized(
    path,
    response
  );


  if (!response.ok) {

    throw new Error(
      await getErrorMessage(
        response
      )
    );

  }


  return response.json();
}


// ==============================
// GET OPTIONAL
// ==============================

export async function apiGetOptional<T>(
  path: string
): Promise<T | null> {

  const response =
    await fetch(
      `${API_BASE_URL}${path}`,
      {
        headers:
          buildHeaders(),
      }
    );


  handleUnauthorized(
    path,
    response
  );


  if (
    response.status === 404
  ) {
    return null;
  }


  if (!response.ok) {

    throw new Error(
      await getErrorMessage(
        response
      )
    );

  }


  return response.json();
}


// ==============================
// POST JSON
// ==============================

export async function apiPost<
  TResponse,
  TBody
>(
  path: string,
  body: TBody
): Promise<TResponse> {

  const response =
    await fetch(
      `${API_BASE_URL}${path}`,
      {
        method: "POST",

        headers:
          buildHeaders(true),

        body:
          JSON.stringify(body),
      }
    );


  handleUnauthorized(
    path,
    response
  );


  if (!response.ok) {

    throw new Error(
      await getErrorMessage(
        response
      )
    );

  }


  if (
    response.status === 204
  ) {
    return undefined as TResponse;
  }


  return response.json();
}


// ==============================
// POST FORM DATA / FILE
// ==============================

export async function apiPostFormData<
  TResponse
>(
  path: string,
  formData: FormData
): Promise<TResponse> {

  const response =
    await fetch(
      `${API_BASE_URL}${path}`,
      {
        method: "POST",

        headers:
          buildHeaders(),

        body:
          formData,
      }
    );


  handleUnauthorized(
    path,
    response
  );


  if (!response.ok) {

    throw new Error(
      await getErrorMessage(
        response
      )
    );

  }


  if (
    response.status === 204
  ) {
    return undefined as TResponse;
  }


  return response.json();
}


// ==============================
// POST NO BODY
// ==============================

export async function apiPostNoBody<
  TResponse
>(
  path: string
): Promise<TResponse> {

  const response =
    await fetch(
      `${API_BASE_URL}${path}`,
      {
        method: "POST",

        headers:
          buildHeaders(),
      }
    );


  handleUnauthorized(
    path,
    response
  );


  if (!response.ok) {

    throw new Error(
      await getErrorMessage(
        response
      )
    );

  }


  if (
    response.status === 204
  ) {
    return undefined as TResponse;
  }


  return response.json();
}


// ==============================
// PATCH
// ==============================

export async function apiPatch<
  TResponse,
  TBody
>(
  path: string,
  body: TBody
): Promise<TResponse> {

  const response =
    await fetch(
      `${API_BASE_URL}${path}`,
      {
        method: "PATCH",

        headers:
          buildHeaders(true),

        body:
          JSON.stringify(body),
      }
    );


  handleUnauthorized(
    path,
    response
  );


  if (!response.ok) {

    throw new Error(
      await getErrorMessage(
        response
      )
    );

  }


  if (
    response.status === 204
  ) {
    return undefined as TResponse;
  }


  return response.json();
}


// ==============================
// PATCH NO BODY
// ==============================

export async function apiPatchNoBody<
  TResponse
>(
  path: string
): Promise<TResponse> {

  const response =
    await fetch(
      `${API_BASE_URL}${path}`,
      {
        method: "PATCH",

        headers:
          buildHeaders(),
      }
    );


  handleUnauthorized(
    path,
    response
  );


  if (!response.ok) {

    throw new Error(
      await getErrorMessage(
        response
      )
    );

  }


  if (
    response.status === 204
  ) {
    return undefined as TResponse;
  }


  return response.json();
}

// ==============================
// PUT
// ==============================

export async function apiPut<
  TResponse,
  TBody
>(
  path: string,
  body: TBody
): Promise<TResponse> {

  const response =
    await fetch(
      `${API_BASE_URL}${path}`,
      {
        method: "PUT",

        headers:
          buildHeaders(true),

        body:
          JSON.stringify(body),
      }
    );


  handleUnauthorized(
    path,
    response
  );


  if (!response.ok) {

    throw new Error(
      await getErrorMessage(
        response
      )
    );

  }


  if (
    response.status === 204
  ) {

    return undefined as TResponse;

  }


  return response.json();

}


// ==============================
// DELETE
// ==============================

export async function apiDelete<
  TResponse
>(
  path: string
): Promise<TResponse> {

  const response =
    await fetch(
      `${API_BASE_URL}${path}`,
      {
        method: "DELETE",

        headers:
          buildHeaders(),
      }
    );


  handleUnauthorized(
    path,
    response
  );


  if (!response.ok) {

    throw new Error(
      await getErrorMessage(
        response
      )
    );

  }


  if (
    response.status === 204
  ) {
    return undefined as TResponse;
  }


  return response.json();
}

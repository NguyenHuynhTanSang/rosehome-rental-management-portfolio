export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim()
  || "http://127.0.0.1:8000";


async function getErrorMessage(
  response: Response
) {

  let message =
    `API request failed: ${response.status}`;


  try {

    const data =
      await response.json();


    if (data.detail) {

      message =
        typeof data.detail === "string"
          ? data.detail
          : JSON.stringify(
              data.detail
            );

    }

  } catch {
    // Response không có JSON.
  }


  return message;

}


export async function publicApiGet<T>(
  path: string
): Promise<T> {

  const response =
    await fetch(
      `${API_BASE_URL}${path}`
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
import type {
  AuthUser,
} from "./types/auth";


const TOKEN_KEY =
  "rental_access_token";

const USER_KEY =
  "rental_user";


export function saveAuth(
  token: string,
  user: AuthUser
) {
  localStorage.setItem(
    TOKEN_KEY,
    token
  );

  localStorage.setItem(
    USER_KEY,
    JSON.stringify(user)
  );
}


export function getAccessToken() {
  return localStorage.getItem(
    TOKEN_KEY
  );
}


export function getStoredUser():
  AuthUser | null {

  const raw =
    localStorage.getItem(
      USER_KEY
    );


  if (!raw) {
    return null;
  }


  try {
    return JSON.parse(
      raw
    ) as AuthUser;
  } catch {
    return null;
  }
}


export function clearAuth() {
  localStorage.removeItem(
    TOKEN_KEY
  );

  localStorage.removeItem(
    USER_KEY
  );
}


export function isLoggedIn() {
  return Boolean(
    getAccessToken()
  );
}
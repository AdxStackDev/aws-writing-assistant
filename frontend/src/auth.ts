import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
} from "amazon-cognito-identity-js";

const pool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
});

export function register(
  email: string,
  password: string
): Promise<unknown> {

  return new Promise((resolve, reject) => {

    pool.signUp(
      email,
      password,
      [],
      [],
      (error, result) => {

        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );
  });
}


export function confirmRegistration(
  email: string,
  code: string
): Promise<string> {

  return new Promise((resolve, reject) => {

    const user = new CognitoUser({
      Username: email,
      Pool: pool,
    });

    user.confirmRegistration(
      code,
      true,
      (error) => {

        if (error) {
          reject(error);
          return;
        }

        resolve("Account verified");
      }
    );
  });
}


export function login(
  email: string,
  password: string
): Promise<string> {

  return new Promise((resolve, reject) => {

    const authenticationDetails =
      new AuthenticationDetails({
        Username: email,
        Password: password,
      });

    const user = new CognitoUser({
      Username: email,
      Pool: pool,
    });

    user.authenticateUser(
      authenticationDetails,
      {
        onSuccess: () => {
          resolve("Login successful");
        },

        onFailure: (error) => {
          reject(error);
        },
      }
    );
  });
}


export function logout(): void {
  const user = pool.getCurrentUser();

  if (user) {
    user.signOut();
  }
}


export function getCurrentUser(): CognitoUser | null {
  return pool.getCurrentUser();
}


export async function getAccessToken(): Promise<string> {

  const user = pool.getCurrentUser();

  if (!user) {
    throw new Error("User is not authenticated");
  }

  return new Promise((resolve, reject) => {

    user.getSession((error: Error | null, session: any) => {

      if (error) {
        reject(error);
        return;
      }

      resolve(
        session.getIdToken().getJwtToken()
      );
    });
  });
}
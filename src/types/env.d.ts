declare namespace NodeJS {
  type ProcessEnv = {
    EXPO_PUBLIC_OPENAI_API_KEY?: string;
    EXPO_PUBLIC_GOOGLE_CLIENT_ID?: string;
    [key: string]: string | undefined;
  };
}

declare const process: {
  env: NodeJS.ProcessEnv;
};

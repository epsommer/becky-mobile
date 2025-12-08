import Constants from "expo-constants";

export function getClientsApiUrl() {
  const envUrl = process.env.BECKY_API_URL || (global as any).BECKY_API_URL;
  if (envUrl) return `${envUrl.replace(/\/+$/, "")}/api/clients?limit=9`;

  const manifestUrl =
    (Constants.expoConfig?.extra?.backendUrl || Constants.manifest?.extra?.backendUrl) ??
    (Constants.manifest?.packagerOpts?.hostUri
      ? `http://${Constants.manifest.packagerOpts.hostUri.split(":")[0]}:3000`
      : null);

  if (manifestUrl) {
    return `${manifestUrl.replace(/\/+$/, "")}/api/clients?limit=9`;
  }

  return "https://evangelosommer.com/api/clients?limit=9";
}

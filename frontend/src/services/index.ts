// Global services placeholders (e.g. analytics, token managers)
export const TokenManager = {
  setToken: (token: string) => localStorage.setItem("token", token),
  getToken: () => localStorage.getItem("token"),
  clearToken: () => localStorage.removeItem("token")
};

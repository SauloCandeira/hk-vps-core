export const withMeta = <T extends object>(payload: T) => ({
  ...payload,
  last_updated: new Date().toISOString(),
});

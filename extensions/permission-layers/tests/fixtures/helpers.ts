/** Mock the only settings API used by the session-command extension. */
export const getSettingsMock = () => ({
  loadPermissionConfig: () => ({}),
  loadGlobalCommandApprovals: () => [],
  saveGlobalCommandApprovals: () => {},
});

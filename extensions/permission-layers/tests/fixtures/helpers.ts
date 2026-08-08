/** Mock the only settings API used by the session-command extension. */
export const getSettingsMock = () => ({
  loadPermissionConfig: () => ({}),
  loadCommandSafetyConfig: () => ({
    provider: "opencode-go",
    model: "deepseek-v4-flash",
    autoApproveScore: 70,
  }),
  loadGlobalCommandApprovals: () => [],
  saveGlobalCommandApprovals: () => {},
});

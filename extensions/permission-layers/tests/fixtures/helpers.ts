/** Mock the only settings API used by the session-command extension. */
export const getSettingsMock = () => ({
  loadPermissionConfig: () => ({}),
  loadCommandSafetyConfig: () => ({
    provider: "nvidia",
    model: "meta/llama-3.1-8b-instruct",
    autoApproveScore: 70,
  }),
  loadGlobalCommandApprovals: () => [],
  saveGlobalCommandApprovals: () => {},
});

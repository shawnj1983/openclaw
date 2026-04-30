import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockFindExistingGatewayProcess,
  mockLoadGatewayReloadPolicy,
  mockLoadOrCreateDeviceIdentity,
  mockRunGatewayStartupSequence,
} = vi.hoisted(() => ({
  mockFindExistingGatewayProcess: vi.fn(),
  mockLoadGatewayReloadPolicy: vi.fn(),
  mockLoadOrCreateDeviceIdentity: vi.fn(),
  mockRunGatewayStartupSequence: vi.fn(),
}));

vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp',
    isPackaged: false,
  },
  utilityProcess: {
    fork: vi.fn(),
  },
}));

vi.mock('@electron/gateway/reload-policy', async () => {
  const actual = await vi.importActual<typeof import('@electron/gateway/reload-policy')>(
    '@electron/gateway/reload-policy',
  );
  return {
    ...actual,
    loadGatewayReloadPolicy: (...args: unknown[]) => mockLoadGatewayReloadPolicy(...args),
  };
});

vi.mock('@electron/gateway/startup-orchestrator', async () => {
  const actual = await vi.importActual<typeof import('@electron/gateway/startup-orchestrator')>(
    '@electron/gateway/startup-orchestrator',
  );
  return {
    ...actual,
    runGatewayStartupSequence: (...args: unknown[]) => mockRunGatewayStartupSequence(...args),
  };
});

vi.mock('@electron/gateway/supervisor', async () => {
  const actual = await vi.importActual<typeof import('@electron/gateway/supervisor')>(
    '@electron/gateway/supervisor',
  );
  return {
    ...actual,
    findExistingGatewayProcess: (...args: unknown[]) => mockFindExistingGatewayProcess(...args),
    runOpenClawDoctorRepair: vi.fn().mockResolvedValue(false),
    terminateOwnedGatewayProcess: vi.fn(),
    unloadLaunchctlGatewayService: vi.fn(),
    waitForPortFree: vi.fn().mockResolvedValue(true),
    warmupManagedPythonReadiness: vi.fn(),
  };
});

vi.mock('@electron/utils/device-identity', async () => {
  const actual = await vi.importActual<typeof import('@electron/utils/device-identity')>(
    '@electron/utils/device-identity',
  );
  return {
    ...actual,
    loadOrCreateDeviceIdentity: (...args: unknown[]) => mockLoadOrCreateDeviceIdentity(...args),
  };
});

describe('GatewayManager start', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockFindExistingGatewayProcess.mockResolvedValue(null);
    mockLoadGatewayReloadPolicy.mockResolvedValue({ mode: 'restart', debounceMs: 2000 });
    mockLoadOrCreateDeviceIdentity.mockResolvedValue({
      deviceId: 'device-1',
      publicKeyPem: 'public',
      privateKeyPem: 'private',
    });
  });

  it('re-checks existing gateway state with the current owned pid during startup retries', async () => {
    const { GatewayManager } = await import('@electron/gateway/manager');
    const manager = new GatewayManager();

    mockRunGatewayStartupSequence.mockImplementationOnce(async (hooks: { findExistingGateway: (port: number) => Promise<unknown> }) => {
      await hooks.findExistingGateway(18789);
      expect(mockFindExistingGatewayProcess).toHaveBeenLastCalledWith({ port: 18789, ownedPid: undefined });

      (manager as unknown as { process: { pid: number } | null }).process = { pid: 4321 };

      await hooks.findExistingGateway(18789);
      expect(mockFindExistingGatewayProcess).toHaveBeenLastCalledWith({ port: 18789, ownedPid: 4321 });
    });

    await manager.start();
  });
});
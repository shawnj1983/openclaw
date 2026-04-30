import { describe, expect, it, vi } from 'vitest';
import { runGatewayStartupSequence } from '@electron/gateway/startup-orchestrator';

vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp',
    getVersion: () => '0.3.1-test',
    isPackaged: false,
  },
  utilityProcess: {
    fork: vi.fn(),
  },
}));

describe('gateway startup orchestrator', () => {
  it('re-probes for an existing gateway after waiting for the port on Windows', async () => {
    const findExistingGateway = vi
      .fn<(_port: number, _ownedPid?: number) => Promise<{ port: number } | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ port: 18789 });
    const connect = vi.fn().mockResolvedValue(undefined);
    const onConnectedToExistingGateway = vi.fn();
    const waitForPortFree = vi.fn().mockResolvedValue(undefined);
    const startProcess = vi.fn().mockResolvedValue(undefined);
    const waitForReady = vi.fn().mockResolvedValue(undefined);
    const onConnectedToManagedGateway = vi.fn();

    await runGatewayStartupSequence({
      port: 18789,
      ownedPid: 7476,
      shouldWaitForPortFree: true,
      resetStartupStderrLines: vi.fn(),
      getStartupStderrLines: () => [],
      assertLifecycle: vi.fn(),
      findExistingGateway,
      connect,
      onConnectedToExistingGateway,
      waitForPortFree,
      startProcess,
      waitForReady,
      onConnectedToManagedGateway,
      runDoctorRepair: vi.fn().mockResolvedValue(false),
      onDoctorRepairSuccess: vi.fn(),
      delay: vi.fn().mockResolvedValue(undefined),
    });

    expect(findExistingGateway).toHaveBeenCalledTimes(2);
    expect(findExistingGateway).toHaveBeenNthCalledWith(1, 18789, 7476);
    expect(findExistingGateway).toHaveBeenNthCalledWith(2, 18789, 7476);
    expect(waitForPortFree).toHaveBeenCalledWith(18789);
    expect(connect).toHaveBeenCalledWith(18789, undefined);
    expect(onConnectedToExistingGateway).toHaveBeenCalledTimes(1);
    expect(startProcess).not.toHaveBeenCalled();
    expect(waitForReady).not.toHaveBeenCalled();
    expect(onConnectedToManagedGateway).not.toHaveBeenCalled();
  });
});

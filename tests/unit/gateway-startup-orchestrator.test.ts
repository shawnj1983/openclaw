import { describe, expect, it, vi } from 'vitest';
import { runGatewayStartupSequence } from '../../electron/gateway/startup-orchestrator';

describe('gateway startup orchestrator', () => {
  it('does not spawn a new process when the port never becomes available', async () => {
    const startProcess = vi.fn();

    await expect(runGatewayStartupSequence({
      port: 18789,
      shouldWaitForPortFree: true,
      maxStartAttempts: 1,
      resetStartupStderrLines: vi.fn(),
      getStartupStderrLines: () => [],
      assertLifecycle: vi.fn(),
      findExistingGateway: vi.fn().mockResolvedValue(null),
      connect: vi.fn(),
      onConnectedToExistingGateway: vi.fn(),
      waitForPortFree: vi.fn().mockResolvedValue(false),
      startProcess,
      waitForReady: vi.fn(),
      onConnectedToManagedGateway: vi.fn(),
      runDoctorRepair: vi.fn().mockResolvedValue(false),
      onDoctorRepairSuccess: vi.fn(),
      delay: vi.fn().mockResolvedValue(undefined),
    })).rejects.toThrow('Gateway port 18789 is still occupied');

    expect(startProcess).not.toHaveBeenCalled();
  });
});
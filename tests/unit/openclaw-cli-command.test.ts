import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalPlatform = process.platform;
const originalResourcesPath = process.resourcesPath;
const originalExecPath = process.execPath;

const {
  mockExistsSync,
  mockApp,
  mockGetOpenClawDir,
  mockGetOpenClawEntryPath,
} = vi.hoisted(() => ({
  mockExistsSync: vi.fn<(path: string) => boolean>(),
  mockApp: { isPackaged: true },
  mockGetOpenClawDir: vi.fn(() => '/workspace/node_modules/openclaw'),
  mockGetOpenClawEntryPath: vi.fn(() => '/packaged/resources/openclaw/openclaw.mjs'),
}));

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    existsSync: mockExistsSync,
    default: {
      ...actual,
      existsSync: mockExistsSync,
    },
  };
});

vi.mock('electron', () => ({
  app: mockApp,
}));

vi.mock('@electron/utils/paths', () => ({
  getOpenClawDir: mockGetOpenClawDir,
  getOpenClawEntryPath: mockGetOpenClawEntryPath,
}));

function setPlatform(platform: string) {
  Object.defineProperty(process, 'platform', { value: platform, writable: true });
}

function setResourcesPath(resourcesPath: string | undefined) {
  Object.defineProperty(process, 'resourcesPath', {
    value: resourcesPath,
    writable: true,
    configurable: true,
  });
}

function setExecPath(execPath: string) {
  Object.defineProperty(process, 'execPath', {
    value: execPath,
    writable: true,
    configurable: true,
  });
}

describe('getOpenClawCliCommand (Windows)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockApp.isPackaged = true;
    mockGetOpenClawDir.mockReturnValue('/workspace/node_modules/openclaw');
    mockGetOpenClawEntryPath.mockReturnValue('/packaged/resources/openclaw/openclaw.mjs');
    setPlatform('win32');
    setResourcesPath('/packaged/resources');
    setExecPath('/packaged/ClawX.exe');
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, writable: true });
    setResourcesPath(originalResourcesPath);
    setExecPath(originalExecPath);
  });

  it('returns a PowerShell-invokable packaged wrapper command', async () => {
    mockExistsSync.mockImplementation((target: string) => target === '/packaged/resources/cli/openclaw.cmd');

    const { getOpenClawCliCommand } = await import('@electron/utils/openclaw-cli');

    expect(getOpenClawCliCommand()).toBe("& '/packaged/resources/cli/openclaw.cmd'");
  });

  it('falls back to ELECTRON_RUN_AS_NODE command when wrapper is missing', async () => {
    mockExistsSync.mockReturnValue(false);

    const { getOpenClawCliCommand } = await import('@electron/utils/openclaw-cli');

    expect(getOpenClawCliCommand()).toBe(
      "$env:ELECTRON_RUN_AS_NODE=1; & '/packaged/ClawX.exe' '/packaged/resources/openclaw/openclaw.mjs'",
    );
  });

  it('uses the development .bin wrapper command with call operator', async () => {
    mockApp.isPackaged = false;
    mockExistsSync.mockImplementation(
      (target: string) => target === '/workspace/node_modules/.bin/openclaw.cmd',
    );

    const { getOpenClawCliCommand } = await import('@electron/utils/openclaw-cli');

    expect(getOpenClawCliCommand()).toBe("& '/workspace/node_modules/.bin/openclaw.cmd'");
  });
});

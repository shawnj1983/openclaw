import { describe, expect, it } from 'vitest';
import {
  hasDingTalkConfigReferences,
  resolveDingTalkPluginCandidateSources,
  runDingTalkStartupCompatibilityPreflight,
} from '@electron/utils/dingtalk-plugin';

describe('dingtalk plugin compatibility utilities', () => {
  describe('hasDingTalkConfigReferences', () => {
    it('detects dingtalk channel config', () => {
      expect(
        hasDingTalkConfigReferences({
          channels: {
            dingtalk: { enabled: true },
          },
        }),
      ).toBe(true);
    });

    it('detects dingtalk plugins.allow entry', () => {
      expect(
        hasDingTalkConfigReferences({
          plugins: {
            allow: ['discord', 'dingtalk'],
          },
        }),
      ).toBe(true);
    });

    it('returns false when dingtalk is not referenced', () => {
      expect(
        hasDingTalkConfigReferences({
          channels: {
            telegram: { enabled: true },
          },
          plugins: {
            allow: ['discord'],
          },
        }),
      ).toBe(false);
    });
  });

  describe('resolveDingTalkPluginCandidateSources', () => {
    it('builds packaged candidate source paths', () => {
      const candidates = resolveDingTalkPluginCandidateSources({
        isPackaged: true,
        resourcesPath: '/Applications/ClawX.app/Contents/Resources',
        appPath: '/Applications/ClawX.app/Contents/Resources/app.asar',
        cwd: '/tmp/irrelevant',
        currentDir: '/tmp/irrelevant',
      });

      expect(candidates).toEqual([
        '/Applications/ClawX.app/Contents/Resources/openclaw-plugins/dingtalk',
        '/Applications/ClawX.app/Contents/Resources/app.asar.unpacked/build/openclaw-plugins/dingtalk',
        '/Applications/ClawX.app/Contents/Resources/app.asar.unpacked/openclaw-plugins/dingtalk',
      ]);
    });

    it('builds development candidate source paths', () => {
      const candidates = resolveDingTalkPluginCandidateSources({
        isPackaged: false,
        resourcesPath: '/tmp/irrelevant',
        appPath: '/workspace',
        cwd: '/workspace',
        currentDir: '/workspace/dist-electron/utils',
      });

      expect(candidates).toEqual([
        '/workspace/build/openclaw-plugins/dingtalk',
        '/workspace/build/openclaw-plugins/dingtalk',
        '/workspace/build/openclaw-plugins/dingtalk',
      ]);
    });
  });

  describe('runDingTalkStartupCompatibilityPreflight', () => {
    it('skips install when config has no dingtalk references', async () => {
      let installCalls = 0;
      const result = await runDingTalkStartupCompatibilityPreflight(
        {
          channels: { telegram: { enabled: true } },
          plugins: { allow: ['discord'] },
        },
        {
          isPluginInstalled: async () => false,
          installPlugin: async () => {
            installCalls++;
            return { installed: true };
          },
        },
      );

      expect(result).toEqual({
        detectedConfigReferences: false,
        installAttempted: false,
        installed: false,
      });
      expect(installCalls).toBe(0);
    });

    it('attempts install and returns success when dingtalk is referenced', async () => {
      let installCalls = 0;
      const result = await runDingTalkStartupCompatibilityPreflight(
        {
          plugins: { allow: ['dingtalk'] },
        },
        {
          isPluginInstalled: async () => false,
          installPlugin: async () => {
            installCalls++;
            return { installed: true };
          },
        },
      );

      expect(result).toEqual({
        detectedConfigReferences: true,
        installAttempted: true,
        installed: true,
        warning: undefined,
      });
      expect(installCalls).toBe(1);
    });

    it('attempts install and returns warning on install failure', async () => {
      const result = await runDingTalkStartupCompatibilityPreflight(
        {
          channels: { dingtalk: { enabled: true } },
        },
        {
          isPluginInstalled: async () => false,
          installPlugin: async () => ({
            installed: false,
            warning: 'Bundled DingTalk plugin mirror not found.',
          }),
        },
      );

      expect(result).toEqual({
        detectedConfigReferences: true,
        installAttempted: true,
        installed: false,
        warning: 'Bundled DingTalk plugin mirror not found.',
      });
    });
  });
});

import { invoke } from '@tauri-apps/api/core';
import { openUrl as pluginOpenUrl } from '@tauri-apps/plugin-opener';

const SUPPORTED_SCHEME = /^(https?:|mailto:|tel:)/i;

export async function openExternalUrl(url: string): Promise<void> {
  const target = url.trim();
  if (!target) {
    throw new Error('URL is empty');
  }

  if (!SUPPORTED_SCHEME.test(target)) {
    throw new Error(`Unsupported URL scheme: ${target}`);
  }

  try {
    await pluginOpenUrl(target);
    return;
  } catch (pluginError) {
    console.warn('[openExternalUrl] plugin-opener failed, retrying via backend command:', pluginError);
  }

  try {
    await invoke('open_external_url', { url: target });
    return;
  } catch (invokeError) {
    console.warn('[openExternalUrl] backend opener command failed, falling back to window.open:', invokeError);
  }

  if (typeof window !== 'undefined' && typeof window.open === 'function') {
    const opened = window.open(target, '_blank', 'noopener,noreferrer');
    if (opened) {
      return;
    }

    window.location.href = target;
    return;
  }

  throw new Error(`Failed to open URL: ${target}`);
}

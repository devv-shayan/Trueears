import { AppProfile, ActiveWindowInfo, DEFAULT_APP_PROFILES, DEFAULT_SYSTEM_PROMPT, BASE_SYSTEM_PROMPT } from '../types/appProfile';
import { tauriAPI } from '../utils/tauriApi';

const STORAGE_KEY = 'SCRIBE_APP_PROFILES';

// Old default profile IDs that should be removed
const OLD_DEFAULT_IDS = new Set([
  'vscode', 'cursor', 'slack', 'discord', 'outlook', 'chrome', 
  'notion', 'onenote', 'word', 'whatsapp', 'whatsapp-firefox'
]);

// Validate that a profile has required fields
function isValidProfile(p: AppProfile): boolean {
  return !!(
    p.id && 
    p.displayName && 
    p.displayName.trim() !== '' &&
    p.appName && 
    p.appName.trim() !== '' &&
    !OLD_DEFAULT_IDS.has(p.id) &&
    !p.id.startsWith('tutorial-')
  );
}

export class AppProfileService {
  static getProfiles(): AppProfile[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const profiles = JSON.parse(stored) as AppProfile[];
        // Filter to only valid user-created profiles
        const valid = profiles.filter(isValidProfile);
        
        // If we filtered some out, save the cleaned list
        if (valid.length !== profiles.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
        }
        
        return valid;
      }
    } catch (error) {
      console.error('Failed to load app profiles:', error);
    }
    return [];
  }

  static saveProfiles(profiles: AppProfile[]): void {
    try {
      // Only save valid profiles
      const toSave = profiles.filter(isValidProfile);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      tauriAPI.emitSettingsChanged();
    } catch (error) {
      console.error('Failed to save app profiles:', error);
    }
  }

  static matchProfile(windowInfo: ActiveWindowInfo | null, profiles?: AppProfile[]): AppProfile | null {
    if (!windowInfo) {
      console.log('[AppProfileService] No window info provided');
      return null;
    }

    const activeApp = windowInfo.app_name.toLowerCase();
    const activePath = (windowInfo.executable_path || '').toLowerCase();
    const activeBasename = activePath.split('\\').pop() || activeApp;
    const activeStem = activeBasename.endsWith('.exe')
      ? activeBasename.replace(/\.exe$/i, '')
      : activeBasename;
    const activeUrlCanon = normalizeWebsiteUrl(windowInfo.url);

    console.log('[AppProfileService] Matching profile for:', {
      app_name: windowInfo.app_name,
      window_title: windowInfo.window_title,
      activeBasename,
      activeStem,
      url: windowInfo.url
    });

    const storedProfiles = profiles || this.getProfiles();
    const tutorialProfiles = DEFAULT_APP_PROFILES.filter(p => p.id.startsWith('tutorial-'));
    const allProfiles = [...storedProfiles, ...tutorialProfiles.filter(tp => !storedProfiles.some(sp => sp.id === tp.id))];
    
    console.log('[AppProfileService] Total profiles to check:', allProfiles.length);
    
    // Get candidates where appName matches
    const candidates = allProfiles.filter(
      profile => 
        profile.enabled && 
        profile.appName && 
        matchesExecutable(profile.appName, activeApp, activeBasename, activeStem)
    );

    console.log('[AppProfileService] Matching candidates:', candidates.map(c => ({ id: c.id, appName: c.appName, windowTitlePattern: c.windowTitlePattern })));

    if (candidates.length === 0) {
      console.log('[AppProfileService] No candidates matched');
      return null;
    }

    // 1) Prefer URL matches for browser profiles (when URL is available)
    if (activeUrlCanon) {
      const urlMatches = candidates
        .filter(p => !!p.websiteUrl)
        .map(p => ({ p, canon: normalizeWebsiteUrl(p.websiteUrl) }))
        .filter((x): x is { p: AppProfile; canon: string } => !!x.canon)
        // Prefer most-specific match (longest canonical URL)
        .sort((a, b) => b.canon.length - a.canon.length)
        .filter(({ canon }) => urlMatchesCanonical(activeUrlCanon, canon))
        .map(x => x.p);

      if (urlMatches.length > 0) {
        console.log('[AppProfileService] Using URL-matched profile:', urlMatches[0].displayName);
        return urlMatches[0];
      }
    }

    // Among candidates, find those with windowTitlePattern that matches
    const titleMatches = candidates.filter(profile => {
      if (!profile.windowTitlePattern) return false;
      try {
        const regex = new RegExp(profile.windowTitlePattern, 'i');
        const matches = regex.test(windowInfo.window_title);
        console.log(`[AppProfileService] Title pattern "${profile.windowTitlePattern}" vs "${windowInfo.window_title}": ${matches}`);
        return matches;
      } catch {
        return false;
      }
    });

    if (titleMatches.length > 0) {
      console.log('[AppProfileService] Using title-matched profile:', titleMatches[0].displayName);
      return titleMatches[0];
    }

    // If no title matches, return app-only matches (no title pattern)
    const appOnlyMatches = candidates.filter(profile => !profile.windowTitlePattern);
    if (appOnlyMatches.length > 0) {
      console.log('[AppProfileService] Using app-only profile:', appOnlyMatches[0].displayName);
      return appOnlyMatches[0];
    }
    
    console.log('[AppProfileService] No suitable profile found (all had windowTitlePattern but none matched)');
    return null;
  }

  static getSystemPrompt(windowInfo: ActiveWindowInfo | null, defaultPrompt?: string): string {
    const profile = this.matchProfile(windowInfo);
    let fullPrompt = BASE_SYSTEM_PROMPT;
    
    if (profile && profile.systemPrompt) {
      console.log(`[AppProfileService] Matched profile: ${profile.displayName}`);
      fullPrompt += '\n\n' + profile.systemPrompt;
    } else {
      console.log('[AppProfileService] No profile matched, using default formatting');
      fullPrompt += '\n\n' + (defaultPrompt || DEFAULT_SYSTEM_PROMPT);
    }
    
    return fullPrompt;
  }

  static addProfile(profile: AppProfile): void {
    if (!isValidProfile(profile)) {
      console.warn('Attempted to add invalid profile:', profile);
      return;
    }
    
    const profiles = this.getProfiles();
    
    // Check for duplicate
    const exists = profiles.some(p => isDuplicateProfile(p, profile));
    
    if (exists) {
      console.warn('Profile already exists for:', profile.appName);
      return;
    }
    
    profiles.push(profile);
    this.saveProfiles(profiles);
  }

  static updateProfile(id: string, updates: Partial<AppProfile>): void {
    const profiles = this.getProfiles();
    const index = profiles.findIndex(p => p.id === id);
    if (index !== -1) {
      profiles[index] = { ...profiles[index], ...updates };
      this.saveProfiles(profiles);
    }
  }

  static deleteProfile(id: string): void {
    const profiles = this.getProfiles();
    const filtered = profiles.filter(p => p.id !== id);
    this.saveProfiles(filtered);
  }

  static resetToDefaults(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
  
  // Clean up any invalid profiles from storage
  static cleanup(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const profiles = JSON.parse(stored) as AppProfile[];
        const valid = profiles.filter(isValidProfile);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }
}

// Run cleanup on module load
AppProfileService.cleanup();

function matchesExecutable(profileExe: string, activeApp: string, activeBasename: string, activeStem: string): boolean {
  const profileLower = profileExe.toLowerCase();
  const profileStem = profileLower.replace(/\.exe$/i, '');
  return (
    activeApp.includes(profileStem) ||
    activeBasename === profileLower ||
    activeBasename === profileStem ||
    activeStem === profileStem
  );
}

const BROWSER_EXECUTABLES = new Set([
  'chrome.exe',
  'msedge.exe',
  'firefox.exe',
  'brave.exe',
  'opera.exe',
  'vivaldi.exe',
  'arc.exe',
]);

function isBrowserExecutable(exe: string): boolean {
  const lower = (exe || '').toLowerCase().trim();
  const base = lower.split('\\').pop() || lower;
  return BROWSER_EXECUTABLES.has(base);
}

/**
 * Normalize a website URL/domain for storage + comparison.
 * Returns a canonical string like "mail.google.com" or "github.com/org".
 */
function normalizeWebsiteUrl(raw?: string | null): string | null {
  const input = (raw || '').trim();
  if (!input) return null;
  try {
    const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(input) ? input : `https://${input}`;
    const url = new URL(withScheme);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let path = url.pathname || '';
    if (path === '/' || path === '') path = '';
    else path = path.replace(/\/+$/, '');
    return path ? `${host}${path}` : host;
  } catch {
    // Best-effort fallback (still useful for de-dupe)
    return input.toLowerCase();
  }
}

function urlMatchesCanonical(activeCanon: string, profileCanon: string): boolean {
  if (activeCanon === profileCanon) return true;
  if (activeCanon.startsWith(profileCanon)) {
    const next = activeCanon.charAt(profileCanon.length);
    return next === '' || next === '/';
  }
  return false;
}

function isDuplicateProfile(existing: AppProfile, incoming: AppProfile): boolean {
  const existingExe = (existing.appName || '').toLowerCase();
  const incomingExe = (incoming.appName || '').toLowerCase();
  if (existingExe !== incomingExe) return false;

  // For browsers: prevent duplicate (same exe + same normalized URL)
  if (isBrowserExecutable(incomingExe)) {
    const a = normalizeWebsiteUrl(existing.websiteUrl);
    const b = normalizeWebsiteUrl(incoming.websiteUrl);
    if (a && b) return a === b;
    // Back-compat: older browser profiles may only have windowTitlePattern
    const ap = (existing.windowTitlePattern || '').trim().toLowerCase();
    const bp = (incoming.windowTitlePattern || '').trim().toLowerCase();
    return ap !== '' && bp !== '' && ap === bp;
  }

  // For non-browsers: only 1 profile per executable
  return true;
}

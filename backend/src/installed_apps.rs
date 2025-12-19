use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use winreg::enums::*;
use winreg::RegKey;
use windows::Win32::UI::Shell::{SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON};
use windows::Win32::Storage::FileSystem::FILE_FLAGS_AND_ATTRIBUTES;
use windows::Win32::UI::WindowsAndMessaging::{DestroyIcon, DI_FLAGS};
use windows::core::PCWSTR;
use image::ImageEncoder;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledApp {
    pub name: String,
    pub executable: String,
    pub category: String,
    pub icon_base64: Option<String>,
}

/// Known popular apps with their executables and categories
const KNOWN_APPS: &[(&str, &str, &str)] = &[
    // Browsers
    ("Google Chrome", "chrome.exe", "browser"),
    ("Mozilla Firefox", "firefox.exe", "browser"),
    ("Microsoft Edge", "msedge.exe", "browser"),
    ("Brave Browser", "brave.exe", "browser"),
    ("Opera", "opera.exe", "browser"),
    ("Arc", "arc.exe", "browser"),
    ("Vivaldi", "vivaldi.exe", "browser"),
    
    // Code Editors & IDEs
    ("Visual Studio Code", "Code.exe", "code"),
    ("Visual Studio Code - Insiders", "Code - Insiders.exe", "code"),
    ("Cursor", "Cursor.exe", "code"),
    ("Antigravity", "Antigravity.exe", "code"),
    ("Sublime Text", "sublime_text.exe", "code"),
    ("Atom", "atom.exe", "code"),
    ("Notepad++", "notepad++.exe", "code"),
    ("IntelliJ IDEA", "idea64.exe", "code"),
    ("PyCharm", "pycharm64.exe", "code"),
    ("WebStorm", "webstorm64.exe", "code"),
    ("Visual Studio", "devenv.exe", "code"),
    ("Android Studio", "studio64.exe", "code"),
    ("Zed", "zed.exe", "code"),
    ("Neovim", "nvim-qt.exe", "code"),
    
    // Communication
    ("Slack", "slack.exe", "chat"),
    ("Discord", "Discord.exe", "chat"),
    ("Microsoft Teams", "Teams.exe", "chat"),
    ("Microsoft Teams (new)", "ms-teams.exe", "chat"),
    ("Zoom", "Zoom.exe", "chat"),
    ("Telegram", "Telegram.exe", "chat"),
    ("WhatsApp Desktop", "WhatsApp.exe", "chat"),
    ("Signal", "Signal.exe", "chat"),
    ("Skype", "Skype.exe", "chat"),
    
    // Email
    ("Microsoft Outlook", "OUTLOOK.EXE", "email"),
    ("Thunderbird", "thunderbird.exe", "email"),
    ("Mailspring", "mailspring.exe", "email"),
    
    // Notes & Productivity
    ("Notion", "Notion.exe", "notes"),
    ("Obsidian", "Obsidian.exe", "notes"),
    ("Evernote", "Evernote.exe", "notes"),
    ("OneNote", "ONENOTE.EXE", "notes"),
    ("Roam Research", "Roam Research.exe", "notes"),
    ("Logseq", "Logseq.exe", "notes"),
    ("Joplin", "Joplin.exe", "notes"),
    
    // Office
    ("Microsoft Word", "WINWORD.EXE", "office"),
    ("Microsoft Excel", "EXCEL.EXE", "office"),
    ("Microsoft PowerPoint", "POWERPNT.EXE", "office"),
    ("LibreOffice Writer", "swriter.exe", "office"),
    
    // Design
    ("Figma", "Figma.exe", "design"),
    ("Adobe Photoshop", "Photoshop.exe", "design"),
    ("Adobe Illustrator", "Illustrator.exe", "design"),
    ("Adobe XD", "XD.exe", "design"),
    ("Sketch", "Sketch.exe", "design"),
    ("Canva", "Canva.exe", "design"),
    ("GIMP", "gimp-2.10.exe", "design"),
    ("Inkscape", "inkscape.exe", "design"),
    
    // Development Tools
    ("Postman", "Postman.exe", "dev"),
    ("Insomnia", "Insomnia.exe", "dev"),
    ("Docker Desktop", "Docker Desktop.exe", "dev"),
    ("GitHub Desktop", "GitHubDesktop.exe", "dev"),
    ("Sourcetree", "SourceTree.exe", "dev"),
    ("Windows Terminal", "WindowsTerminal.exe", "dev"),
    ("Warp", "warp.exe", "dev"),
    ("Hyper", "Hyper.exe", "dev"),
    
    // Media
    ("Spotify", "Spotify.exe", "media"),
    ("VLC Media Player", "vlc.exe", "media"),
    ("iTunes", "iTunes.exe", "media"),
    
    // Other Popular
    ("1Password", "1Password.exe", "utility"),
    ("Grammarly Desktop", "Grammarly.exe", "utility"),
    ("Loom", "Loom.exe", "utility"),
    ("Krisp", "krisp.exe", "utility"),
];

/// Alias map for search queries
const APP_ALIASES: &[(&str, &str)] = &[
    ("vs code", "code.exe"),
    ("vscode", "code.exe"),
    ("visual studio code", "code.exe"),
    ("code insiders", "code - insiders.exe"),
    ("vscode insiders", "code - insiders.exe"),
    ("vs code insiders", "code - insiders.exe"),
];

/// Search installed apps by query
pub fn search_installed_apps(query: &str) -> Vec<InstalledApp> {
    if query.len() < 2 {
        return Vec::new();
    }
    
    let query_lower = query.to_lowercase().trim().to_string();
    let query_words: Vec<&str> = query_lower.split_whitespace().collect();
    let registered_apps = get_all_registered_apps();
    
    let mut results = Vec::new();
    let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
    
    // First check aliases
    let alias_exe = APP_ALIASES.iter()
        .find(|(alias, _)| alias.to_lowercase() == query_lower)
        .map(|(_, exe)| exe.to_lowercase());
    
    for (name, exe, category) in KNOWN_APPS {
        let exe_lower = exe.to_lowercase();
        
        // Check if app is installed
        if let Some(full_path) = registered_apps.get(&exe_lower).cloned() {
            let name_lower = name.to_lowercase();
            
            // Match by alias, name, or executable
            let matches = alias_exe.as_ref().map(|a| *a == exe_lower).unwrap_or(false)
                || name_lower.contains(&query_lower)
                || exe_lower.contains(&query_lower)
                || query_words.iter().all(|w| name_lower.contains(w))
                || query_words.iter().all(|w| exe_lower.contains(w));
            
            if matches {
                let icon_base64 = extract_icon_from_path(&full_path);
                seen.insert(exe_lower.clone());
                results.push(InstalledApp {
                    name: name.to_string(),
                    executable: exe.to_string(),
                    category: category.to_string(),
                    icon_base64,
                });
            }
        }
    }

    // Also search other registered apps
    for (exe_lower, full_path) in registered_apps.iter() {
        if seen.contains(exe_lower) {
            continue;
        }
        if exe_lower.contains(&query_lower) || query_words.iter().all(|w| exe_lower.contains(w)) {
            let icon_base64 = extract_icon_from_path(full_path);
            seen.insert(exe_lower.clone());
            let display_name = exe_lower.trim_end_matches(".exe")
                .chars().next().map(|c| c.to_uppercase().collect::<String>() + &exe_lower.trim_end_matches(".exe")[1..])
                .unwrap_or_else(|| exe_lower.clone());
            results.push(InstalledApp {
                name: display_name,
                executable: exe_lower.clone(),
                category: "utility".to_string(),
                icon_base64,
            });
        }
    }
    
    results.truncate(10);
    results
}

/// Get only installed popular apps (for the Popular Apps section)
pub fn get_installed_popular_apps() -> Vec<InstalledApp> {
    let registered_apps = get_all_registered_apps();
    let mut installed = Vec::new();
    
    for (name, exe, category) in KNOWN_APPS {
        let exe_lower = exe.to_lowercase();
        if let Some(full_path) = registered_apps.get(&exe_lower).cloned() {
            let icon_base64 = extract_icon_from_path(&full_path);
            installed.push(InstalledApp {
                name: name.to_string(),
                executable: exe.to_string(),
                category: category.to_string(),
                icon_base64,
            });
        }
    }
    
    log::info!("Found {} installed popular apps", installed.len());
    installed
}

/// Get all registered executables with their full paths
fn get_all_registered_apps() -> HashMap<String, String> {
    let mut executables: HashMap<String, String> = HashMap::new();
    
    // Registry: HKEY_LOCAL_MACHINE App Paths
    if let Ok(hklm) = RegKey::predef(HKEY_LOCAL_MACHINE)
        .open_subkey(r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths")
    {
        for exe_name in hklm.enum_keys().filter_map(|k| k.ok()) {
            if let Ok(app_key) = hklm.open_subkey(&exe_name) {
                if let Ok(path) = app_key.get_value::<String, _>("") {
                    let key = exe_name.to_lowercase();
                    executables.entry(key).or_insert(path);
                }
            }
        }
    }

    // Registry: WOW6432Node (32-bit apps on 64-bit Windows)
    if let Ok(hklm32) = RegKey::predef(HKEY_LOCAL_MACHINE)
        .open_subkey(r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths")
    {
        for exe_name in hklm32.enum_keys().filter_map(|k| k.ok()) {
            if let Ok(app_key) = hklm32.open_subkey(&exe_name) {
                if let Ok(path) = app_key.get_value::<String, _>("") {
                    let key = exe_name.to_lowercase();
                    executables.entry(key).or_insert(path);
                }
            }
        }
    }
    
    // Registry: HKEY_CURRENT_USER App Paths
    if let Ok(hkcu) = RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey(r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths")
    {
        for exe_name in hkcu.enum_keys().filter_map(|k| k.ok()) {
            if let Ok(app_key) = hkcu.open_subkey(&exe_name) {
                if let Ok(path) = app_key.get_value::<String, _>("") {
                    let key = exe_name.to_lowercase();
                    executables.entry(key).or_insert(path);
                }
            }
        }
    }
    
    // Start Menu shortcuts
    let start_menu_apps = collect_start_menu_links();
    for (exe_key, lnk_path) in start_menu_apps {
        executables.entry(exe_key).or_insert(lnk_path);
    }
    
    executables
}

/// Collect Start Menu shortcuts
fn collect_start_menu_links() -> HashMap<String, String> {
    let mut map: HashMap<String, String> = HashMap::new();
    let mut start_menu_paths = Vec::new();

    start_menu_paths.push(PathBuf::from(r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs"));

    if let Ok(appdata) = std::env::var("APPDATA") {
        let mut p = PathBuf::from(appdata);
        p.push("Microsoft\\Windows\\Start Menu\\Programs");
        start_menu_paths.push(p);
    }

    for dir in start_menu_paths {
        if !dir.exists() {
            continue;
        }

        for entry in WalkDir::new(dir).max_depth(3).into_iter().filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()).map(|ext| ext.eq_ignore_ascii_case("lnk")).unwrap_or(false) {
                if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                    let lnk_path = path.to_string_lossy().to_string();
                    // Create exe key from shortcut name
                    let exe_key = format!("{}.exe", stem.to_lowercase());
                    map.entry(exe_key).or_insert(lnk_path);
                }
            }
        }
    }

    map
}

/// Extract icon from file path and return as base64 PNG
fn extract_icon_from_path(path: &str) -> Option<String> {
    let path_buf = PathBuf::from(path);
    if !path_buf.exists() {
        return None;
    }

    let path_wide: Vec<u16> = path.encode_utf16().chain(std::iter::once(0)).collect();

    unsafe {
        let mut shfi: SHFILEINFOW = std::mem::zeroed();
        let flags = SHGFI_ICON | SHGFI_LARGEICON;
        
        let result = SHGetFileInfoW(
            PCWSTR::from_raw(path_wide.as_ptr()),
            FILE_FLAGS_AND_ATTRIBUTES(0),
            Some(&mut shfi),
            std::mem::size_of::<SHFILEINFOW>() as u32,
            flags,
        );

        if result == 0 || shfi.hIcon.is_invalid() {
            return None;
        }

        let icon_data = icon_to_png_base64(shfi.hIcon);
        let _ = DestroyIcon(shfi.hIcon);
        icon_data
    }
}

/// Convert HICON to PNG base64
fn icon_to_png_base64(hicon: windows::Win32::UI::WindowsAndMessaging::HICON) -> Option<String> {
    use windows::Win32::Graphics::Gdi::{
        CreateCompatibleDC, DeleteDC, DeleteObject, GetDC, ReleaseDC, SelectObject,
        CreateCompatibleBitmap, GetDIBits, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
    };
    use windows::Win32::UI::WindowsAndMessaging::DrawIconEx;

    const SIZE: i32 = 64;

    unsafe {
        let hdc = GetDC(None);
        let hdc_mem = CreateCompatibleDC(hdc);
        let hbm = CreateCompatibleBitmap(hdc, SIZE, SIZE);
        let old_bm = SelectObject(hdc_mem, hbm);

        let _ = DrawIconEx(hdc_mem, 0, 0, hicon, SIZE, SIZE, 0, None, DI_FLAGS(0x0003));

        let mut bmi: BITMAPINFO = std::mem::zeroed();
        bmi.bmiHeader.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
        bmi.bmiHeader.biWidth = SIZE;
        bmi.bmiHeader.biHeight = -SIZE; // Top-down
        bmi.bmiHeader.biPlanes = 1;
        bmi.bmiHeader.biBitCount = 32;
        bmi.bmiHeader.biCompression = BI_RGB.0 as u32;

        let mut buffer = vec![0u8; (SIZE * SIZE * 4) as usize];
        GetDIBits(
            hdc_mem,
            hbm,
            0,
            SIZE as u32,
            Some(buffer.as_mut_ptr() as *mut _),
            &mut bmi,
            DIB_RGB_COLORS,
        );

        SelectObject(hdc_mem, old_bm);
        DeleteObject(hbm);
        DeleteDC(hdc_mem);
        ReleaseDC(None, hdc);

        // Convert BGRA to RGBA
        for i in (0..buffer.len()).step_by(4) {
            buffer.swap(i, i + 2);
        }

        let img = image::RgbaImage::from_raw(SIZE as u32, SIZE as u32, buffer)?;
        let mut png_bytes = Vec::new();
        let mut cursor = std::io::Cursor::new(&mut png_bytes);
        
        let encoder = image::codecs::png::PngEncoder::new(&mut cursor);
        encoder.write_image(&img, SIZE as u32, SIZE as u32, image::ExtendedColorType::Rgba8).ok()?;

        Some(base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &png_bytes))
    }
}

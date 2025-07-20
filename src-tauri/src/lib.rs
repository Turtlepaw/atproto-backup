use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconEvent},
    Emitter, Manager,
};
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri_plugin_deep_link::DeepLinkExt;

mod background;
mod tray;
use background::{start_background_scheduler, stop_background_scheduler};
use tray::create_system_tray;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_websocket::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
                .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            println!("A new app instance was opened with {argv:?} and the deep link event was already triggered.");

                        let _ = app.get_webview_window("main")
                       .expect("no main window")
                       .set_focus();
        }))
        .invoke_handler(tauri::generate_handler![
            greet,
            start_background_scheduler,
            stop_background_scheduler
        ])
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => {
                std::process::exit(0);
            }
            "show" => {
                let window = app.get_webview_window("main").unwrap();
                window.show().unwrap();
                window.set_focus().unwrap();
            }
            "hide" => {
                let window = app.get_webview_window("main").unwrap();
                window.hide().unwrap();
            }
            "backup_now" => {
                // Emit event to trigger backup
                app.emit("perform-backup", ()).unwrap();
            }
            _ => {
                println!("menu item {:?} not handled", event.id);
            }
        })
        .on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } => {
                println!("left click pressed and released");
                // in this example, let's show and focus the main window when the tray is clicked
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            _ => {
                println!("unhandled event {event:?}");
            }
        })
        .setup(|app| {
            #[cfg(any(windows, target_os = "linux"))]
            {
                app.deep_link().register_all()?;
            }
            let tray = create_system_tray(app);

            Ok(())
        });

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

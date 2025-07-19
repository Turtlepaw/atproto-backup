use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIcon, TrayIconBuilder},
};

pub fn create_system_tray(app: &tauri::App) -> Result<TrayIcon, tauri::Error> {
    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
    let hide_i = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
    let backup_now_i = MenuItem::with_id(app, "backup_now", "Backup Now", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[
        &quit_i,
        &show_i,
        &hide_i,
        &backup_now_i,
    ])?;

    TrayIconBuilder::new()
        .menu(&menu)
        .menu_on_left_click(true)
        .icon(app.default_window_icon().unwrap().clone())
        .build(app)
}

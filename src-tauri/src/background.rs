use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_store::StoreExt;
use tokio::sync::Mutex;
use tokio::time::sleep;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupSettings {
    pub frequency: String, // "daily" or "weekly"
    pub last_backup_date: Option<String>,
}

pub struct BackgroundScheduler {
    app: AppHandle,
    is_running: Arc<Mutex<bool>>,
}

impl BackgroundScheduler {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            is_running: Arc::new(Mutex::new(false)),
        }
    }

    pub async fn start(&self) {
        let mut is_running = self.is_running.lock().await;
        if *is_running {
            return;
        }
        *is_running = true;
        drop(is_running);

        let is_running = self.is_running.clone();
        let app = self.app.clone(); // <-- assuming it's Arc<App>

        tokio::spawn(async move {
            let mut last_check = Instant::now();

            while *is_running.lock().await {
                if last_check.elapsed() >= Duration::from_secs(30 * 60) {
                    last_check = Instant::now();

                    if let Err(e) = Self::check_and_perform_backup(app.clone()).await {
                        eprintln!("Background backup check failed: {}", e);
                    }
                }

                sleep(Duration::from_secs(5 * 60)).await;
            }
        });
    }

    pub async fn stop(&self) {
        let mut is_running = self.is_running.lock().await;
        *is_running = false;
    }

    async fn check_and_perform_backup(app: AppHandle) -> Result<(), Box<dyn std::error::Error>> {
        // Get settings from store
        let store = app.store("settings.json")?;
        let raw_settings: Option<serde_json::Value> = store.get("settings");

        let value = raw_settings.unwrap_or(json!({
            "frequency": "daily",
            "last_backup_date": null
        }));

        let settings: BackupSettings = serde_json::from_value(value)?;

        // Check if backup is needed
        if Self::should_perform_backup(&settings).await? {
            println!("Background: Backup due, starting backup...");

            // Emit event to frontend to perform backup
            app.emit("perform-backup", ())?;

            // Update last backup date
            let mut updated_settings = settings;
            updated_settings.last_backup_date = Some(chrono::Utc::now().to_rfc3339());
            store.set("settings", json!(updated_settings));
            store.save()?;

            println!("Background: Backup completed");
        }

        Ok(())
    }

    async fn should_perform_backup(
        settings: &BackupSettings,
    ) -> Result<bool, Box<dyn std::error::Error>> {
        if settings.last_backup_date.is_none() {
            return Ok(true);
        }

        let last_backup =
            chrono::DateTime::parse_from_rfc3339(&settings.last_backup_date.as_ref().unwrap())?;
        let now = chrono::Utc::now();
        let time_diff = now.signed_duration_since(last_backup);

        let required_interval = match settings.frequency.as_str() {
            "daily" => chrono::Duration::days(1),
            "weekly" => chrono::Duration::weeks(1),
            _ => chrono::Duration::days(1),
        };

        Ok(time_diff >= required_interval)
    }
}

#[tauri::command]
pub async fn start_background_scheduler(app: AppHandle) {
    let scheduler = BackgroundScheduler::new(app);
    scheduler.start().await;
}

#[tauri::command]
pub async fn stop_background_scheduler() -> Result<(), String> {
    // This would need to be implemented with a global scheduler reference
    // For now, we'll handle this differently
    Ok(())
}

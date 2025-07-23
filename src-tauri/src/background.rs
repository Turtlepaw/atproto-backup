use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{App, AppHandle, Emitter, Manager};
use tauri_plugin_store::StoreExt;
use tokio::sync::Mutex;
use tokio::time::sleep;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupSettings {
    pub backupFrequency: String, // "daily" or "weekly"
    pub lastBackupDate: Option<String>,
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
        let app = self.app.clone();

        tokio::spawn(async move {
            loop {
                // Your shared flag
                if !*is_running.lock().await {
                    break;
                }

                // Use cloned app
                if let Err(e) = Self::check_and_perform_backup(&app).await {
                    eprintln!("Background backup check failed: {}", e);
                }

                sleep(Duration::from_secs(30 * 60)).await;
            }
        });
    }

    pub async fn stop(&self) {
        let mut is_running = self.is_running.lock().await;
        *is_running = false;
    }

    async fn check_and_perform_backup(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
        println!("Background: Checking if backup is needed...");
        // Get settings from store
        let store = app.store("settings.json")?;
        let raw_settings: Option<serde_json::Value> = store.get("settings");

        let value = raw_settings.unwrap_or(json!({
            "backupFrequency": "daily",
            "last_backup_date": null
        }));

        let settings: BackupSettings = serde_json::from_value(value)?;

        // Check if backup is needed
        if Self::should_perform_backup(&settings).await? {
            println!("Background: Backup due, starting backup...");

            // Emit event to frontend to perform backup
            match app.emit("perform-backup", serde_json::json!({})) {
                Ok(_) => println!("Event emitted successfully"),
                Err(e) => eprintln!("Failed to emit event: {}", e),
            }

            println!("Background: Backup completed");
        }

        Ok(())
    }

    async fn should_perform_backup(
        settings: &BackupSettings,
    ) -> Result<bool, Box<dyn std::error::Error>> {
        println!("[DEBUG] Checking if backup should be performed...");

        if settings.lastBackupDate.is_none() {
            println!("[DEBUG] No last_backup_date found; should perform backup.");
            return Ok(true);
        }

        let last_backup_str = settings.lastBackupDate.as_ref().unwrap();
        println!("[DEBUG] Last backup date string: {}", last_backup_str);

        let last_backup = DateTime::parse_from_rfc3339(last_backup_str)?;
        let now = Utc::now();
        let time_diff = now.signed_duration_since(last_backup);

        println!("[DEBUG] Current time: {}", now);
        println!("[DEBUG] Last backup time: {}", last_backup);
        println!(
            "[DEBUG] Time since last backup: {} seconds",
            time_diff.num_seconds()
        );

        let required_interval = match settings.backupFrequency.as_str() {
            "daily" => chrono::Duration::days(1),
            "weekly" => chrono::Duration::weeks(1),
            other => {
                println!("[DEBUG] Unknown frequency '{}', defaulting to daily", other);
                chrono::Duration::days(1)
            }
        };

        println!(
            "[DEBUG] Required interval (seconds): {}",
            required_interval.num_seconds()
        );
        println!(
            "[DEBUG] Should perform backup? {}",
            time_diff >= required_interval
        );

        Ok(time_diff >= required_interval)
    }
}

#[tauri::command]
pub async fn start_background_scheduler(app: AppHandle) -> Result<(), String> {
    println!("Starting background scheduler...");
    let scheduler = BackgroundScheduler::new(app);
    scheduler.start().await;
    Ok(())
}

#[tauri::command]
pub async fn stop_background_scheduler() -> Result<(), String> {
    // This would need to be implemented with a global scheduler reference
    // For now, we'll handle this differently
    Ok(())
}

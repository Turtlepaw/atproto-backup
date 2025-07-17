import { documentDir, resolve } from "@tauri-apps/api/path";
import { exists, BaseDirectory, mkdir } from "@tauri-apps/plugin-fs";

const dir = "ATBackup";
export async function getBackupDir() {
  const docs = await documentDir();
  return await resolve(docs, dir);
}

export async function createBackupDir() {
  const dirExists = await exists(dir, {
    baseDir: BaseDirectory.Document,
  });

  if (!dirExists) {
    await mkdir(dir, {
      baseDir: BaseDirectory.Document,
    });
  }
}

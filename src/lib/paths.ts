import { documentDir, resolve } from "@tauri-apps/api/path";
import { exists, mkdir } from "@tauri-apps/plugin-fs";
import { settingsManager } from "./settings";

const dir = "ATBackup";

export async function checkDocumentDir(): Promise<{
  exists: boolean;
  path?: string;
  error?: string;
}> {
  try {
    const docs = await documentDir();
    const docExists = await exists(docs);
    if (!docExists) {
      return {
        exists: false,
        path: docs,
        error: "Document directory does not exist.",
      };
    }
    return { exists: true, path: docs };
  } catch {
    return {
      exists: false,
      error: "Document directory does not exist.",
    };
  }
}

export async function getDefaultBackupDir(): Promise<string> {
  let docs: string;
  try {
    docs = await documentDir();
  } catch {
    throw new Error("Document directory does not exist.");
  }

  const docExists = await exists(docs);
  if (!docExists) {
    throw new Error("Document directory does not exist.");
  }

  return await resolve(docs, dir);
}

export async function getBackupDir(): Promise<string> {
  const customDir = await settingsManager.getBackupDirectory();
  if (customDir && customDir.trim() !== "") {
    return customDir.trim();
  }
  return await getDefaultBackupDir();
}

export async function createBackupDir(): Promise<string> {
  const backupDir = await getBackupDir();

  const dirExists = await exists(backupDir);
  if (!dirExists) {
    await mkdir(backupDir, { recursive: true });
  }

  return backupDir;
}

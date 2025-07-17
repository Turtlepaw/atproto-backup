import { Agent } from "@atproto/api";
import { createBackupDir, getBackupDir } from "./paths";
import { join, resolve } from "@tauri-apps/api/path";
import {
  mkdir,
  readDir,
  readTextFile,
  writeFile,
  remove,
} from "@tauri-apps/plugin-fs";
import { CarStats, getCarStats } from "./stats";

export interface Metadata {
  did: string;
  timestamp: string;
  backupType: string;
  filePath: string;
  stats: CarStats;
}

export class BackupManager {
  private agent: Agent;
  private maxBackups = 3;

  constructor(agent: Agent) {
    this.agent = agent;
  }

  async startBackup(): Promise<Metadata> {
    const did = this.agent.did;
    if (did == null) throw Error("Unauthenticated");

    // Get the repo data
    const data = await this.agent.com.atproto.sync.getRepo({ did: did });

    // Write to backup location
    const metadata = await this.writeBackupToFile(data.data, did);

    // Clean up old backups after creating new one
    await this.cleanupOldBackups();

    return metadata;
  }

  private async writeBackupToFile(
    repoData: Uint8Array,
    did: string
  ): Promise<Metadata> {
    try {
      // Create backup directory structure
      await createBackupDir();
      const backupDir = await getBackupDir();
      const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const backupPath = await join(backupDir, `${timestamp}_backup`);
      await mkdir(backupPath);

      // Write the repo data as binary file
      const repoFilePath = await join(backupPath, "repo.car");
      await writeFile(repoFilePath, repoData);

      const stats = await getCarStats(repoData);

      // Create a metadata file
      const metadata = {
        did: did,
        timestamp: new Date().toISOString(),
        backupType: "full_repo",
        filePath: repoFilePath,
        stats,
      };

      const metadataPath = await join(backupPath, "metadata.json");
      const metadataJson = JSON.stringify(metadata, null, 2);
      await writeFile(metadataPath, new TextEncoder().encode(metadataJson));

      console.log(`Backup written to: ${backupPath}`);
      return metadata;
    } catch (error) {
      console.error("Failed to write backup:", error);
      throw error;
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.getBackups();

      // Sort backups by timestamp (newest first)
      const sortedBackups = backups.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // If we have more than maxBackups, delete the oldest ones
      if (sortedBackups.length > this.maxBackups) {
        const backupsToDelete = sortedBackups.slice(this.maxBackups);

        for (const backup of backupsToDelete) {
          await this.deleteBackup(backup);
        }

        console.log(`Deleted ${backupsToDelete.length} old backup(s)`);
      }
    } catch (error) {
      console.error("Failed to cleanup old backups:", error);
      // Don't throw here - we don't want backup creation to fail because of cleanup issues
    }
  }

  private async deleteBackup(backup: Metadata): Promise<void> {
    try {
      const rootBackupDir = await getBackupDir();
      const dir = await readDir(rootBackupDir);

      // Find the backup directory that contains this backup
      for (const backupDir of dir) {
        if (backupDir.isDirectory) {
          const backupPath = await resolve(rootBackupDir, backupDir.name);
          const metadataPath = await join(backupPath, "metadata.json");

          try {
            const metadata = await readTextFile(metadataPath);
            const parsedMetadata = JSON.parse(metadata);

            // Check if this is the backup we want to delete
            if (
              parsedMetadata.timestamp === backup.timestamp &&
              parsedMetadata.did === backup.did
            ) {
              await remove(backupPath, { recursive: true });
              console.log(`Deleted backup: ${backupPath}`);
              break;
            }
          } catch (e) {
            // Skip if we can't read metadata
            continue;
          }
        }
      }
    } catch (error) {
      console.error(`Failed to delete backup:`, error);
    }
  }

  async getBackups(): Promise<Metadata[]> {
    const data: Metadata[] = [];
    await createBackupDir();
    const rootBackupDir = await getBackupDir();
    const dir = await readDir(rootBackupDir);

    for (const backupDir of dir) {
      if (backupDir.isDirectory) {
        const backup = await readDir(
          await resolve(rootBackupDir, backupDir.name)
        );
        const metadataFile = backup.find((e) => e.name == "metadata.json");
        if (metadataFile) {
          try {
            const metadata = await readTextFile(
              await resolve(rootBackupDir, backupDir.name, metadataFile.name)
            );
            data.push(JSON.parse(metadata));
          } catch (error) {
            console.error(
              `Failed to read metadata for ${backupDir.name}:`,
              error
            );
            // Continue processing other backups
          }
        }
      }
    }

    return data;
  }
}

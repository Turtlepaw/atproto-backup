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
  blobsPath?: string;
  blobCount?: number;
  stats: CarStats;
}

export interface BlobReference {
  cid: string;
  mimeType?: string;
  size?: number;
}

export type BackupStage =
  | "fetching"
  | "writing"
  | "blobs"
  | "cleanup"
  | "complete";
export interface ProgressInfo {
  stage: BackupStage;
  message: string;
  progress?: number; // 0-100 percentage
  current?: number;
  total?: number;
}

export type ProgressCallback = (progress: ProgressInfo) => void;

export class BackupAgent {
  private agent: Agent;
  private maxBackups = 3;
  private downloadBlobs = true;
  private progressCallback?: ProgressCallback;
  private overwriteBackups = false;

  constructor(
    agent: Agent,
    options?: {
      downloadBlobs?: boolean;
      onProgress?: ProgressCallback;
      overwriteBackups?: boolean;
    }
  ) {
    this.agent = agent;
    this.downloadBlobs = options?.downloadBlobs ?? true;
    this.progressCallback = options?.onProgress;
    this.overwriteBackups = options?.overwriteBackups ?? false;
  }

  private reportProgress(progress: ProgressInfo) {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  async startBackup(): Promise<Metadata> {
    const did = this.agent.did;
    if (did == null) throw Error("Unauthenticated");

    try {
      // Stage 1: Fetching repo data
      this.reportProgress({
        stage: "fetching",
        message: "Fetching repository data...",
        progress: 10,
      });

      const data = await this.agent.com.atproto.sync.getRepo({ did: did });

      // Stage 2: Writing backup file
      this.reportProgress({
        stage: "writing",
        message: "Writing backup to file...",
        progress: 30,
      });

      const metadata = await this.writeBackupToFile(data.data, did);

      // Stage 3: Download blobs if enabled
      if (this.downloadBlobs) {
        this.reportProgress({
          stage: "blobs",
          message: "Preparing to download blobs...",
          progress: 40,
        });

        await this.downloadBlobsForBackup(metadata);
      } else {
        this.reportProgress({
          stage: "blobs",
          message: "Skipping blob download (disabled)",
          progress: 80,
        });
      }

      // Clean up old backups or overwrite existing one
      if (this.overwriteBackups) {
        this.reportProgress({
          stage: "cleanup",
          message: "Cleaning up previous backup...",
          progress: 90,
        });
        await this.cleanupAllBackups();
      } else {
        this.reportProgress({
          stage: "cleanup",
          message: "Cleaning up old backups...",
          progress: 90,
        });
        await this.cleanupOldBackups();
      }

      // Stage 5: Complete
      this.reportProgress({
        stage: "complete",
        message: "Backup completed successfully!",
        progress: 100,
      });

      return metadata;
    } catch (error: any) {
      this.reportProgress({
        stage: "complete",
        message: `Backup failed: ${error.message}`,
        progress: 0,
      });
      throw error;
    }
  }

  private async writeBackupToFile(
    repoData: Uint8Array,
    did: string
  ): Promise<Metadata> {
    try {
      // Create backup directory structure
      await createBackupDir();
      const backupDir = await getBackupDir();

      let backupPath: string;
      if (this.overwriteBackups) {
        // Use a consistent name for overwriting
        backupPath = await join(backupDir, "current_backup");

        // Remove existing backup if it exists
        try {
          await remove(backupPath, { recursive: true });
        } catch (e) {
          // Directory might not exist, which is fine
        }
      } else {
        // Use timestamp-based naming, overwrite if exists for today
        const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        backupPath = await join(backupDir, `${timestamp}_backup`);

        // Remove existing backup for today if it exists
        try {
          await remove(backupPath, { recursive: true });
          console.log(`Overwriting existing backup for ${timestamp}`);
        } catch (e) {
          // Directory might not exist, which is fine
        }
      }

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

  private async downloadBlobsForBackup(metadata: Metadata): Promise<void> {
    try {
      const backupDir = await resolve(metadata.filePath, "..");
      const blobDir = await join(backupDir, "blobs");
      await mkdir(blobDir);

      // Extract blob references from the CAR file
      this.reportProgress({
        stage: "blobs",
        message: "Extracting blob references...",
        progress: 45,
      });

      const blobRefs = await this.extractBlobReferences();

      if (blobRefs.length === 0) {
        this.reportProgress({
          stage: "blobs",
          message: "No blobs found in backup",
          progress: 80,
        });
        console.log("No blobs found in backup");
        return;
      }

      console.log(`Downloading ${blobRefs.length} blobs...`);
      let downloadedCount = 0;

      for (let i = 0; i < blobRefs.length; i++) {
        const blobRef = blobRefs[i];
        const progress = 50 + Math.round((i / blobRefs.length) * 30); // 50-80% range

        this.reportProgress({
          stage: "blobs",
          message: `Downloading blob ${i + 1} of ${blobRefs.length}...`,
          progress,
          current: i + 1,
          total: blobRefs.length,
        });

        try {
          const blobData = await this.agent.com.atproto.sync.getBlob({
            did: metadata.did,
            cid: blobRef,
          });

          const blobPath = await join(blobDir, `${blobRef}.blob`);
          await writeFile(blobPath, blobData.data);
          downloadedCount++;

          // Optional: Save blob metadata
          const blobMetadata = {
            cid: blobRef,
            size: blobData.data.length,
            downloadedAt: new Date().toISOString(),
          };

          const blobMetadataPath = await join(blobDir, `${blobRef}.json`);
          await writeFile(
            blobMetadataPath,
            new TextEncoder().encode(JSON.stringify(blobMetadata, null, 2))
          );
        } catch (error) {
          console.error(`Failed to download blob ${blobRef}:`, error);
        }
      }

      // Update main metadata with blob information
      const updatedMetadata = {
        ...metadata,
        blobsPath: blobDir,
        blobCount: downloadedCount,
      };

      const metadataPath = await join(backupDir, "metadata.json");
      await writeFile(
        metadataPath,
        new TextEncoder().encode(JSON.stringify(updatedMetadata, null, 2))
      );

      this.reportProgress({
        stage: "blobs",
        message: `Downloaded ${downloadedCount}/${blobRefs.length} blobs`,
        progress: 80,
      });

      console.log(`Downloaded ${downloadedCount}/${blobRefs.length} blobs`);
    } catch (error) {
      console.error("Failed to download blobs:", error);
      // Don't throw - blob download failure shouldn't fail the entire backup
    }
  }

  private async extractBlobReferences(): Promise<string[]> {
    let allBlobs = [];
    let cursor: string | undefined;
    while (true) {
      const blobs = await this.agent.com.atproto.sync.listBlobs({
        did: this.agent.assertDid,
        limit: 500,
        cursor,
      });
      allBlobs.push(...blobs.data.cids);
      if (blobs.data.cursor) cursor = blobs.data.cursor;
      else break;
    }

    return allBlobs;
  }

  private async cleanupAllBackups(): Promise<void> {
    try {
      const backups = await this.getBackups();

      for (const backup of backups) {
        await this.deleteBackup(backup);
      }

      if (backups.length > 0) {
        console.log(`Deleted ${backups.length} existing backup(s)`);
      }
    } catch (error) {
      console.error("Failed to cleanup all backups:", error);
      // Don't throw here - we don't want backup creation to fail because of cleanup issues
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

  // Method to restore a specific blob
  async restoreBlob(
    backupMetadata: Metadata,
    blobCid: string
  ): Promise<Uint8Array | null> {
    if (!backupMetadata.blobsPath) {
      throw new Error("No blobs available for this backup");
    }

    try {
      const blobPath = await join(backupMetadata.blobsPath, `${blobCid}.blob`);
      const blobData = await readTextFile(blobPath);
      return new TextEncoder().encode(blobData);
    } catch (error) {
      console.error(`Failed to restore blob ${blobCid}:`, error);
      return null;
    }
  }
}

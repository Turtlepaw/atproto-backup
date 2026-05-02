import { Agent } from "@atproto/api";
import { createBackupDir, getBackupDir } from "./paths";
import { BaseDirectory, join, resolve } from "@tauri-apps/api/path";
import {
  mkdir,
  readDir,
  readFile,
  readTextFile,
  writeFile,
  remove,
  exists,
} from "@tauri-apps/plugin-fs";
import { CarStats, getCarStats } from "./stats";
import { settingsManager } from "./settings";
import { getPdsUrl, resolveHandle } from "@/Accounts";

export interface Account {
  did: string;
  handle?: string;
}

export interface Metadata {
  did: string;
  handle?: string;
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
  accountDid: string;
  accountHandle?: string;
}

export type ProgressCallback = (progress: ProgressInfo) => void;

/**
 * Sanitize a DID for use in filesystem paths by replacing invalid characters
 * Windows doesn't allow: < > : " / \ | ? *
 */
function sanitizeDidForPath(did: string): string {
  return did.replace(/:/g, "-");
}

export class BackupAgent {
  private maxBackups = 3;
  private downloadBlobs = true;
  private progressCallback?: ProgressCallback;
  private overwriteBackups = false;
  private agents: Map<string, Agent> = new Map();

  constructor(
    options?: {
      downloadBlobs?: boolean;
      onProgress?: ProgressCallback;
      overwriteBackups?: boolean;
    }
  ) {
    this.downloadBlobs = options?.downloadBlobs ?? true;
    this.progressCallback = options?.onProgress;
    this.overwriteBackups = options?.overwriteBackups ?? false;
  }

  private reportProgress(progress: ProgressInfo) {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  private async initializeAgent(account: Account): Promise<Agent> {
    const cacheKey = account.did;

    if (this.agents.has(cacheKey)) {
      return this.agents.get(cacheKey)!;
    }

    const pdsUrl = await getPdsUrl(account.did);
    const service = pdsUrl || "https://bsky.social";
    const agent = new Agent({ service });

    this.agents.set(cacheKey, agent);
    return agent;
  }

  async startBackup(accountDid?: string): Promise<Metadata> {
    const accountStrings = await settingsManager.getAccounts();
    if (accountStrings.length === 0) {
      throw new Error("No accounts available for backup");
    }

    // Filter to specific account if provided, otherwise backup the first account
    const targetAccount = accountDid || accountStrings[0];

    const account: Account = {
      did: targetAccount,
      handle: targetAccount.startsWith("did:") ? undefined : targetAccount,
    };

    return this.backupAccount(account);
  }

  async backupAllAccounts(): Promise<Metadata[]> {
    const accountStrings = await settingsManager.getAccounts();
    if (accountStrings.length === 0) {
      throw new Error("No accounts available for backup");
    }

    const results: Metadata[] = [];
    const totalAccounts = accountStrings.length;

    for (let i = 0; i < totalAccounts; i++) {
      const accountId = accountStrings[i];
      try {
        const account: Account = {
          did: accountId,
          handle: accountId.startsWith("did:") ? undefined : accountId,
        };
        const metadata = await this.backupAccount(account);
        results.push(metadata);
      } catch (error) {
        console.error(`Failed to backup account ${accountId}:`, error);
      }
    }

    return results;
  }

  private async backupAccount(account: Account): Promise<Metadata> {
    try {
      const agent = await this.initializeAgent(account);

      // Resolve DID if only handle is provided
      let did = account.did;
      let handle = account.handle;

      if (!did.startsWith("did:")) {
        did = await resolveHandle(did);
        handle = account.did;
      }

      // Stage 1: Fetching repo data
      this.reportProgress({
        stage: "fetching",
        message: `Fetching repository data for ${handle || did}...`,
        progress: 10,
        accountDid: did,
        accountHandle: handle,
      });

      const data = await agent.com.atproto.sync.getRepo({ did });

      // Stage 2: Writing backup file
      this.reportProgress({
        stage: "writing",
        message: `Writing backup to file for ${handle || did}...`,
        progress: 30,
        accountDid: did,
        accountHandle: handle,
      });

      const metadata = await this.writeBackupToFile(data.data, did, handle);

      // Stage 3: Download blobs if enabled
      if (this.downloadBlobs) {
        this.reportProgress({
          stage: "blobs",
          message: `Preparing to download blobs for ${handle || did}...`,
          progress: 40,
          accountDid: did,
          accountHandle: handle,
        });

        await this.downloadBlobsForBackup(metadata, agent, did, handle);
      } else {
        this.reportProgress({
          stage: "blobs",
          message: "Skipping blob download (disabled)",
          progress: 80,
          accountDid: did,
          accountHandle: handle,
        });
      }

      // Clean up old backups or overwrite existing one
      if (this.overwriteBackups) {
        this.reportProgress({
          stage: "cleanup",
          message: `Cleaning up previous backup for ${handle || did}...`,
          progress: 90,
          accountDid: did,
          accountHandle: handle,
        });
        await this.cleanupAllBackups(did);
      } else {
        this.reportProgress({
          stage: "cleanup",
          message: `Cleaning up old backups for ${handle || did}...`,
          progress: 90,
          accountDid: did,
          accountHandle: handle,
        });
        await this.cleanupOldBackups(did);
      }

      // Stage 5: Complete
      this.reportProgress({
        stage: "complete",
        message: `Backup completed successfully for ${handle || did}!`,
        progress: 100,
        accountDid: did,
        accountHandle: handle,
      });

      return metadata;
    } catch (error: any) {
      this.reportProgress({
        stage: "complete",
        message: `Backup failed for ${account.handle || account.did}: ${error.message}`,
        progress: 0,
        accountDid: account.did,
        accountHandle: account.handle,
      });
      throw error;
    }
  }

  private async writeBackupToFile(
    repoData: Uint8Array,
    did: string,
    handle?: string
  ): Promise<Metadata> {
    try {
      // Create backup directory structure
      await createBackupDir();
      const backupDir = await getBackupDir();

      // Create account-specific directory using sanitized DID
      const sanitizedDid = sanitizeDidForPath(did);
      const accountBackupDir = await join(backupDir, sanitizedDid);
      const dirExists = await exists(accountBackupDir, {
        baseDir: BaseDirectory.Document,
      });
      if (!dirExists) {
        await mkdir(accountBackupDir);
      }

      let backupPath: string;
      if (this.overwriteBackups) {
        // Use a consistent name for overwriting
        backupPath = await join(accountBackupDir, "current_backup");

        // Remove existing backup if it exists
        try {
          await remove(backupPath, { recursive: true });
        } catch (e) {
          // Directory might not exist, which is fine
        }
      } else {
        // Use timestamp-based naming, overwrite if exists for today
        const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        backupPath = await join(accountBackupDir, `${timestamp}_backup`);

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
      const metadata: Metadata = {
        did: did,
        handle: handle,
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

  private async downloadBlobsForBackup(
    metadata: Metadata,
    agent: Agent,
    did: string,
    handle?: string
  ): Promise<void> {
    try {
      const backupDir = await resolve(metadata.filePath, "..");
      const blobDir = await join(backupDir, "blobs");
      await mkdir(blobDir);

      // Extract blob references from the CAR file
      this.reportProgress({
        stage: "blobs",
        message: `Extracting blob references for ${handle || did}...`,
        progress: 45,
        accountDid: did,
        accountHandle: handle,
      });

      const blobRefs = await this.extractBlobReferences(agent, did);

      if (blobRefs.length === 0) {
        this.reportProgress({
          stage: "blobs",
          message: "No blobs found in backup",
          progress: 80,
          accountDid: did,
          accountHandle: handle,
        });
        console.log("No blobs found in backup");
        return;
      }

      console.log(`Processing ${blobRefs.length} blobs...`);
      let downloadedCount = 0;
      let copiedCount = 0;

      // Build a map of existing blobs from previous backups
      const existingBlobsMap = await this.findExistingBlobs(did);

      for (let i = 0; i < blobRefs.length; i++) {
        const blobRef = blobRefs[i];
        const progress = 50 + Math.round((i / blobRefs.length) * 30); // 50-80% range

        // Check if blob already exists from a previous backup
        if (existingBlobsMap.has(blobRef)) {
          const existingBlobPath = existingBlobsMap.get(blobRef)!;

          this.reportProgress({
            stage: "blobs",
            message: `Copying existing blob ${i + 1} of ${blobRefs.length} for ${handle || did}...`,
            progress,
            current: i + 1,
            total: blobRefs.length,
            accountDid: did,
            accountHandle: handle,
          });

          try {
            // Copy existing blob instead of downloading
            const blobData = await readFile(existingBlobPath);
            const blobPath = await join(blobDir, `${blobRef}.blob`);
            await writeFile(blobPath, blobData);

            // Copy metadata if it exists
            const existingMetadataPath = existingBlobPath.replace(/\.blob$/, ".json");
            try {
              const blobMetadata = await readTextFile(existingMetadataPath);
              const blobMetadataPath = await join(blobDir, `${blobRef}.json`);
              await writeFile(
                blobMetadataPath,
                new TextEncoder().encode(blobMetadata)
              );
            } catch (e) {
              // Metadata might not exist, which is fine
            }

            copiedCount++;
            console.log(`Copied blob ${blobRef} from previous backup`);
          } catch (error) {
            console.error(`Failed to copy blob ${blobRef}:`, error);
            // Fall through to download if copy fails
            downloadedCount += await this.downloadSingleBlob(
              agent,
              blobRef,
              blobDir,
              metadata.did
            );
          }
        } else {
          // Blob doesn't exist, download it
          this.reportProgress({
            stage: "blobs",
            message: `Downloading blob ${i + 1} of ${blobRefs.length} for ${handle || did}...`,
            progress,
            current: i + 1,
            total: blobRefs.length,
            accountDid: did,
            accountHandle: handle,
          });

          downloadedCount += await this.downloadSingleBlob(
            agent,
            blobRef,
            blobDir,
            metadata.did
          );
        }
      }

      // Update main metadata with blob information
      const updatedMetadata = {
        ...metadata,
        blobsPath: blobDir,
        blobCount: downloadedCount + copiedCount,
      };

      const metadataPath = await join(backupDir, "metadata.json");
      await writeFile(
        metadataPath,
        new TextEncoder().encode(JSON.stringify(updatedMetadata, null, 2))
      );

      this.reportProgress({
        stage: "blobs",
        message: `Processed ${downloadedCount + copiedCount}/${blobRefs.length} blobs (${downloadedCount} downloaded, ${copiedCount} copied from cache) for ${handle || did}`,
        progress: 80,
        accountDid: did,
        accountHandle: handle,
      });

      console.log(
        `Processed ${downloadedCount + copiedCount}/${blobRefs.length} blobs (${downloadedCount} downloaded, ${copiedCount} from cache)`
      );
    } catch (error) {
      console.error("Failed to process blobs:", error);
      // Don't throw - blob processing failure shouldn't fail the entire backup
    }
  }

  private async downloadSingleBlob(
    agent: Agent,
    blobRef: string,
    blobDir: string,
    did: string
  ): Promise<number> {
    try {
      const blobData = await agent.com.atproto.sync.getBlob({
        did,
        cid: blobRef,
      });

      const blobPath = await join(blobDir, `${blobRef}.blob`);
      await writeFile(blobPath, blobData.data);

      // Save blob metadata
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

      return 1;
    } catch (error) {
      console.error(`Failed to download blob ${blobRef}:`, error);
      return 0;
    }
  }

  private async findExistingBlobs(
    did: string
  ): Promise<Map<string, string>> {
    const existingBlobs = new Map<string, string>();

    try {
      const backupDir = await getBackupDir();
      const sanitizedDid = sanitizeDidForPath(did);
      const accountBackupDir = await join(backupDir, sanitizedDid);

      // Check if account backup directory exists
      const dirExists = await exists(accountBackupDir, {
        baseDir: BaseDirectory.Document,
      });
      if (!dirExists) return existingBlobs;

      // List all backup directories for this account
      const backupDirs = await readDir(accountBackupDir);

      for (const backupEntry of backupDirs) {
        if (!backupEntry.isDirectory) continue;

        // Look for blobs directory in each backup
        const blobsDirPath = await join(accountBackupDir, backupEntry.name, "blobs");
        const blobsDirExists = await exists(blobsDirPath, {
          baseDir: BaseDirectory.Document,
        });

        if (!blobsDirExists) continue;

        // Index all .blob files in this backup
        const blobFiles = await readDir(blobsDirPath);
        for (const blobFile of blobFiles) {
          if (blobFile.name.endsWith(".blob")) {
            const cid = blobFile.name.replace(".blob", "");
            const blobFilePath = await join(blobsDirPath, blobFile.name);
            // Store the full path to the blob
            existingBlobs.set(cid, blobFilePath);
          }
        }
      }

      console.log(`Found ${existingBlobs.size} existing blobs for reuse`);
    } catch (error) {
      console.error("Failed to scan for existing blobs:", error);
    }

    return existingBlobs;
  }

  private async extractBlobReferences(
    agent: Agent,
    did: string
  ): Promise<string[]> {
    let allBlobs: string[] = [];
    let cursor: string | undefined;
    while (true) {
      const blobs = await agent.com.atproto.sync.listBlobs({
        did: did,
        limit: 500,
        cursor,
      });
      allBlobs.push(...blobs.data.cids);
      if (blobs.data.cursor) cursor = blobs.data.cursor;
      else break;
    }

    return allBlobs;
  }

  private async cleanupAllBackups(did: string): Promise<void> {
    try {
      const backups = await this.getBackups(did);

      for (const backup of backups) {
        await this.deleteBackup(backup, did);
      }

      if (backups.length > 0) {
        console.log(`Deleted ${backups.length} existing backup(s) for ${did}`);
      }
    } catch (error) {
      console.error("Failed to cleanup all backups:", error);
      // Don't throw here - we don't want backup creation to fail because of cleanup issues
    }
  }

  private async cleanupOldBackups(did: string): Promise<void> {
    try {
      const backups = await this.getBackups(did);

      // Sort backups by timestamp (newest first)
      const sortedBackups = backups.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // If we have more than maxBackups, delete the oldest ones
      if (sortedBackups.length > this.maxBackups) {
        const backupsToDelete = sortedBackups.slice(this.maxBackups);

        for (const backup of backupsToDelete) {
          await this.deleteBackup(backup, did);
        }

        console.log(`Deleted ${backupsToDelete.length} old backup(s)`);
      }
    } catch (error) {
      console.error("Failed to cleanup old backups:", error);
      // Don't throw here - we don't want backup creation to fail because of cleanup issues
    }
  }

  private async deleteBackup(backup: Metadata, targetDid: string): Promise<void> {
    try {
      const rootBackupDir = await getBackupDir();
      const sanitizedDid = sanitizeDidForPath(targetDid);
      const accountBackupDir = await join(rootBackupDir, sanitizedDid);
      const dir = await readDir(accountBackupDir);

      // Find the backup directory that contains this backup
      for (const backupDir of dir) {
        if (backupDir.isDirectory) {
          const backupPath = await resolve(accountBackupDir, backupDir.name);
          const metadataPath = await join(backupPath, "metadata.json");

          try {
            const metadata = await readTextFile(metadataPath);
            const parsedMetadata: Metadata = JSON.parse(metadata);

            // Check if this is the backup we want to delete
            if (parsedMetadata.timestamp === backup.timestamp) {
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

  async getBackups(did?: string): Promise<Metadata[]> {
    const data: Metadata[] = [];
    await createBackupDir();
    const rootBackupDir = await getBackupDir();

    try {
      const didsToCheck: Array<{ sanitized: string; original?: string }> = [];

      // If a specific DID provided, use its sanitized form
      if (did) {
        const sanitized = sanitizeDidForPath(did);
        didsToCheck.push({ sanitized, original: did });
      } else {
        // Get all DID directories and track their sanitized names
        const rootContents = await readDir(rootBackupDir);
        for (const item of rootContents) {
          if (item.isDirectory) {
            didsToCheck.push({ sanitized: item.name });
          }
        }
      }

      // Process each DID directory
      for (const didInfo of didsToCheck) {
        const didBackupDir = await join(rootBackupDir, didInfo.sanitized);

        try {
          const dir = await readDir(didBackupDir);

          for (const backupDir of dir) {
            if (backupDir.isDirectory) {
              const backupPath = await resolve(didBackupDir, backupDir.name);
              const metadataPath = await join(backupPath, "metadata.json");

              try {
                const metadata = await readTextFile(metadataPath);
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
        } catch (e) {
          // Account directory might not exist yet
          continue;
        }
      }
    } catch (error) {
      console.error("Failed to get backups:", error);
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

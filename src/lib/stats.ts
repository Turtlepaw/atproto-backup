import { RepoReader } from "@atcute/car/v4";

export interface CarStats {
  totalBlocks: number;
  totalSize: number;
  recordCount: number;
  recordTypes: Record<string, number>;
  fileSize: number;
  collections: string[];
  createdAt: string;
}

export async function getCarStats(carData: Uint8Array): Promise<CarStats> {
  try {
    // Parse the CAR file
    await using repo = RepoReader.fromUint8Array(carData);

    let totalBlocks = 0;
    let totalSize = 0;
    let recordCount = 0;
    const recordTypes: Record<string, number> = {};
    const collections = new Set<string>();

    // Iterate through all blocks in the CAR file
    for await (const record of repo) {
      totalBlocks++;

      try {
        // Try to decode the block as a record
        if (record) {
          // Count different record types
          const type = (record.record as any)["$type"]
          if (type) {
            recordTypes[type] = (recordTypes[type] || 0) + 1;
            recordCount++;

            // Extract collection name
            collections.add(type);
          }
        }
      } catch (e) {
        // Not all blocks are records, some are structural
        continue;
      }
    }

    return {
      totalBlocks,
      totalSize,
      recordCount,
      recordTypes,
      fileSize: carData.length,
      collections: Array.from(collections),
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error parsing CAR file:", error);
    throw new Error(`Failed to parse CAR file: ${error}`);
  }
}

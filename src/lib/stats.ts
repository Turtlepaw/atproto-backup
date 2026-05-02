import { fromStream } from "@atcute/car";
import * as dagCbor from '@ipld/dag-cbor';

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
    let totalBlocks = 0;
    let totalSize = 0;
    let recordCount = 0;
    const recordTypes: Record<string, number> = {};
    const collections = new Set<string>();

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(carData);
        controller.close();
      },
    });
    const car = fromStream(stream);

    try {
      for await (const entry of car) {
        totalBlocks++;

        try {
          // Try to decode the block as a record
          if (entry) {
            // Count different record types
            const record = dagCbor.decode(entry.bytes);
            const type = (record as any)["$type"];
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
    } finally {
      await car.dispose();
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

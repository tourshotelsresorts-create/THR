import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const dir = path.resolve(process.cwd(), "storage");

export async function storeObject(key: string, bytes: Uint8Array, _contentType: string): Promise<string> {
  if (process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY) {
    // Optional S3 path — local filesystem is the default for error-less local/dev.
  }
  await mkdir(path.dirname(path.join(dir, key)), { recursive: true });
  await writeFile(path.join(dir, key), bytes);
  return `/files/${key}`;
}

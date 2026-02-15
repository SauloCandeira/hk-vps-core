import fs from 'fs';
import path from 'path';

export const safeExists = (targetPath: string) => {
  try { return fs.existsSync(targetPath); } catch { return false; }
};

export const safeListDir = (targetPath: string) => {
  try { return fs.readdirSync(targetPath); } catch { return [] as string[]; }
};

export const safeReadFile = (targetPath: string, encoding: BufferEncoding = 'utf-8') => {
  try { return fs.readFileSync(targetPath, encoding); } catch { return null; }
};

export const safeStat = (targetPath: string) => {
  try { return fs.statSync(targetPath); } catch { return null; }
};

export const listDirectories = (targetPath: string) => {
  try {
    return fs.readdirSync(targetPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [] as string[];
  }
};

export const listFilesByMtime = (targetPath: string) => {
  return safeListDir(targetPath)
    .map((name) => ({ name, fullPath: path.join(targetPath, name) }))
    .map((entry) => ({ ...entry, stat: safeStat(entry.fullPath) }))
    .filter((entry) => entry.stat && entry.stat.isFile())
    .sort((a, b) => (b.stat!.mtimeMs || 0) - (a.stat!.mtimeMs || 0));
};

export const readFileTail = (targetPath: string, maxBytes = 20000) => {
  try {
    const stats = fs.statSync(targetPath);
    const start = Math.max(0, stats.size - maxBytes);
    const length = stats.size - start;
    const buffer = Buffer.alloc(length);
    const fd = fs.openSync(targetPath, 'r');
    fs.readSync(fd, buffer, 0, length, start);
    fs.closeSync(fd);
    return buffer.toString('utf-8');
  } catch {
    return null;
  }
};

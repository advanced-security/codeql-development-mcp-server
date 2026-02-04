/**
 * File system utilities for integration testing
 */

import fs from "fs";
import path from "path";

/**
 * Compare two directories file by file
 */
export function compareDirectories(actualDir, expectedDir) {
  try {
    const actualFiles = getDirectoryFiles(actualDir);
    const expectedFiles = getDirectoryFiles(expectedDir);

    // Check if file lists match
    if (actualFiles.length !== expectedFiles.length) {
      return false;
    }

    const actualFileNames = actualFiles.map((f) => path.relative(actualDir, f)).sort();
    const expectedFileNames = expectedFiles.map((f) => path.relative(expectedDir, f)).sort();

    for (let i = 0; i < actualFileNames.length; i++) {
      if (actualFileNames[i] !== expectedFileNames[i]) {
        return false;
      }
    }

    // Compare file contents
    for (const fileName of actualFileNames) {
      const actualFile = path.join(actualDir, fileName);
      const expectedFile = path.join(expectedDir, fileName);

      if (!compareFiles(actualFile, expectedFile)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Compare two files content
 */
export function compareFiles(file1, file2) {
  try {
    const content1 = fs.readFileSync(file1, "utf8");
    const content2 = fs.readFileSync(file2, "utf8");
    return content1 === content2;
  } catch {
    return false;
  }
}

/**
 * Copy directory contents recursively
 */
export function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Get all files in a directory recursively
 */
export function getDirectoryFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getDirectoryFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Remove directory and all contents
 */
export function removeDirectory(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Compare two objects for equality
 */
export function compareObjects(obj1, obj2) {
  try {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  } catch {
    return false;
  }
}

/**
 * Deep clone an object
 */
export function deepClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return null;
  }
}

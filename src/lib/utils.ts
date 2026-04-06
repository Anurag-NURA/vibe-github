import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { type TreeItem } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a collection of files into a tree structure for the file explorer.
 * @param files - A dictionary mapping file paths to their contents.
 * @returns An array of tree items representing the file structure.
 *
 * @example
 * Input: {"app.tsx": "code...", "components/button.tsx": "code...", "components/card.tsx": "code..."}
 * Output: [
 *   "app.tsx",
 *   ["components", "button.tsx", "card.tsx"]
 * ]
 */

export function convertFilesToTreeItems(files: {
  [path: string]: string;
}): TreeItem[] {
  interface TreeNode {
    [key: string]: TreeNode | null;
  }

  const tree: TreeNode = {};

  const sortedPaths = Object.keys(files).sort();

  for (const filePath of sortedPaths) {
    const parts = filePath.split("/");
    let current = tree;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];

      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    const fileName = parts[parts.length - 1];
    current[fileName] = null;
  }

  function convertNode(node: TreeNode, name?: string): TreeItem[] | TreeItem {
    const entries = Object.entries(node);

    if (entries.length === 0) {
      return name || "";
    }

    const children: TreeItem[] = [];

    for (const [key, childNode] of entries) {
      if (childNode === null) {
        //this is a file
        children.push(key);
      } else {
        //this is a directory
        const subtree = convertNode(childNode, key);
        if (Array.isArray(subtree)) {
          children.push([key, ...subtree]);
        } else {
          children.push([key, subtree]);
        }
      }
    }
    return children;
  }
  const result = convertNode(tree);
  return Array.isArray(result) ? result : [result];
}

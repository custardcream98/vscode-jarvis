import { getFileContent } from "./file";

import fs from "fs";
import { globSync } from "glob";
import path from "path";

const DEFAULT_IGNORED_FILES = [".git", "node_modules", "DS_Store"];

export const parseGitIgnore = (targetDirectory: string): string[] => {
  const fileTree = fs
    .readdirSync(targetDirectory, { withFileTypes: true })
    .filter((directory) => !/(node_modules|.git)$/.test(directory.name))
    .map((directory) => {
      if (directory.isFile()) {
        if (directory.name === ".gitignore") {
          const pathsToIgnore = getFileContent({
            filePath: path.resolve(targetDirectory, ".gitignore"),
          })
            .split("\n")
            .filter((line) => !!line);

          const matchedFileDirectories = pathsToIgnore
            .map((glob) =>
              globSync(glob, {
                absolute: true,
                cwd: targetDirectory,
              }),
            )
            .flat();

          return [...matchedFileDirectories, `${targetDirectory}/.gitignore`];
        }

        return "";
      }

      const subFileTree = parseGitIgnore(`${targetDirectory}/${directory.name}`);

      return subFileTree;
    })
    .flat(2)
    .filter((file) => !!file);

  return fileTree;
};

const walkProjectTree = (projectDirectory: string, filesToIgnore: string[] = []): string[] => {
  const fileTree = fs
    .readdirSync(projectDirectory, { withFileTypes: true })
    .map((dirent) => {
      if (
        filesToIgnore.includes(`${projectDirectory}/${dirent.name}`) ||
        DEFAULT_IGNORED_FILES.includes(dirent.name)
      ) {
        return "";
      }

      if (dirent.isDirectory()) {
        const subFileTree = walkProjectTree(`${projectDirectory}/${dirent.name}`, filesToIgnore);

        return subFileTree;
      }

      return `${projectDirectory}/${dirent.name}`;
    })
    .flat(2)
    .filter((directory) => !!directory)
    .map((file) => file.trim());

  return fileTree;
};

export const getProjectFileTree = (
  projectDirectory: string,
  filesToIgnore: string[] = [],
): string => {
  const fileTree = walkProjectTree(projectDirectory, filesToIgnore);

  return fileTree.map((file) => file.replace(new RegExp(`^${projectDirectory}\/`), "")).join("\n");
  // Remove the project directory from the file path
  // This will help reduce the number of tokens used in the completion
};

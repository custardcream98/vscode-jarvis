import fs from "fs";

export const getProjectFileTree = (
  projectDirectory: string,
  filesToIgnore: string[] = []
): string => {
  const fileTree = fs
    .readdirSync(projectDirectory, { withFileTypes: true })
    .map((dirent) => {
      if (
        dirent.isDirectory() &&
        !filesToIgnore.includes(dirent.name) &&
        dirent.name !== "node_modules" &&
        dirent.name !== ".git"
      ) {
        const subFileTree = getProjectFileTree(
          `${projectDirectory}/${dirent.name}`,
          filesToIgnore
        );

        return subFileTree;
      } else {
        return `${projectDirectory}/${dirent.name}`;
      }
    })
    .join("\n");

  return fileTree;
};

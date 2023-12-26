import fs from "fs";
import path from "path";

export const getFileContent = (filePath: string) => {
  try {
    const fileContent = fs.readFileSync(filePath, "utf8");

    return fileContent;
  } catch (err) {
    return "";
  }
};

export const getFilesToIgnore = (targetDirectory: string) => {
  const gitignore = getFileContent(path.resolve(targetDirectory, "./.gitignore"));

  const filesToIgnore = gitignore.split("\n");

  return filesToIgnore;
};

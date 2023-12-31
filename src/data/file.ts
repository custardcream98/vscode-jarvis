import fs from "fs";

export const getFileContent = ({ filePath }: { filePath: string }) => {
  try {
    const fileContent = fs.readFileSync(filePath, "utf8");

    return fileContent;
  } catch (err) {
    return "";
  }
};

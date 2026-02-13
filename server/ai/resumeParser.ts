import mammoth from "mammoth";

export async function parseResume(filePath: string) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

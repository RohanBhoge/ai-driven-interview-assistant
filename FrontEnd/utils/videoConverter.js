import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/ffmpeg"
const ffmpeg = new FFmpeg();

export const convertWebmToMp4 = async (webmBlob) => {
  try {
    await ffmpeg.load();

    const inputName = "input.webm";
    const outputName = "output.mp4";

      await ffmpeg.writeFile(inputName, await fetchFile(webmBlob));
    await ffmpeg.exec([
      "-i",
      inputName,
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-movflags",
      "faststart",
      "-pix_fmt",
      "yuv420p",
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    return new Blob([data], { type: "video/mp4" });
  } catch (error) {
    console.error("Conversion error:", error);
    throw error;
  }
};
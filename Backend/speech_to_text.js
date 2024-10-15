// import Speech from "@google-cloud/speech";

// const speech = Speech.v1p1beta1;

// // Creates a client
// const client = new speech.SpeechClient();

// const config = {
//   encoding: "LINEAR16",
//   languageCode: "en-US",
//   audioChannelCount: 2,
//   enableSeparateRecognitionPerChannel: true,
// };

// const audio = {
//   uri: gcsUri,
// };

// const request = {
//   config: config,
//   audio: audio,
// };

// const [response] = await client.recognize(request);
// const transcription = response.results
//   .map(
//     (result) =>
//       ` Channel Tag: ${result.channelTag} ${result.alternatives[0].transcript}`
//   )
//   .join("\n");
// console.log(`Transcription: \n${transcription}`);

// const encoding = 'LINEAR16';
// const sampleRateHertz = 16000;
// const languageCode = 'en-US';
// const streamingLimit = 10000; // ms - set to low number for demo purposes

import chalk from "chalk";
import { Writable } from "stream";
import recorder from "node-record-lpcm16";
import Speech from "@google-cloud/speech";

const encoding = "LINEAR16"; // Example encoding, adjust it based on your requirements
const sampleRateHertz = 16000; // Set your sample rate here
const languageCode = "en-US"; // Set your language code here
// Imports the Google Cloud client library
// Currently, only v1p1beta1 contains result-end-time
const speech = Speech.v1p1beta1;

const client = new speech.SpeechClient();

const config = {
  encoding: encoding,
  sampleRateHertz: sampleRateHertz,
  languageCode: languageCode,
};

const request = {
  config,
  interimResults: true,
};

let recognizeStream = null;
let restartCounter = 0;
let audioInput = [];
let lastAudioInput = [];
let resultEndTime = 0;
let isFinalEndTime = 0;
let finalRequestEndTime = 0;
let newStream = true;
let bridgingOffset = 0;
let lastTranscriptWasFinal = false;

function startStream() {
  // Clear current audioInput
  audioInput = [];
  // Initiate (Reinitiate) a recognize stream
  recognizeStream = client
    .streamingRecognize(request)
    .on("error", (err) => {
      if (err.code === 11) {
        // restartStream();
      } else {
        console.error("API request error " + err);
      }
    })
    .on("data", speechCallback);

  // Restart stream when streamingLimit expires
  setTimeout(() => restartStream, 10000);
  console.log("Hi");
}

const speechCallback = (stream) => {
  // Convert API result end time from seconds + nanoseconds to milliseconds
  resultEndTime =
    stream.results[0].resultEndTime.seconds * 1000 +
    Math.round(stream.results[0].resultEndTime.nanos / 1000000);

  // Calculate correct time based on offset from audio sent twice
  const correctedTime =
    resultEndTime - bridgingOffset + streamingLimit * restartCounter;

  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  let stdoutText = "";
  if (stream.results[0] && stream.results[0].alternatives[0]) {
    stdoutText =
      correctedTime + ": " + stream.results[0].alternatives[0].transcript;
  }

  if (stream.results[0].isFinal) {
    process.stdout.write(chalk.green(`${stdoutText}\n`));

    isFinalEndTime = resultEndTime;
    lastTranscriptWasFinal = true;
  } else {
    // Make sure transcript does not exceed console character length
    if (stdoutText.length > process.stdout.columns) {
      stdoutText = stdoutText.substring(0, process.stdout.columns - 4) + "...";
    }
    process.stdout.write(chalk.red(`${stdoutText}`));

    lastTranscriptWasFinal = false;
  }
};

const audioInputStreamTransform = new Writable({
  write(chunk, encoding, next) {
    if (newStream && lastAudioInput.length !== 0) {
      // Approximate math to calculate time of chunks
      const chunkTime = streamingLimit / lastAudioInput.length;
      if (chunkTime !== 0) {
        if (bridgingOffset < 0) {
          bridgingOffset = 0;
        }
        if (bridgingOffset > finalRequestEndTime) {
          bridgingOffset = finalRequestEndTime;
        }
        const chunksFromMS = Math.floor(
          (finalRequestEndTime - bridgingOffset) / chunkTime
        );
        bridgingOffset = Math.floor(
          (lastAudioInput.length - chunksFromMS) * chunkTime
        );

        for (let i = chunksFromMS; i < lastAudioInput.length; i++) {
          recognizeStream.write(lastAudioInput[i]);
        }
      }
      newStream = false;
    }

    audioInput.push(chunk);

    if (recognizeStream) {
      recognizeStream.write(chunk);
    }

    next();
  },

  final() {
    if (recognizeStream) {
      recognizeStream.end();
    }
  },
});

function restartStream() {
  console.log("Hi rohan");

  if (recognizeStream) {
    recognizeStream.end();
    recognizeStream.removeListener("data", speechCallback);
    recognizeStream = null;
  }
  if (resultEndTime > 0) {
    finalRequestEndTime = isFinalEndTime;
  }
  resultEndTime = 0;

  lastAudioInput = [];
  lastAudioInput = audioInput;

  restartCounter++;

  if (!lastTranscriptWasFinal) {
    process.stdout.write("\n");
  }
  process.stdout.write(
    chalk.yellow(`${10000 * restartCounter}: RESTARTING REQUEST\n`)
  );

  newStream = true;

  startStream();
}
// Start recording and send the microphone input to the Speech API
recorder
  .record({
    sampleRateHertz: sampleRateHertz,
    threshold: 0, // Silence threshold
    silence: 1000,
    keepSilence: true,
    recordProgram: "rec", // Try also "arecord" or "sox"
  })
  .stream()
  .on("error", (err) => {
    console.error("Audio recording error " + err);
  })
  .pipe(audioInputStreamTransform);

console.log("hi this is line 212");
console.log("");
console.log("Listening, press Ctrl+C to stop.");
console.log("");
console.log("End (ms)       Transcript Results/Status");
console.log("=========================================================");

startStream();

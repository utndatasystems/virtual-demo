const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const csv = require("csv-parser"); // Assuming you're using a library for CSV parsing
const nodecallspython = require("node-calls-python");

let mainWindow;

app.on("ready", () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  mainWindow.loadFile("start.html");

  // Register a global shortcut (Ctrl+Shift+I or Cmd+Opt+I on macOS) to toggle DevTools
  globalShortcut.register("Ctrl+Shift+I", () => {
    mainWindow.webContents.toggleDevTools();
  });
});

ipcMain.handle("open-quiz", (event, quizNum) => {
  mainWindow.loadURL(`file://${path.join(__dirname, "quiz.html")}?quizNum=${quizNum}`);
});

ipcMain.handle("getResults", (event, playerName) => {
  return new Promise((resolve, reject) => {
    const pythonPath = "/usr/local/anaconda3/bin/python3"; // Adjust path if needed
    const scriptPath = path.join(__dirname, "result.py");

    const process = spawn(pythonPath, [scriptPath, playerName]);

    let resultData = "";

    // Collect Python script output
    process.stdout.on("data", (data) => {
      resultData += data.toString();
    });

    // Handle script completion
    process.on("close", (code) => {
      if (code === 0) {
        try {
          const parsedData = JSON.parse(resultData);
          resolve(parsedData); // Send parsed JSON to frontend
        } catch (err) {
          reject(new Error("Failed to parse JSON from Python script"));
        }
      } else {
        reject(new Error(`Python script exited with code ${code}`));
      }
    });

    process.stderr.on("data", (err) => {
      console.error("Python Error:", err.toString());
      reject(new Error("Error in Python script execution"));
    });
  });
});

ipcMain.handle("getLeaderboard", async () => {
  try {
    const filePath = path.join(__dirname, "leaderboard.json"); // JSON file for leaderboard
    const rawData = fs.readFileSync(filePath, "utf-8");
    const leaderboard = JSON.parse(rawData);

    return leaderboard; // Send leaderboard data to frontend
  } catch (error) {
    console.error("Error loading leaderboard:", error);
    return [];
  }
});

ipcMain.handle("verify", async (event, { quizNum, functionInput, totalSeconds }) => {
  return new Promise((resolve, reject) => {
    const pythonPath = "/usr/local/anaconda3/bin/python3";
    const scriptPath = path.join(__dirname, "verify.py");

    const process = spawn(pythonPath, [scriptPath, quizNum, functionInput, totalSeconds]);

    process.stdout.on("data", (data) => {
      console.log("Script output:\n", data.toString());
      return data.toString();
    });

    process.stderr.on("data", (err) => {
      console.error("Error:", err.toString());
    });
  });
});

// ipcMain.handle("run-query", async (event, { query, filePath }) => {
//   return new Promise((resolve, reject) => {
//     const pythonPath = "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3";
//     const scriptPath = path.join(__dirname, "run_query.py");

//     const process = spawn(pythonPath, [scriptPath, query, filePath]);

//     process.stdout.on("data", (data) => {
//       console.log("Script output:\n", data.toString());
//     });

//     process.stderr.on("data", (err) => {
//       console.error("Error:", err.toString());
//     });

//     process.on("close", async (code) => {
//       if (code === 0) {
//         try {
//           const result = await fsp.readFile("result.json", { encoding: "utf8" });
//           resolve(JSON.parse(result));
//         } catch (err) {
//           reject(`Failed to read or parse the file: ${err.message}`);
//         }
//       } else {
//         reject(`Python script exited with code ${code}`);
//       }
//     });
//   });
// });

// Listen for the readCsv request from renderer
ipcMain.handle("read-csv", async (event, quizNum) => {
  try {
    const rows = [];
    const filePath = path.join(__dirname, "quizs", `quiz${quizNum}.csv`);
    console.log(filePath);

    const fileStream = fs.createReadStream(filePath).pipe(csv());
    fileStream.on("data", (data) => rows.push(data));
    await new Promise((resolve, reject) => {
      fileStream.on("end", resolve);
      fileStream.on("error", reject);
    });
    console.log(rows);
    return rows;
  } catch (err) {
    console.error("Error reading CSV:", err);
    throw new Error("Failed to read CSV");
  }
});

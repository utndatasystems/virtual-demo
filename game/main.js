const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const math = require("mathjs");
const csv = require("csv-parser"); // Assuming you're using a library for CSV parsing
const nodecallspython = require("node-calls-python");

let mainWindow;
let globalQuizData = {}; // Store results in memory

app.on("ready", () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  mainWindow.loadFile("html/index.html");

  // Register a global shortcut (Ctrl+Shift+I or Cmd+Opt+I on macOS) to toggle DevTools
  globalShortcut.register("Ctrl+Shift+I", () => {
    mainWindow.webContents.toggleDevTools();
  });
});

ipcMain.handle("open-quiz", (event, { quizNum, timeStart }) => {
  if (quizNum === 1) {
    globalQuizData = {};
  }
  mainWindow.loadURL(
    `file://${path.join(__dirname, "html/quiz.html")}?quizNum=${quizNum}&timeStart=${timeStart}`
  );
});

ipcMain.handle("getResults", (event, playerName) => {
  return new Promise((resolve, reject) => {
    const pythonPath = "python"; // Adjust path if needed
    const scriptPath = path.join(__dirname, "scripts/result.py");

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

// ipcMain.handle("verify", async (event, { quizNum, functionInput, totalSeconds }) => {
//   return new Promise((resolve, reject) => {
//     const pythonPath = "python";
//     const scriptPath = path.join(__dirname, "scripts/verify.py");

//     const process = spawn(pythonPath, [scriptPath, quizNum, functionInput, totalSeconds]);
//     let outputData = "";

//     process.stdout.on("data", (data) => {
//       console.log("Script output:\n", data.toString());
//       outputData += data.toString();
//     });

//     process.stderr.on("data", (err) => {
//       console.error("Error:", err.toString());
//     });

//     // Resolve the promise when the script finishes
//     process.on("close", (code) => {
//       console.log(`Python script exited with code ${code}`);
//       resolve(outputData.trim()); // Send final output when script ends
//     });

//     process.on("error", (err) => {
//       console.error("Failed to start Python process:", err);
//       reject(err.toString());
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

async function verifyEquation(quizNum, functionInput) {
  quizNum = parseInt(quizNum);
  const csvPath = path.join(__dirname, "./quizs", `quiz${quizNum}.csv`);

  if (!fs.existsSync(csvPath)) {
    console.error("CSV file not found:", csvPath);
    return false;
  }

  if (functionInput === "None") return false;

  // Check equation correctness
  console.log("Checking equation:", functionInput);
  return await checkEquation(csvPath, functionInput);
}

// ✅ Function to Check Equation Against CSV Data
function checkEquation(csvPath, equation) {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => results.push(row))
      .on("end", () => {
        try {
          // equation = equation.replace("=", "=="); // Convert Python-style equation
          equationLeft = equation.split("=")[0].trim();
          equationRight = equation.split("=")[1].trim();
          // console.log("Equation Left:", equationLeft);
          // console.log("Equation Right:", equationRight);
          const allCorrect = results.every((row) => {
            const variables = Object.fromEntries(
              Object.entries(row).map(([key, value]) => [key, parseFloat(value)])
            );
            // console.log("Result Left:", math.evaluate(equationLeft, variables));
            // console.log("Result Right:", math.evaluate(equationRight, variables));

            if (
              math.evaluate(equationLeft, variables) === math.evaluate(equationRight, variables)
            ) {
              return true;
            } else {
              return false;
            }
          });
          resolve(allCorrect);
        } catch (error) {
          // console.error("Equation Error:", error);
          resolve(false);
        }
      })
      .on("error", (error) => {
        console.error("CSV Read Error:", error);
        reject(false);
      });
  });
}

ipcMain.handle("verify", async (event, { quizNum, functionInput, totalSeconds }) => {
  try {
    const status = await verifyEquation(quizNum, functionInput);

    // Store result in memory instead of JSON
    globalQuizData[quizNum] = {
      input: functionInput,
      status: status,
      time: totalSeconds
    };
    console.log("Quiz Data:", globalQuizData);

    return status;
  } catch (error) {
    console.error("Verification failed:", error);
    return false;
  }
});

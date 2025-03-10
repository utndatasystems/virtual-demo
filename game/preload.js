const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  readCsv: (quizNum) => ipcRenderer.invoke("read-csv", quizNum),
  runVerify: (quizNum, functionInput, totalSeconds) =>
    ipcRenderer.invoke("verify", { quizNum, functionInput, totalSeconds }),
  openQuiz: (quizNum, timeStart) => ipcRenderer.invoke("open-quiz", { quizNum, timeStart }),
  getResults: (playerName) => ipcRenderer.invoke("getResults", playerName),
  getLeaderboard: () => ipcRenderer.invoke("getLeaderboard")
});

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  readCsv: (quizNum) => ipcRenderer.invoke("read-csv", quizNum),
  runVerify: (quizNum, functionInput, totalSeconds) =>
    ipcRenderer.invoke("verify", { quizNum, functionInput, totalSeconds }),
  openQuiz: (quizNum) => ipcRenderer.invoke("open-quiz", quizNum),
  getResults: (playerName) => ipcRenderer.invoke("getResults", playerName),
  getLeaderboard: () => ipcRenderer.invoke("getLeaderboard")
});

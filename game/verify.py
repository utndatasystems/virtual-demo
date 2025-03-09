import sys
import os
import json

quizNum, functionInput, totalSeconds = sys.argv[1], sys.argv[2], sys.argv[3]
quizNum = int(quizNum)
totalSeconds = int(totalSeconds)
data = {}
status = False

if quizNum == 1:
    with open("tmp.json", "w") as file:
        pass  # Creates an empty file

else:
    with open("tmp.json", "r") as file:
        data = json.load(file)

# get answer from txt file
file_path = os.path.join(os.path.dirname(__file__), "answers", f"ans{quizNum}.txt")
with open(file_path, "r") as file:
	for line in file:
		answer = line.strip()
		# remove all spaces
		answer = answer.replace(" ", "")
		functionInput = functionInput.replace(" ", "")
		if answer == functionInput:
			status = True
			break

data[quizNum] = {
	"input": functionInput,
	"status": status,
	"time": totalSeconds
}

with open("tmp.json", "w") as file:
	json.dump(data, file, indent=4)

print(status)

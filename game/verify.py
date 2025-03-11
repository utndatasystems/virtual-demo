import sys
import os
import json
from sympy import symbols, simplify, Eq
import pandas as pd

def is_correct(df, equation):
    try:
        df["Correct"] = df.apply(lambda row: eval(equation, {}, row.to_dict()), axis=1)
        # print(df)

        all_correct = df["Correct"].all()
        if all_correct:
            return True
        else:
            return False
    except Exception as e:
        return False

# Read arguments from Electron
quizNum, functionInput, totalSeconds = sys.argv[1], sys.argv[2], sys.argv[3]
quizNum = int(quizNum)
totalSeconds = int(totalSeconds)

data = {}
status = False

if quizNum == 1:
    # Create an empty file for the first quiz
    with open("tmp.json", "w") as file:
        pass
else:
    # Load previous results
    with open("tmp.json", "r") as file:
        data = json.load(file)

csv_path = os.path.join(os.path.dirname(__file__), "quizs", f"quiz{quizNum}.csv")

df = pd.read_csv(csv_path)
status = is_correct(df, functionInput.replace("=", "=="))

data[quizNum] = {
    "input": functionInput,
    "status": status,
    "time": totalSeconds
}

with open("tmp.json", "w") as file:
    json.dump(data, file, indent=4)

# Print result (to be read by Electron)
print(status)

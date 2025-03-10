import sys
import os
import json
from sympy import symbols, simplify, Eq
import sympy

def is_correct(user_input, correct_equations):
    try:

        rhs1 = user_input.split('=')[1]  # "b*c"
        rhs2 = correct_equations.split('=')[1]  # "c*b"

        # Convert to Sympy expressions
        expr1 = sympy.sympify(rhs1)
        expr2 = sympy.sympify(rhs2)

        # Check if they are identically equal
        equivalent = sympy.simplify(expr1 - expr2) == 0
        if equivalent:  # Compare simplified forms
            return True  # Match found!

        return False  # No match found
    except Exception as e:
        print(e)
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

# Get answer file path
file_path = os.path.join(os.path.dirname(__file__), "answers", f"ans{quizNum}.txt")

# Read answers from file
with open(file_path, "r") as file:
    lines = file.readlines()

functionInput = functionInput.replace(" ", "")

# Check answers
for line in lines:  # Skip first line (variable names)
    answer = line.strip().replace(" ", "")  # Remove spaces
    if is_correct(functionInput, answer):
        status = True
        break

# Store results in tmp.json
data[quizNum] = {
    "input": functionInput,
    "status": status,
    "time": totalSeconds
}

with open("tmp.json", "w") as file:
    json.dump(data, file, indent=4)

# Print result (to be read by Electron)
print(status)

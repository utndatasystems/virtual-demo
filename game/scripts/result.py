import sys
import os
import json

LEADERBOARD_FILE = "leaderboard.json"
RESULTS_DIR = "../results"

def format_time(milliseconds):
    """Convert time from milliseconds to MM:SS.mm format."""
    total_seconds = milliseconds / 1000
    minutes = int(total_seconds // 60)
    seconds = int(total_seconds % 60)
    milliseconds = int((total_seconds % 1) * 100)
    return f"{minutes:02}:{seconds:02}.{milliseconds:02}"  # MM:SS.mm

def read_quiz_results(player_name, filename="tmp.json"):
    try:
        # Read JSON file
        with open(filename, "r") as file:
            data = json.load(file)

        # Convert to desired format
        formatted_results = {
            "name": player_name,
            "quizzes": []
        }

        total_correct = 0
        total_time = 0

        for quiz_num, details in data.items():
            formatted_results["quizzes"].append({
                "correct": details["status"],
                "timeSpent": format_time(details["time"])  # Convert to MM:SS.mm
            })

            if details["status"]:
                total_correct += 1
            total_time += details["time"]

        # Convert total time to MM:SS.mm format
        formatted_results["totalCorrect"] = total_correct
        formatted_results["totalTime"] = format_time(total_time)

        return formatted_results, total_correct, format_time(total_time)

    except Exception as e:
        return {"error": str(e)}, 0, "00:00.00"

def update_leaderboard(player_name, correct_answers, total_time):
    """Updates the leaderboard.json file."""
    leaderboard = []

    # Load existing leaderboard
    if os.path.exists(LEADERBOARD_FILE):
        with open(LEADERBOARD_FILE, "r") as file:
            try:
                leaderboard = json.load(file)
            except json.JSONDecodeError:
                leaderboard = []

    # Remove existing entry for this player (if exists)
    leaderboard = [entry for entry in leaderboard if entry["name"] != player_name]

    # Add new result
    leaderboard.append({
        "name": player_name,
        "correctAnswers": correct_answers,
        "totalTime": total_time
    })

    # Sort by correct answers (desc), then by total time (asc)
    leaderboard.sort(key=lambda x: (-x["correctAnswers"], x["totalTime"]))

    # Save updated leaderboard
    with open(LEADERBOARD_FILE, "w") as file:
        json.dump(leaderboard, file, indent=4)

player_name = sys.argv[1]
formatted_results, total_correct, total_time = read_quiz_results(player_name)

# Ensure results directory exists
if not os.path.exists(RESULTS_DIR):
    os.makedirs(RESULTS_DIR)

# Save individual player results
player_file = os.path.join(RESULTS_DIR, f"{player_name.replace(' ', '-')}.json")
with open(player_file, "w") as file:
    json.dump(formatted_results, file, indent=4)

# Remove temporary quiz results file
os.remove("tmp.json")

# Update leaderboard
update_leaderboard(player_name, total_correct, total_time)

# Print final formatted result (to send back to Electron)
print(json.dumps(formatted_results))

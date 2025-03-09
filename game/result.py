import sys
import os
import json

def format_time(milliseconds):
    """Convert time from milliseconds to MM:SS.ms format."""
    total_seconds = milliseconds / 1000
    minutes = int(total_seconds // 60)
    seconds = int(total_seconds % 60)
    milliseconds = int((total_seconds % 1) * 1000)
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

        for quiz_num, details in data.items():
            formatted_results["quizzes"].append({
                "correct": details["status"],
                "timeSpent": format_time(details["time"])  # Convert to MM:SS.mm
            })

        return formatted_results

    except Exception as e:
        return {"error": str(e)}

player_name = sys.argv[1]
result_data = read_quiz_results(player_name)

if not os.path.exists("results"):
    os.makedirs("results")

with open("tmp.json", "r") as file:
    data = json.load(file)

newData = {
    player_name: data
}

with open(f"{os.path.join("results", player_name.replace(" ", "-"))}.json", "w") as file:
    json.dump(newData, file, indent=4)

os.remove("tmp.json")

print(json.dumps(result_data))
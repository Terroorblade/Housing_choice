# from pymongo import MongoClient

# client = MongoClient("mongodb://localhost:27017/")
# # client = MongoClient("mongodb+srv://admin:5598v1234!@houschoice.eysbain.mongodb.net/?appName=Houschoice")

# db = client["vkr_apartments"]

# apartments_collection = db["apartments"]

# districts_collection = db["districts"]

# saved_surveys_collection = db["saved_surveys"]


from pymongo import MongoClient
import os
<<<<<<< HEAD

MONGO_URI = os.environ["MONGO_URI"]
=======
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

#локальный юри
# MONGO_URI = os.environ.get("MONGO_URI")

#юри глобал в атласе (для общего использования)
# MONGO_URI = os.environ["MONGO_URI"]

# юри локальный но в атласе
MONGO_URI = os.getenv('MONGO_URI')

if not MONGO_URI:
    raise RuntimeError("MONGO_URI environment variable is not set!")
>>>>>>> e632598 (конечный вариант (ver 1))

client = MongoClient(MONGO_URI)

db = client["vkr_apartments"]

apartments_collection = db["apartments"]
districts_collection = db["districts"]
<<<<<<< HEAD
saved_surveys_collection = db["saved_surveys"]
=======
saved_surveys_collection = db["saved_surveys"]
>>>>>>> e632598 (конечный вариант (ver 1))

# from pymongo import MongoClient

# client = MongoClient("mongodb://localhost:27017/")
# # client = MongoClient("mongodb+srv://admin:5598v1234!@houschoice.eysbain.mongodb.net/?appName=Houschoice")

# db = client["vkr_apartments"]

# apartments_collection = db["apartments"]

# districts_collection = db["districts"]

# saved_surveys_collection = db["saved_surveys"]


from pymongo import MongoClient
import os

MONGO_URI = os.environ["MONGO_URI"]

client = MongoClient(MONGO_URI)

db = client["vkr_apartments"]

apartments_collection = db["apartments"]
districts_collection = db["districts"]
saved_surveys_collection = db["saved_surveys"]

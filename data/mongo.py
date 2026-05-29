from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")

db = client["vkr_apartments"]

apartments_collection = db["apartments"]

districts_collection = db["districts"]

saved_surveys_collection = db["saved_surveys"]
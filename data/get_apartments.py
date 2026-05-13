from data.mongo import apartments_collection, districts_collection


def get_apartments_with_district_data():
    apartments = list(apartments_collection.find({}, {"_id": 0}))

    result = []

    for apartment in apartments:

        district_name = apartment["district"]

        district_data = districts_collection.find_one(
            {"district": district_name},
            {"_id": 0}
        )

        if district_data:

            apartment["ecology"] = district_data["ecology"]
            apartment["transport"] = district_data["transport"]
            apartment["sections"] = district_data["sections"]

        result.append(apartment)

    return result
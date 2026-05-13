from data.get_apartments import get_apartments_with_district_data


def get_filtered_apartments(filters):

    apartments = get_apartments_with_district_data()

    result = []

    for apt in apartments:

        # Максимальная цена
        if filters.max_price is not None:
            if float(apt["price_total"]) > float(filters.max_price):
                continue

        # Минимальная площадь
        if filters.min_area is not None and apt.get("area") is not None:
            if float(apt["area"]) < float(filters.min_area):
                continue

        # Комнаты
        if filters.rooms is not None:
            if apt["rooms"] != filters.rooms:
                continue

        # Тип жилья
        if filters.housing_type is not None:
            if apt["housing_type"] != filters.housing_type:
                continue

        # Район
        if filters.district:
            if apt["district"] != filters.district:
                continue

        # Лифт
        if filters.has_elevator is not None:
            if apt["has_elevator"] != filters.has_elevator:
                continue

        # Этажи
        if filters.floor_type:

            floor = apt.get("floor")
            total = apt.get("total_floors")

            # Первый этаж
            if filters.floor_type == "first":
                if floor != 1:
                    continue

            # Последний этаж
            elif filters.floor_type == "last":
                if floor != total:
                    continue

            # Не первый
            elif filters.floor_type == "not_first":
                if floor == 1:
                    continue

            # Не последний
            elif filters.floor_type == "not_last":
                if floor == total:
                    continue

            # Средние этажи
            elif filters.floor_type == "middle":
                if floor == 1 or floor == total:
                    continue

        result.append(apt)

    return result
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import numpy as np
from models.ahp import ahp as ahp_calc, consistency_ratio, find_most_inconsistent_triplet
from models.ftopsis import ftopsis
from models.electre import electre
from data.apartments import apartments
from fastapi.staticfiles import StaticFiles
from models.ahp import consistency_ratio
from pydantic import BaseModel
from data.criteria import criteria_names

from data.mongo import apartments_collection, saved_surveys_collection
from data.filters import get_filtered_apartments
from typing import Optional
from datetime import datetime
from fastapi.staticfiles import StaticFiles


class SaveSurveyRequest(BaseModel):
    method: str
    answers: dict
    filters: dict

# apartments = list(apartments_collection.find({}, {"_id": 0}))


templates = Jinja2Templates(directory="templates")

from typing import Optional

class ApartmentFilters(BaseModel):

    max_price: Optional[float] = None
    min_area: Optional[float] = None

    rooms: Optional[int] = None

    housing_type: Optional[int] = None

    # district: Optional[str] = None
    districts: Optional[list[str]] = None


    floor_type: Optional[str] = None

    has_elevator: Optional[bool] = None

class AHPRequest(BaseModel):
    matrix: list[list[float]]
    filters: Optional[ApartmentFilters] = ApartmentFilters()

# class AHPRequest(BaseModel):
#     matrix: list[list[float]]

class FTOPSISRequest(BaseModel):
    weights: list[float]
    filters: Optional[ApartmentFilters] = ApartmentFilters()
    
class ElectreRequest(BaseModel):
    weights: list[float]
    filters: Optional[ApartmentFilters] = ApartmentFilters()

app = FastAPI()
# app.mount("/static", StaticFiles(directory="templates"), name="static")
app.mount("/static", StaticFiles(directory="static"), name="static")



# @app.get("/", response_class=HTMLResponse)
# def home():
#     return """
#     <h1>Выбор метода</h1>
#     <a href="/ahp">AHP</a><br>
#     <a href="/ftopsis">FTOPSIS</a><br>
#     <a href="/electre">ELECTRE</a>
#     """

#фильтры
# def get_filtered_apartments(filters):

#     query = {}

#     # ЦЕНА
#     if filters.max_price:
#         query["price_total"] = {
#             "$lte": float(filters.max_price)
#         }

#     # ПЛОЩАДЬ
#     if filters.min_area:
#         query["area"] = {
#             "$gte": float(filters.min_area)
#         }

#     # КОМНАТЫ
#     if filters.rooms:
#         query["rooms"] = int(filters.rooms)

#     # ТИП ЖИЛЬЯ
#     if filters.housing_type is not None and filters.housing_type != "":
#         query["housing_type"] = int(filters.housing_type)

#     # РАЙОН
#     if filters.district:
#         query["district"] = filters.district

#     # ЛИФТ
#     if filters.has_elevator is not None:
#         query["has_elevator"] = filters.has_elevator

#     # ЭТАЖИ
#     apartments = list(
#         apartments_collection.find(query, {"_id": 0})
#     )

#     # фильтрация этажей
#     if filters.floor_type:

#         filtered = []

#         for apt in apartments:

#             floor = apt.get("floor")
#             total = apt.get("total_floors")

#             # только первый
#             if filters.floor_type == "first":
#                 if floor == 1:
#                     filtered.append(apt)

#             # только последний
#             elif filters.floor_type == "last":
#                 if floor == total:
#                     filtered.append(apt)

#             # не первый
#             elif filters.floor_type == "not_first":
#                 if floor != 1:
#                     filtered.append(apt)

#             # не последний
#             elif filters.floor_type == "not_last":
#                 if floor != total:
#                     filtered.append(apt)

#         apartments = filtered

#     return apartments



# @app.get("/", response_class=HTMLResponse)
# async def home(request: Request):
#     return templates.TemplateResponse(
#         name="home.html",
#         request=request,
#         context={}
#     )

#рабочая только с ahp
# @app.get("/", response_class=HTMLResponse)
# async def home(request: Request):

#     user_ip = request.client.host

#     ahp_surveys = list(
#         saved_surveys_collection.find(
#             {
#                 "method": "ahp",
#                 "user_id": user_ip
#             }
#         ).sort("created_at", -1)
#     )

#     for survey in ahp_surveys:
#         survey["_id"] = str(survey["_id"])

#     # return templates.TemplateResponse(
#     #     "home.html",
#     #     {
#     #         "request": request,
#     #         "ahp_surveys": ahp_surveys
#     #     }
#     # )
#     return templates.TemplateResponse(
#     name="home.html",
#     request=request,
#     context={
#         "ahp_surveys": ahp_surveys
#     }
# )


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    user_ip = request.client.host

    # Загружаем опросы для ВСЕХ методов
    ahp_surveys = list(
        saved_surveys_collection.find(
            {"method": "ahp", "user_id": user_ip}
        ).sort("created_at", -1)
    )
    ftopsis_surveys = list(
        saved_surveys_collection.find(
            {"method": "ftopsis", "user_id": user_ip}
        ).sort("created_at", -1)
    )
    electre_surveys = list(
        saved_surveys_collection.find(
            {"method": "electre", "user_id": user_ip}
        ).sort("created_at", -1)
    )

    # Конвертируем ObjectId в строку для шаблона
    for survey in ahp_surveys + ftopsis_surveys + electre_surveys:
        survey["_id"] = str(survey["_id"])

    return templates.TemplateResponse(
        name="home.html",
        request=request,
        context={
            "ahp_surveys": ahp_surveys,
            "ftopsis_surveys": ftopsis_surveys,
            "electre_surveys": electre_surveys
        }
    )

def to_fuzzy(value):
    return (value * 0.9, value, value * 1.1)

# либо иcпользоватьт фикс диапазон с ограничением справа слева границ 1 и 10
# def to_fuzzy(value, delta=1):
#     return (max(1, value - delta), value, min(10, value + delta))


#рабочий 1
# @app.get("/ahp", response_class=HTMLResponse)
# async def ahp_page(request: Request):
#     return templates.TemplateResponse(
#         name="index.html",
#         request=request,
#         context={}
#     )


# @app.get("/ahp", response_class=HTMLResponse)
# async def ahp_page(request: Request):
#     return templates.TemplateResponse(
#         "index.html",
#         {
#             "request": request
#         }
#     )

@app.get("/ahp", response_class=HTMLResponse)
async def ahp_page(request: Request):
    return templates.TemplateResponse(
        name="ahp.html",
        request=request,
        context={}
    )

#фция анализа влияния изменения значений на cr для уточнения
def suggest_best_values(A, i, k, scale_values=[1, 3, 5, 7, 9]):
    import numpy as np
    from models.ahp import ahp, consistency_ratio

    best_options = []
    current_weights, lambda_max = ahp(A)
    current_cr = consistency_ratio(A, lambda_max)

    for value in scale_values:
        A_test = A.copy()
        A_test[i, k] = value
        A_test[k, i] = 1 / value

        _, lambda_max_test = ahp(A_test)
        cr_test = consistency_ratio(A_test, lambda_max_test)

        if cr_test < current_cr:
            best_options.append({
                "value": value,
                "cr": cr_test
            })

    # Сортировка по наибольшему улучшению
    best_options.sort(key=lambda x: x["cr"])

    return best_options[:3]  # предлагаем пользователю 2–3 лучших варианта


#AHP С ФИЛЬТРАМИ
@app.post("/ahp")
def ahp_endpoint(data: AHPRequest):

    # =========================
    # ФИЛЬТРАЦИЯ КВАРТИР
    # =========================

    apartments = get_filtered_apartments(data.filters)

    # если ничего не найдено
    if len(apartments) == 0:
        return {
            "error": "Квартиры по заданным фильтрам не найдены"
        }

    # =========================
    # МАТРИЦА ПАРНЫХ СРАВНЕНИЙ
    # =========================

    A = np.array(data.matrix, dtype=float)

    # =========================
    # РАСЧЕТ ВЕСОВ AHP
    # =========================

    weights, lambda_max = ahp_calc(A)

    # =========================
    # КОЭФФИЦИЕНТ СОГЛАСОВАННОСТИ
    # =========================

    cr = consistency_ratio(A, lambda_max)

    # =========================
    # ФОРМИРОВАНИЕ МАТРИЦЫ КРИТЕРИЕВ
    # =========================

    matrix = []

    for apt in apartments:

        row = [
            apt["price_sqm"],           # Цена за м²
            apt["area"],                # Площадь
            apt["housing_type"],        # Тип жилья
            apt["dist_kindergarten"],   # Детский сад
            apt["dist_school"],         # Школа
            apt["dist_clinic_child"],   # Детская поликлиника
            apt["dist_clinic_adult"],   # Взрослая поликлиника
            apt["sections"],            # Кружки и секции
            apt["ecology"],             # Экология
            apt["transport"]            # Транспорт
        ]

        matrix.append(row)

    matrix = np.array(matrix, dtype=float)

    # =========================
    # ТИПЫ КРИТЕРИЕВ
    # =========================

    cost_indices = [0, 3, 4, 5, 6]
    benefit_indices = [1, 2, 7, 8, 9]

    # =========================
    # НОРМАЛИЗАЦИЯ
    # =========================

    norm_matrix = np.zeros_like(matrix, dtype=float)

    for i in range(matrix.shape[1]):

        if i in cost_indices:

            norm_matrix[:, i] = (
                np.min(matrix[:, i]) / matrix[:, i]
            )

        else:

            norm_matrix[:, i] = (
                matrix[:, i] / np.max(matrix[:, i])
            )

    # =========================
    # ИТОГОВЫЕ ОЦЕНКИ
    # =========================

    scores = norm_matrix @ weights

    ranking = np.argsort(scores)[::-1]

    # =========================
    # РЕЗУЛЬТАТ
    # =========================

    result = []

    for i in ranking:

        result.append({
            "name": apartments[i]["name"],
            "score": float(scores[i]),
            "address": apartments[i]["address"],
            "district": apartments[i]["district"],
            "price_sqm": apartments[i]["price_sqm"],
            "area": apartments[i]["area"],
            "rooms": apartments[i]["rooms"],
            "url": apartments[i]["url"]
        })

    # =========================
    # ОТВЕТ
    # =========================

    response = {
        "weights": weights.tolist(),
        "CR": float(cr),
        "ranking": result
    }

    # =========================
    # УТОЧНЕНИЕ ПРЕДПОЧТЕНИЙ
    # =========================

    if cr >= 0.15:

        i, j, k = find_most_inconsistent_triplet(A)

        suggestions = suggest_best_values(A, i, k)

        response["clarification"] = {
            "criterion1": criteria_names[i],
            "criterion2": criteria_names[k],
            "index_i": i,
            "index_k": k,
            "suggested_values": suggestions,
            "current_CR": cr
        }

    return response

# #------ рабочий вариант ahp без фильтра
# @app.post("/ahp")
# def ahp_endpoint(data: AHPRequest):
#     A = np.array(data.matrix, dtype=float)

#     # --- Расчёт весов ---
#     weights, lambda_max = ahp_calc(A)

#     # --- Расчёт коэффициента согласованности ---
#     cr = consistency_ratio(A, lambda_max)

#     # --- Формирование матрицы критериев квартир ---
#     matrix = []


#     for apt in apartments:
#         row = [
#             apt["price_sqm"],
#             apt["area"],
#             apt["housing_type"],
#             apt["dist_kindergarten"],
#             apt["dist_school"],
#             apt["dist_clinic_child"],
#             apt["dist_clinic_adult"],
#             apt["sections"],
#             apt["ecology"],
#             apt["transport"]
#         ]
#         matrix.append(row)

#     matrix = np.array(matrix, dtype=float)

#     # --- Индексы критериев ---
#     cost_indices = [0, 3, 4, 5, 6]      # меньше — лучше
#     benefit_indices = [1, 2, 7, 8, 9]   # больше — лучше

#     # --- Нормализация ---
#     norm_matrix = np.zeros_like(matrix, dtype=float)
#     for i in range(matrix.shape[1]):
#         if i in cost_indices:
#             norm_matrix[:, i] = np.min(matrix[:, i]) / matrix[:, i]
#         else:
#             norm_matrix[:, i] = matrix[:, i] / np.max(matrix[:, i])

#     # --- Итоговые оценки альтернатив ---
#     scores = norm_matrix @ weights
#     ranking = np.argsort(scores)[::-1]

#     result = []
#     for i in ranking:
#         result.append({
#             "name": apartments[i]["name"],
#             "score": float(scores[i]),
#             "address": apartments[i]["address"],
#             "url": apartments[i]["url"]
#         })

#     # --- Формирование ответа ---
#     response = {
#         "weights": weights.tolist(),
#         "CR": float(cr),
#         "ranking": result
#     }

#     # --- Добавление уточняющего вопроса ---
#     # if cr >= 0.1:
#     #     i, j, k = find_most_inconsistent_triplet(A)
#     #     response["clarification"] = {
#     #         "criterion1": criteria_names[i],
#     #         "criterion2": criteria_names[k],
#     #         "index_i": i,
#     #         "index_k": k
#     #     }

# #только весомые критерии сравниваем
#     if cr >= 0.15:
#         i, j, k = find_most_inconsistent_triplet(A)
#         suggestions = suggest_best_values(A, i, k)

#         response["clarification"] = {
#             "criterion1": criteria_names[i],
#             "criterion2": criteria_names[k],
#             "index_i": i,
#             "index_k": k,
#             "suggested_values": suggestions,
#             "current_CR": cr
#         }

#     return response


## НЕИСПОЛЬЗУЕМЫЙ АХП
# @app.post("/ahp")
# def ahp_endpoint(data: AHPRequest):
#     A = np.array(data.matrix)

#     # --- Расчёт весов ---
#     eigenvalues, eigenvectors = np.linalg.eig(A)
#     max_index = np.argmax(eigenvalues.real)
#     lambda_max = eigenvalues[max_index].real
#     weights = eigenvectors[:, max_index].real
#     weights = weights / np.sum(weights)

#     # --- Расчёт коэффициента согласованности ---
#     cr = consistency_ratio(A, lambda_max)

#     # --- Формирование матрицы критериев квартир ---
#     matrix = []
#     for apt in apartments:
#         row = [
#             apt["price_sqm"],
#             apt["area"],
#             apt["housing_type"],
#             apt["dist_kindergarten"],
#             apt["dist_school"],
#             apt["dist_clinic_child"],
#             apt["dist_clinic_adult"],
#             apt["sections"],
#             apt["ecology"],
#             apt["transport"]
#         ]
#         matrix.append(row)

#     matrix = np.array(matrix, dtype=float)

#     # --- Правильная нормализация ---
#     # Для критериев "затрат" (меньше — лучше)
#     cost_indices = [0, 3, 4, 5, 6]
#     # Для критериев "выгоды" (больше — лучше)
#     benefit_indices = [1, 2, 7, 8, 9]

#     norm_matrix = np.zeros_like(matrix, dtype=float)

#     for i in range(matrix.shape[1]):
#         if i in cost_indices:
#             norm_matrix[:, i] = np.min(matrix[:, i]) / matrix[:, i]
#         else:
#             norm_matrix[:, i] = matrix[:, i] / np.max(matrix[:, i])

#     # --- Итоговые оценки ---
#     scores = norm_matrix @ weights
#     ranking = np.argsort(scores)[::-1]

#     result = []
#     for i in ranking:
#         result.append({
#             "name": apartments[i]["name"],
#             "score": float(scores[i]),
#             "address": apartments[i]["address"],
#             "url": apartments[i]["url"]
#         })

#     return {
#         "weights": weights.tolist(),
#         "CR": float(cr),
#         "ranking": result
#     }

#рабочий 1
# @app.get("/ftopsis", response_class=HTMLResponse)
# async def ftopsis_page(request: Request):
#     return templates.TemplateResponse(
#         name="ftopsis.html",
#         request=request,
#         context={}
#     )

# @app.get("/ftopsis", response_class=HTMLResponse)
# async def ftopsis_page(request: Request):
#     return templates.TemplateResponse(
#         "ftopsis.html",
#         {
#             "request": request
#         }
#     )

@app.get("/ftopsis", response_class=HTMLResponse)
async def ftopsis_page(request: Request):
    return templates.TemplateResponse(
        name="ftopsis.html",
        request=request,
        context={}
    )

@app.post("/ftopsis")
def ftopsis_endpoint(data: FTOPSISRequest):
    
#с фильтрами квартиры
    apartments = get_filtered_apartments(data.filters)

    if len(apartments) == 0:
        return {
            "error": "Квартиры не найдены"
        }

    # Формирование нечеткой матрицы
    matrix = []
    for apt in apartments:
        row = [
            to_fuzzy(apt["price_sqm"]),
            to_fuzzy(apt["area"]),
            to_fuzzy(apt["housing_type"]),
            to_fuzzy(apt["dist_kindergarten"]),
            to_fuzzy(apt["dist_school"]),
            to_fuzzy(apt["dist_clinic_child"]),
            to_fuzzy(apt["dist_clinic_adult"]),
            to_fuzzy(apt["sections"]),
            to_fuzzy(apt["ecology"]),
            to_fuzzy(apt["transport"])
        ]
        matrix.append(row)

    # Типы критериев
    criteria_types = [
        "cost",      # Цена за м²
        "benefit",   # Площадь
        "benefit",   # Тип жилья
        "cost",      # Детский сад
        "cost",      # Школа
        "cost",      # Детская поликлиника
        "cost",      # Взрослая поликлиника
        "benefit",   # Кружки и секции
        "benefit",   # Экология
        "benefit"    # Транспорт
    ]

#шкала нечетких чисел для опроса
    fuzzy_scale = {
        1: (1, 1, 2),
        2: (1, 2, 3),
        3: (2, 3, 4),
        4: (3, 4, 5),
        5: (4, 5, 6),
        6: (5, 6, 7),
        7: (6, 7, 8),
        8: (7, 8, 9),
        9: (8, 9, 10),
        10: (9, 10, 10)
    }

    # Нормализация весов
    # weights = np.array(data.weights)
    
# среднее число из нечеткой оценки
#     weights = np.array([
#     fuzzy_scale[int(w)][1]
#     for w in data.weights
# ], dtype=float)

    weights = np.array([
        sum(fuzzy_scale[int(w)]) / 3
        for w in data.weights
    ], dtype=float)


    weights = weights / np.sum(weights)

    # Расчёт FTOPSIS
    scores = ftopsis(matrix, weights, criteria_types)

    # Сортировка альтернатив
    ranking_indices = np.argsort(scores)[::-1]

    result = []
    for i in ranking_indices:
        result.append({
            "name": apartments[i]["name"],
            "score": float(scores[i]),
            "address": apartments[i]["address"],
            "url": apartments[i]["url"]
        })

    return {
        "weights": weights.tolist(),
        "ranking": result
    }

#рабочий 1
# @app.get("/electre", response_class=HTMLResponse)
# async def electre_page(request: Request):
#     return templates.TemplateResponse(
#         name="electre.html",
#         request=request,
#         context={}
        

#     )

# @app.get("/electre", response_class=HTMLResponse)
# async def electre_page(request: Request):
#     return templates.TemplateResponse(
#         "electre.html",
#         {
#             "request": request
#         }
#     )

@app.get("/electre", response_class=HTMLResponse)
async def electre_page(request: Request):
    return templates.TemplateResponse(
        name="electre.html",
        request=request,
        context={}
    )


@app.post("/electre")
def electre_endpoint(data: ElectreRequest):

    # ===== 1. Фильтрация квартир =====

    apartments = get_filtered_apartments(data.filters)

    if len(apartments) == 0:
        return {
            "kernel": []
        }

    # ===== 2. Веса =====

    weights = np.array(data.weights, dtype=float)

    weights = weights / np.sum(weights)

    # ===== 3. Матрица критериев =====

    matrix = []

    for apt in apartments:

        row = [
            apt["price_sqm"],          # cost
            apt["area"],               # benefit
            apt["housing_type"],       # benefit
            apt["dist_kindergarten"],  # cost
            apt["dist_school"],        # cost
            apt["dist_clinic_child"],  # cost
            apt["dist_clinic_adult"],  # cost
            apt["sections"],           # benefit
            apt["ecology"],            # benefit
            apt["transport"]           # benefit
        ]

        matrix.append(row)

    # ===== 4. Типы критериев =====

    criteria_types = [
        "cost",
        "benefit",
        "benefit",
        "cost",
        "cost",
        "cost",
        "cost",
        "benefit",
        "benefit",
        "benefit"
    ]

    # ===== 5. ELECTRE =====

    kernel_indices, concordance, discordance = electre(
        matrix,
        weights,
        criteria_types,
        alpha=0.8,
        beta=0.2
    )

    # # ===== 6. Подсчёт score =====

    # scores = np.sum(concordance, axis=1)

    # ranking = sorted(
    #     [
    #         {
    #             "index": i,
    #             "score": float(scores[i])
    #         }
    #         for i in range(len(apartments))
    #     ],
    #     key=lambda x: x["score"],
    #     reverse=True
    # )

    # # ===== 7. Формирование результата =====

    # result = []

    # for item in ranking:

    #     i = item["index"]

    #     result.append({
    #         "name": apartments[i]["name"],
    #         "address": apartments[i]["address"],
    #         "url": apartments[i]["url"],
    #         "score": item["score"]
    #     })

    # return {
    #     "kernel": result
    # }

# 2 вариант без рейтинга ядро парето

    kernel_indices, concordance, discordance = electre(
    matrix,
    weights,
    criteria_types,
    alpha=0.8,
    beta=0.2
    )

    kernel = []

    for i in kernel_indices:

        kernel.append({
            "name": apartments[i]["name"],
            "address": apartments[i]["address"],
            "url": apartments[i]["url"]
        })

    return {
        "kernel": kernel
    }


# @app.post("/electre")
# def electre_endpoint(data: ElectreRequest):

# #с фильтрами квартиры
#     apartments = get_filtered_apartments(data.filters)

#     if len(apartments) == 0:
#         return {
#             "error": "Квартиры не найдены"
#         }


#     weights = np.array(data.weights, dtype=float)

#     # Нормализация весов
#     weights = weights / np.sum(weights)

#     # Формирование матрицы критериев
#     matrix = []
#     for apt in apartments:
#         row = [
#             apt["price_sqm"],           # cost
#             apt["area"],                # benefit
#             apt["housing_type"],        # benefit
#             apt["dist_kindergarten"],   # cost
#             apt["dist_school"],         # cost
#             apt["dist_clinic_child"],   # cost
#             apt["dist_clinic_adult"],   # cost
#             apt["sections"],            # benefit
#             apt["ecology"],             # benefit
#             apt["transport"]            # benefit
#         ]
#         matrix.append(row)

#     # Запуск метода ELECTRE
#     kernel, concordance, discordance = electre(matrix, weights)

#     result = []
#     for i in kernel:
#         result.append({
#             "name": apartments[i]["name"],
#             "address": apartments[i]["address"],
#             "url": apartments[i]["url"]
#         })

#     return {
#         "kernel": result,
#         "kernel_indices": kernel
#     }


#сохранение результатов опроса
@app.post("/save-survey")
async def save_survey(
    data: SaveSurveyRequest,
    request: Request
):

    user_ip = request.client.host

    survey = {
        "method": data.method,
        "answers": data.answers,
        "filters": data.filters,
        "user_id": user_ip,
        "created_at": datetime.now()
    }

    result = saved_surveys_collection.insert_one(survey)

    return {
        "success": True,
        "id": str(result.inserted_id)
    }

@app.get("/saved-surveys/{method}")
async def get_saved_surveys(
    method: str,
    request: Request
):

    user_ip = request.client.host

    surveys = list(
        saved_surveys_collection.find(
            {
                "method": method,
                "user_id": user_ip
            },
            {
                "answers": 0
            }
        ).sort("created_at", -1)
    )

    for s in surveys:
        s["_id"] = str(s["_id"])

    return surveys

@app.get("/survey/{survey_id}")
async def get_survey(survey_id: str):

    from bson import ObjectId

    survey = saved_surveys_collection.find_one(
        {"_id": ObjectId(survey_id)}
    )

    survey["_id"] = str(survey["_id"])

    return survey
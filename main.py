from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import numpy as np
from models.ahp import ahp as ahp_calc, consistency_ratio
from models.ftopsis import ftopsis
from models.electre import electre
from data.apartments import apartments
from fastapi.staticfiles import StaticFiles
from models.ahp import consistency_ratio
from pydantic import BaseModel


templates = Jinja2Templates(directory="templates")

class AHPRequest(BaseModel):
    matrix: list[list[float]]

class FTOPSISRequest(BaseModel):
    weights: list[float]

    
class ElectreRequest(BaseModel):
    weights: list[float]


app = FastAPI()
app.mount("/static", StaticFiles(directory="templates"), name="static")


# @app.get("/", response_class=HTMLResponse)
# def home():
#     return """
#     <h1>Выбор метода</h1>
#     <a href="/ahp">AHP</a><br>
#     <a href="/ftopsis">FTOPSIS</a><br>
#     <a href="/electre">ELECTRE</a>
#     """

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        name="home.html",
        request=request,
        context={}
    )


def to_fuzzy(value):
    return (value * 0.9, value, value * 1.1)

@app.get("/ahp", response_class=HTMLResponse)
async def ahp_page(request: Request):
    return templates.TemplateResponse(
        name="index.html",
        request=request,
        context={}
    )


@app.post("/ahp")
def ahp_endpoint(data: AHPRequest):
    A = np.array(data.matrix)

    # --- Расчёт весов ---
    eigenvalues, eigenvectors = np.linalg.eig(A)
    max_index = np.argmax(eigenvalues.real)
    lambda_max = eigenvalues[max_index].real
    weights = eigenvectors[:, max_index].real
    weights = weights / np.sum(weights)

    # --- Расчёт коэффициента согласованности ---
    cr = consistency_ratio(A, lambda_max)

    # --- Формирование матрицы критериев квартир ---
    matrix = []
    for apt in apartments:
        row = [
            apt["price_sqm"],
            apt["area"],
            apt["housing_type"],
            apt["dist_kindergarten"],
            apt["dist_school"],
            apt["dist_clinic_child"],
            apt["dist_clinic_adult"],
            apt["sections"],
            apt["ecology"],
            apt["transport"]
        ]
        matrix.append(row)

    matrix = np.array(matrix, dtype=float)

    # --- Правильная нормализация ---
    # Для критериев "затрат" (меньше — лучше)
    cost_indices = [0, 3, 4, 5, 6]
    # Для критериев "выгоды" (больше — лучше)
    benefit_indices = [1, 2, 7, 8, 9]

    norm_matrix = np.zeros_like(matrix, dtype=float)

    for i in range(matrix.shape[1]):
        if i in cost_indices:
            norm_matrix[:, i] = np.min(matrix[:, i]) / matrix[:, i]
        else:
            norm_matrix[:, i] = matrix[:, i] / np.max(matrix[:, i])

    # --- Итоговые оценки ---
    scores = norm_matrix @ weights
    ranking = np.argsort(scores)[::-1]

    result = []
    for i in ranking:
        result.append({
            "name": apartments[i]["name"],
            "score": float(scores[i]),
            "address": apartments[i]["address"],
            "url": apartments[i]["url"]
        })

    return {
        "weights": weights.tolist(),
        "CR": float(cr),
        "ranking": result
    }


@app.get("/ftopsis", response_class=HTMLResponse)
async def ftopsis_page(request: Request):
    return templates.TemplateResponse(
        name="ftopsis.html",
        request=request,
        context={}
    )

@app.post("/ftopsis")
def ftopsis_endpoint(data: FTOPSISRequest):

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

    # Нормализация весов
    weights = np.array(data.weights)
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

@app.get("/electre", response_class=HTMLResponse)
async def electre_page(request: Request):
    return templates.TemplateResponse(
        name="electre.html",
        request=request,
        context={}
        

    )

@app.post("/electre")
def electre_endpoint(data: ElectreRequest):
    weights = np.array(data.weights, dtype=float)

    # Нормализация весов
    weights = weights / np.sum(weights)

    # Формирование матрицы критериев
    matrix = []
    for apt in apartments:
        row = [
            apt["price_sqm"],           # cost
            apt["area"],                # benefit
            apt["housing_type"],        # benefit
            apt["dist_kindergarten"],   # cost
            apt["dist_school"],         # cost
            apt["dist_clinic_child"],   # cost
            apt["dist_clinic_adult"],   # cost
            apt["sections"],            # benefit
            apt["ecology"],             # benefit
            apt["transport"]            # benefit
        ]
        matrix.append(row)

    # Запуск метода ELECTRE
    kernel, concordance, discordance = electre(matrix, weights)

    result = []
    for i in kernel:
        result.append({
            "name": apartments[i]["name"],
            "address": apartments[i]["address"],
            "url": apartments[i]["url"]
        })

    return {
        "kernel": result,
        "kernel_indices": kernel
    }
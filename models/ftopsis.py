# import numpy as np

# def distance(a, b):
#     """Расстояние между двумя треугольными нечёткими числами"""
#     return np.sqrt((1/3) * (
#         (a[0] - b[0])**2 +
#         (a[1] - b[1])**2 +
#         (a[2] - b[2])**2
#     ))

# def normalize(matrix, criteria_types):
#     """Нормализация нечёткой матрицы решений"""
#     m, n = len(matrix), len(matrix[0])
#     result = []

#     for j in range(n):
#         col = [matrix[i][j] for i in range(m)]

#         if criteria_types[j] == "benefit":
#             # Для критериев выгоды: делим на максимум
#             max_u = max(x[2] for x in col)
#             if max_u == 0: max_u = 1e-10
#             norm_col = [(x[0]/max_u, x[1]/max_u, x[2]/max_u) for x in col]
#         else:
#             # Для критериев затрат: делим минимум на значение
#             min_l = min(x[0] for x in col)
#             if min_l == 0: min_l = 1e-10
#             norm_col = [(min_l/x[2], min_l/x[1], min_l/x[0]) for x in col]

#         for i in range(m):
#             if j == 0:
#                 result.append([])
#             result[i].append(norm_col[i])

#     return result

# def weighted_matrix(norm_matrix, weights):
#     """Применение весов к нормализованной матрице"""
#     result = []
#     for i in range(len(norm_matrix)):
#         row = []
#         for j in range(len(norm_matrix[0])):
#             w = weights[j]
#             a = norm_matrix[i][j]
#             row.append((a[0]*w, a[1]*w, a[2]*w))
#         result.append(row)
#     return result

# def ftopsis(matrix, weights, criteria_types):
#     """Расчёт методом нечёткого TOPSIS"""
#     norm = normalize(matrix, criteria_types)
#     weighted = weighted_matrix(norm, weights)

#     m, n = len(weighted), len(weighted[0])

#     # Идеальное и антиидеальное решения
#     A_plus = [(1, 1, 1)] * n   # лучшее значение
#     A_minus = [(0, 0, 0)] * n  # худшее значение

#     D_plus = []   # расстояния до идеала (чем меньше, тем лучше)
#     D_minus = []  # расстояния до антиидеала (чем больше, тем лучше)

#     for i in range(m):
#         d_p = sum(distance(weighted[i][j], A_plus[j]) for j in range(n))
#         d_m = sum(distance(weighted[i][j], A_minus[j]) for j in range(n))
#         D_plus.append(d_p)
#         D_minus.append(d_m)

#     # Коэффициент близости к идеалу: чем ближе к 1, тем лучше
#     CC = [D_minus[i] / (D_plus[i] + D_minus[i] + 1e-10) for i in range(m)]

#     # === ПРАВИЛЬНАЯ НОРМАЛИЗАЦИЯ К ДИАПАЗОНУ [0, 1] ===
#     # Лучшая квартира → 1.0 (100%), худшая → 0.0 (0%)
#     min_cc = min(CC)
#     max_cc = max(CC)
    
#     if max_cc - min_cc > 1e-10:
#         CC = [(cc - min_cc) / (max_cc - min_cc)  for cc in CC]
#     else:
#         # Если все значения одинаковы — все получают 100%
#         CC = [1.0] * len(CC)
    
#     return CC


#нечеткие числа
import numpy as np


def distance(a, b):
    """
    Расстояние между треугольными нечёткими числами
    по метрике vertex method
    """

    return np.sqrt(
        (
            (a[0] - b[0]) ** 2 +
            (a[1] - b[1]) ** 2 +
            (a[2] - b[2]) ** 2
        ) / 3
    )


def normalize(matrix, criteria_types):
    """
    Нормализация нечёткой матрицы
    """

    m = len(matrix)
    n = len(matrix[0])

    result = [[None] * n for _ in range(m)]

    for j in range(n):

        column = [matrix[i][j] for i in range(m)]

        # критерий выгоды
        if criteria_types[j] == "benefit":

            max_u = max(x[2] for x in column)

            for i in range(m):

                l, m_val, u = matrix[i][j]

                result[i][j] = (
                    l / max_u,
                    m_val / max_u,
                    u / max_u
                )

        # критерий затрат
        else:

            min_l = min(x[0] for x in column)

            for i in range(m):

                l, m_val, u = matrix[i][j]

                result[i][j] = (
                    min_l / u,
                    min_l / m_val,
                    min_l / l
                )

    return result


def weighted_matrix(norm_matrix, weights):
    """
    Взвешенная нечёткая матрица
    """

    result = []

    for row in norm_matrix:

        new_row = []

        for j, value in enumerate(row):

            w = weights[j]

            new_row.append((
                value[0] * w,
                value[1] * w,
                value[2] * w
            ))

        result.append(new_row)

    return result


def ftopsis(matrix, weights, criteria_types):

    # 1. Нормализация
    norm = normalize(matrix, criteria_types)

    # 2. Учет весов
    weighted = weighted_matrix(norm, weights)

    m = len(weighted)
    n = len(weighted[0])

    # 3. FPIS и FNIS
    A_plus = []
    A_minus = []

    for j in range(n):

        col = [weighted[i][j] for i in range(m)]

        A_plus.append((
            max(x[0] for x in col),
            max(x[1] for x in col),
            max(x[2] for x in col)
        ))

        A_minus.append((
            min(x[0] for x in col),
            min(x[1] for x in col),
            min(x[2] for x in col)
        ))

    # 4. Расстояния
    D_plus = []
    D_minus = []

    for i in range(m):

        d_p = 0
        d_m = 0

        for j in range(n):

            d_p += distance(weighted[i][j], A_plus[j])
            d_m += distance(weighted[i][j], A_minus[j])

        D_plus.append(d_p)
        D_minus.append(d_m)

    # 5. Коэффициент близости
    CC = []

    for i in range(m):

        value = D_minus[i] / (
            D_plus[i] + D_minus[i] + 1e-10
        )

        CC.append(value)

    return CC
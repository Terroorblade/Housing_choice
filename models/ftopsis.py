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